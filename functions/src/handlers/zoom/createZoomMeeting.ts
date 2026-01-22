import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";

const ZOOM_CLIENT_ID = defineSecret("ZOOM_CLIENT_ID");
const ZOOM_CLIENT_ID_SECRET = defineSecret("ZOOM_CLIENT_ID_SECRET");
const ZOOM_ACCOUNT_ID = defineSecret("ZOOM_ACCOUNT_ID");

interface ZoomMeetingRequest {
  topic: string;
  agenda?: string;
  start_time: string;
  duration: number;
  default_password?: string;
  request_permission_to_unmute_participants?: boolean;
  invitees?: { email: string }[];
  host_email: string;
}

interface ZoomMeetingSettings {
  host_video?: boolean;
  participant_video?: boolean;
  join_before_host?: boolean;
  mute_upon_entry?: boolean;
  watermark?: boolean;
  use_pmi?: boolean;
  approval_type?: number;
  audio?: string;
  auto_recording?: string;
  waiting_room?: boolean;
  request_permission_to_unmute_participants?: boolean;
  meeting_invitees?: { email: string }[];
}

interface ZoomCreateMeetingPayload {
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone?: string;
  password?: string;
  agenda?: string;
  settings: ZoomMeetingSettings;
}

async function getZoomAccessToken(
  clientId: string,
  clientSecret: string,
  accountId: string
): Promise<string> {
  const credentials = `${clientId}:${clientSecret}`;
  const base64Credentials = Buffer.from(credentials).toString("base64");

  const tokenResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${base64Credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Zoom OAuth failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function getZoomUserId(accessToken: string, email: string): Promise<string> {
  // First try to get user by email
  const userResponse = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(email)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (userResponse.ok) {
    const userData = await userResponse.json();
    return userData.id;
  }

  // If user not found by email, use "me" (the account owner)
  console.warn(`User with email ${email} not found, using default user`);
  const meResponse = await fetch("https://api.zoom.us/v2/users/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!meResponse.ok) {
    const errorText = await meResponse.text();
    throw new Error(`Failed to get Zoom user: ${errorText}`);
  }

  const meData = await meResponse.json();
  return meData.id;
}

async function createMeeting(
  accessToken: string,
  userId: string,
  meetingData: ZoomMeetingRequest
): Promise<any> {
  const meetingPayload: ZoomCreateMeetingPayload = {
    topic: meetingData.topic,
    type: 2, // Scheduled meeting
    start_time: meetingData.start_time,
    duration: meetingData.duration,
    timezone: "UTC",
    agenda: meetingData.agenda || "",
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      watermark: false,
      use_pmi: false,
      approval_type: 0, // Automatically approve
      audio: "both", // Both telephony and VoIP
      auto_recording: "none",
      waiting_room: true,
      request_permission_to_unmute_participants:
        meetingData.request_permission_to_unmute_participants || false,
    },
  };

  // Add password if provided
  if (meetingData.default_password) {
    meetingPayload.password = meetingData.default_password;
  }

  // Add invitees if provided
  if (meetingData.invitees && meetingData.invitees.length > 0) {
    meetingPayload.settings.meeting_invitees = meetingData.invitees;
  }

  const createResponse = await fetch(`https://api.zoom.us/v2/users/${userId}/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(meetingPayload),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create Zoom meeting: ${errorText}`);
  }

  const meetingResponse = await createResponse.json();
  return meetingResponse;
}

async function CreateZoomMeetingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Validate request body
    const {
      topic,
      agenda,
      start_time,
      duration,
      default_password,
      request_permission_to_unmute_participants,
      invitees,
      host_email,
    } = req.body as ZoomMeetingRequest;

    // Validation
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      res.status(400).json({ error: "Meeting topic is required" });
      return;
    }

    if (topic.length > 200) {
      res.status(400).json({ error: "Topic must be 200 characters or less" });
      return;
    }

    if (!start_time) {
      res.status(400).json({ error: "Start time is required" });
      return;
    }

    if (!duration || duration <= 0) {
      res.status(400).json({ error: "Duration must be greater than 0" });
      return;
    }

    if (!host_email) {
      res.status(400).json({ error: "Host email is required" });
      return;
    }

    // Get secrets
    const clientId = ZOOM_CLIENT_ID.value();
    const clientSecret = ZOOM_CLIENT_ID_SECRET.value();
    const accountId = ZOOM_ACCOUNT_ID.value();

    // Step 1: Get access token
    console.log("🔐 Getting Zoom access token...");
    const accessToken = await getZoomAccessToken(clientId, clientSecret, accountId);
    console.log("✅ Access token obtained");

    // Step 2: Get user ID for the host
    console.log(`👤 Getting Zoom user ID for host: ${host_email}`);
    const userId = await getZoomUserId(accessToken, host_email);
    console.log(`✅ User ID obtained: ${userId}`);

    // Step 3: Create the meeting
    console.log("📅 Creating Zoom meeting...");
    const meetingData: ZoomMeetingRequest = {
      topic: topic.trim(),
      agenda: agenda?.trim(),
      start_time,
      duration,
      default_password,
      request_permission_to_unmute_participants,
      invitees,
      host_email,
    };

    const meeting = await createMeeting(accessToken, userId, meetingData);
    console.log(`✅ Meeting created successfully: ${meeting.id}`);

    // Return meeting details
    res.status(200).json({
      success: true,
      data: {
        id: meeting.id,
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration: meeting.duration,
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password,
        encrypted_password: meeting.encrypted_password,
        host_id: meeting.host_id,
        host_email: meeting.host_email,
        timezone: meeting.timezone,
        created_at: meeting.created_at,
        agenda: meeting.agenda,
      },
    });
  } catch (error: any) {
    console.error("❌ Create Zoom meeting failed:", error);
    res.status(500).json({ error: "Internal error", details: error.message });
  }
}

export const createZoomMeeting = onRequest(
  {
    region: "us-central1",
    secrets: [ZOOM_CLIENT_ID, ZOOM_CLIENT_ID_SECRET, ZOOM_ACCOUNT_ID],
  },
  withMiddleware(corsMiddleware, authMiddleware, CreateZoomMeetingHandler)
);

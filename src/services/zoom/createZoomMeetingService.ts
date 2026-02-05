import { BACKEND_URL } from "@/config";

interface ZoomMeetingRequest {
  topic: string;
  agenda: string;
  start_time: string;
  duration: number;
  default_password: string;
  join_before_host: boolean;
  request_permission_to_unmute_participants: boolean;
  invitees: { email: string }[];
  host_email: string;
}

interface ZoomMeetingResponseData {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  start_url: string;
  password: string;
  encrypted_password: string;
  host_id: string;
  host_email: string;
  timezone: string;
  created_at: string;
  agenda: string;
}

interface ZoomMeetingResponse {
  success: boolean;
  data: ZoomMeetingResponseData;
}

class CreateZoomMeetingService {
  async createZoomMeet(
    zoomMeeting: ZoomMeetingRequest,
    idToken: string
  ): Promise<ZoomMeetingResponse> {
    try {
      if (!idToken) {
        console.error("[CreateZoomMeeting] Missing ID token");
        throw new Error("ID token is required");
      }

      const response = await fetch(`${BACKEND_URL}/createZoomMeeting`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(zoomMeeting),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[CreateZoomMeeting] Request failed (${response.status})`, errorData);
        throw new Error(errorData.details || errorData.error || "Failed to create Zoom meeting");
      }

      const data: ZoomMeetingResponse = await response.json();
      return data;
    } catch (error) {
      console.error("[CreateZoomMeeting] Error:", error);
      throw error;
    }
  }
}

export const createZoomMeetingService = new CreateZoomMeetingService();

export type { ZoomMeetingRequest, ZoomMeetingResponse, ZoomMeetingResponseData };

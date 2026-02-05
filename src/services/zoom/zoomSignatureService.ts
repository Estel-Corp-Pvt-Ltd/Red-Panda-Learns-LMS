import { BACKEND_URL } from "@/config";
import { authService } from "@/services/authService";

interface ZoomSignatureResponse {
  signature: string;
  sdkKey: string;
}

class ZoomSignatureService {
  async getSignature(meetingId: string, userId: string): Promise<ZoomSignatureResponse> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error("Authentication token is required");
    }

    if (!meetingId) {
      throw new Error("Meeting ID is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log("[ZoomSignatureService] Getting signature for meeting:", meetingId);

    const res = await fetch(`${BACKEND_URL}/generateZoomMeetingSignature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        meetingNumber: meetingId,
        userId,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error(`[ZoomSignatureService] Request failed (${res.status})`, errorData);
      throw new Error(errorData.message || `Failed to get Zoom signature: ${res.status}`);
    }

    const data = await res.json();
    console.log("[ZoomSignatureService] Signature fetched successfully");

    return {
      signature: data.signature,
      sdkKey: data.sdkKey,
    };
  }
}

export const zoomSignatureService = new ZoomSignatureService();

export type { ZoomSignatureResponse };

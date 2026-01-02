import { BACKEND_URL } from "@/config";
export const pushNotificationService = {
  async sendGradedNotification(
    submissionId: string,
    numericMarks: number,
    assignmentTitle: string,
    idToken: string
  ): Promise<void> {
    try {
      if (!idToken) {
        console.error("[PushNotification] Missing ID token");
        throw new Error("ID token is required");
      }

      const response = await fetch(`${BACKEND_URL}/sendSubmissionGradedNotification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          submissionId,
          title: "Assignment Graded",
          body: "Your submission has been graded successfully.",
          marks: numericMarks,
          assignmentTitle : assignmentTitle,
        }),
      });

      if (!response.ok) {
        throw new Error(`Notification request failed (${response.status}):`);
      }
    } catch (error) {
      console.error("[PushNotification] Error sending notification:", error);
      throw error;
    }
  },
};

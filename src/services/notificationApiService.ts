// src/services/notificationApiService.ts
import { BACKEND_URL } from "@/config";

export const notificationApiService = {
  async createNotification(
    data: {
      submissionId: string;
      assignmentId: string;
      studentId: string;
    },
    idToken: string
  ) {
    try {
      const response = await fetch(`${BACKEND_URL}/createNotification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create notification");
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  },
};

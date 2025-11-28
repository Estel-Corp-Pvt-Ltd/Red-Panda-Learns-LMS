// src/services/notificationApiService.ts
import { ENVIRONMENT } from "@/constants";

const backendUrl = import.meta.env.VITE_APP_ENVIRONMENT === ENVIRONMENT.DEVELOPMENT
  ? import.meta.env.VITE_DEV_BACKEND_URL
  : import.meta.env.VITE_PROD_BACKEND_URL;


export const notificationApiService = {
  async createNotification(data: {
    submissionId: string;
    assignmentId: string;
    studentId: string;
  }, idToken: string) {
    try {
      const response = await fetch(`${backendUrl}/createNotification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },
};

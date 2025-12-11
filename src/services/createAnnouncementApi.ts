
import { BACKEND_URL } from "@/config";
import { Course } from "@/types/course";


export const createAnnouncementApi = {
  async createGlobalAnnouncement(
    data: {
      title: string;
      body: string;
    },
    idToken: string
  ) {
    try {
      const response = await fetch(`${BACKEND_URL}/createGlobalAnnouncement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create announcement");
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating announcement:", error);
      throw error;
    }
  },


    async createCourseManualAnnouncement(
        data: {
        title: string;
        body: string;
        courseId:string;
        },
        idToken: string
    ) {
    try {
      const response = await fetch(`${BACKEND_URL}/createCourseManualAnnouncement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create announcement");
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating announcement:", error);
      throw error;
    }
  },
};

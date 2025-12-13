import { BACKEND_URL } from "@/config";

export const createAnnouncementApi = {

  async createGlobalAnnouncement(
    data: { title: string; body: string },
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
      throw error;
    }
  },

  async createCourseManualAnnouncement(
    data: { title: string; body: string; courseId: string },
    idToken: string
  ) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/createCourseManualAnnouncement`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create announcement");
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  async updateAnnouncement(
    announcementId: string,
    data: { title?: string; body?: string },
    idToken: string
  ) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/updateAnnouncement?announcementId=${announcementId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update announcement");
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  async deleteAnnouncement(announcementId: string, idToken: string) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/deleteAnnouncement?announcementId=${announcementId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete announcement");
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  async sendAnnouncementMail(
    data: { announcementId: string },
    idToken: string
  ) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/sendAnnouncementEmailonRequest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send mail");
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};

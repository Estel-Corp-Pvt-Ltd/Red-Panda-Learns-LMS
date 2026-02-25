// import { BACKEND_URL } from "@/config";

export const createAnnouncementApi = {
  // async createGlobalAnnouncement(
  //   data: { title: string; body: string },
  //   idToken: string
  // ) {
  //   const response = await fetch(`${BACKEND_URL}/createGlobalAnnouncement`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${idToken}`,
  //     },
  //     body: JSON.stringify(data),
  //   });
  //
  //   if (!response.ok) {
  //     const errorData = await response.json();
  //     throw new Error(errorData.error || "Failed to create announcement");
  //   }
  //
  //   return response.json();
  // },

  // async createCourseManualAnnouncement(
  //   data: { title: string; body: string; courseId: string },
  //   idToken: string
  // ) {
  //   const response = await fetch(
  //     `${BACKEND_URL}/createCourseManualAnnouncement`,
  //     {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //       body: JSON.stringify(data),
  //     }
  //   );
  //
  //   if (!response.ok) {
  //     const errorData = await response.json();
  //     throw new Error(errorData.error || "Failed to create announcement");
  //   }
  //
  //   return response.json();
  // },

  // async updateAnnouncement(
  //   announcementId: string,
  //   data: { title?: string; body?: string },
  //   idToken: string
  // ) {
  //   const response = await fetch(
  //     `${BACKEND_URL}/updateAnnouncement?announcementId=${announcementId}`,
  //     {
  //       method: "PUT",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //       body: JSON.stringify(data),
  //     }
  //   );
  //
  //   if (!response.ok) {
  //     const errorData = await response.json();
  //     throw new Error(errorData.error || "Failed to update announcement");
  //   }
  //
  //   return response.json();
  // },

  // async deleteAnnouncement(announcementId: string, idToken: string) {
  //   const response = await fetch(
  //     `${BACKEND_URL}/deleteAnnouncement?announcementId=${announcementId}`,
  //     {
  //       method: "DELETE",
  //       headers: {
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //     }
  //   );
  //
  //   if (!response.ok) {
  //     const errorData = await response.json();
  //     throw new Error(errorData.error || "Failed to delete announcement");
  //   }
  //
  //   return response.json();
  // },

  // async sendAnnouncementMail(
  //   data: { announcementId: string },
  //   idToken: string
  // ) {
  //   const response = await fetch(
  //     `${BACKEND_URL}/sendAnnouncementEmailonRequest`,
  //     {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //       body: JSON.stringify(data),
  //     }
  //   );
  //
  //   if (!response.ok) {
  //     const errorData = await response.json();
  //     throw new Error(errorData.error || "Failed to send mail");
  //   }
  //
  //   return response.json();
  // },
};

// src/services/notificationApiService.ts
// import { BACKEND_URL } from "@/config";

export const pauseReminderService = {
  // async pauseReminder(
  //   data: {
  //     assignmentIds: string[];
  //   },
  //   idToken: string
  // ) {
  //   try {
  //     const response = await fetch(
  //       `${BACKEND_URL}/pauseReminderForAssignments`,
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${idToken}`,
  //         },
  //         body: JSON.stringify(data),
  //       }
  //     );
  //
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       console.error("Error response from server:", errorData);
  //       throw new Error(errorData.error || "Failed to pause Reminders");
  //     }
  //
  //     const result = await response.json();
  //
  //     return result;
  //   } catch (error) {
  //     console.error("Error pausing Reminders:", error);
  //     throw error;
  //   }
  // },

  // async unpauseReminder(
  //   data: {
  //     assignmentIds: string[];
  //   },
  //   idToken: string
  // ) {
  //   try {
  //     const response = await fetch(
  //       `${BACKEND_URL}/unpauseReminderForAssignments`,
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${idToken}`,
  //         },
  //         body: JSON.stringify(data),
  //       }
  //     );
  //
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || "Failed to unpause reminders");
  //     }
  //
  //     return await response.json();
  //   } catch (error) {
  //     console.error("Error :", error);
  //     throw error;
  //   }
  // },
};

// src/services/notificationApiService.ts
// import { BACKEND_URL } from "@/config";

export const markSubmissionEvaluatedService = {
  // async mark(submissionId: string, idToken: string) {
  //   try {
  //     const response = await fetch(
  //       `${BACKEND_URL}/markSubmissionNotificationsEvaluated`,
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${idToken}`,
  //         },
  //         body: JSON.stringify({ submissionId }),
  //       }
  //     );
  //
  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({}));
  //       throw new Error(
  //         errorData.error ||
  //           "Failed to call cloud function: markSubmissionNotificationsEvaluated"
  //       );
  //     }
  //
  //     return await response.json();
  //   } catch (error) {
  //     console.error("Error calling markSubmissionNotificationsEvaluated:", error);
  //     throw error;
  //   }
  // },
};

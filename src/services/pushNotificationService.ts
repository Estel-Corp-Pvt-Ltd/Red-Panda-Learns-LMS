// import { BACKEND_URL } from "@/config";
export const pushNotificationService = {
  // async sendGradedNotification(
  //   submissionId: string,
  //   numericMarks: number,
  //   assignmentTitle: string,
  //   idToken: string,
  //   isReevaluated: boolean,
  //   maximumMarks : number,
  //   minimumMarks : number,
  //   courseId:string,
  // ): Promise<void> {
  //   try {
  //     if (!idToken) {
  //       console.error("[PushNotification] Missing ID token");
  //       throw new Error("ID token is required");
  //     }
  //
  //     const title = isReevaluated ? "Assignment Re-evaluated" : "Assignment Graded";
  //
  //     const body = isReevaluated
  //       ? "Your submission has been re-evaluated. Check your updated marks!"
  //       : "Your submission has been graded successfully.";
  //
  //     const response = await fetch(`${BACKEND_URL}/sendSubmissionGradedNotification`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //       body: JSON.stringify({
  //         submissionId,
  //         title,
  //         body,
  //         marks: numericMarks,
  //         assignmentTitle: assignmentTitle,
  //         isReevaluated: isReevaluated,
  //         maximumMarks : maximumMarks,
  //         minimumMarks:minimumMarks,
  //         courseId : courseId,
  //       }),
  //     });
  //
  //     if (!response.ok) {
  //       console.error(`[PushNotification] Notification request failed (${response.status})`);
  //     }
  //   } catch (error) {
  //     console.error("[PushNotification] Error sending notification:", error);
  //   }
  // },
};

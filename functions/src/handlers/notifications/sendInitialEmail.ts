import { notificationService } from "../../services/notificationService";
import { onDocumentCreated } from "firebase-functions/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTION, NOTIFICATION_STATUS } from "../../constants";
import { SubmissionNotification } from "../../types/notifications";
import { reminderService } from "../../services/reminderService";

const db = getFirestore();

export const sendInitialNotification = onDocumentCreated(
  `${COLLECTION.SUBMISSION_NOTIFICATION}/{id}`,
  async (event) => {
    const id = event.params.id;
    console.log("🟢 New notification created:", id);

    try {
      const docRef = db
        .collection(COLLECTION.SUBMISSION_NOTIFICATION)
        .doc(id);

      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        console.warn("⚠️ Notification document not found:", id);
        return;
      }

      const data = docSnap.data() as SubmissionNotification;
      const adminId = data.adminId;
      const assignmentId = data.assignmentId;

      // Check which admins have paused reminders for this assignment
      const pausedAdminsResult = await reminderService.checkIsReminderPausedForAssignmentforThisAdmin(assignmentId);

      if (!pausedAdminsResult.success) {
        console.error(
          `❌ Failed to check pause status for assignment ${assignmentId}:`,
          pausedAdminsResult.error
        );
   
        return;
      }

      // Get the array of paused admin IDs
      const pausedAdminIds: string[] = pausedAdminsResult.data ?? [];

      // Check if THIS specific admin has paused reminders
      const isThisAdminPaused = pausedAdminIds.includes(adminId);

      // ✅ Do NOT send email if THIS admin has paused
      if (isThisAdminPaused) {
        console.log(
          `⏸️ Admin ${adminId} has paused notifications. Skipping initial email for: ${id}`
        );
        return;
      }

      // Double-check the document's own status (in case it was created with paused state)
      const reminderPaused = data.reminderPaused;
      const status = data.status;

      if (
        reminderPaused === true &&
        status === NOTIFICATION_STATUS.PAUSED
      ) {
        console.log(
          `⏸️ Notification is paused in document. Skipping initial email for: ${id}`
        );
        return;
      }

      // 📧 Send email if this admin has not paused
      const result = await notificationService.sendInitialEmail(id, true);

      if (result.success) {
        console.log(`📧 Email sent successfully for admin ${adminId}:`, id);
      } else {
        console.error(`❌ Failed to send email for ${id}:`, result.error);
      }
    } catch (err) {
      console.error("❌ Exception while sending email:", err);
    }
  }
);
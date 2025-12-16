import { notificationService } from "../../services/notificationService";
import { onDocumentCreated } from "firebase-functions/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTION, NOTIFICATION_STATUS } from "../../constants";

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

      const reminderPaused = docSnap.get("reminderPaused");
      const status = docSnap.get("status");

      // ✅ Do NOT send email if paused
      if (
        reminderPaused === true &&
        status === NOTIFICATION_STATUS.PAUSED
      ) {
        console.log(
          `⏸️ Notification is paused. Skipping initial email for: ${id}`
        );
        return;
      }

      // 📧 Send email if not paused
      const result = await notificationService.sendInitialEmail(id, true);

      if (result.success) {
        console.log("📧 Email sent successfully for:", id);
      } else {
        console.error(`❌ Failed to send email for ${id}:`, result.error);
      }
    } catch (err) {
      console.error("❌ Exception while sending email:", err);
    }
  }
);

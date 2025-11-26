import { onSchedule } from "firebase-functions/v2/scheduler";
import { COLLECTION } from "../../constants";
import * as admin from "firebase-admin";
import { NOTIFICATION_STATUS } from "../../constants";

// Runs every 1 hour
export const reminderScheduler = onSchedule("every 1 hours", async () => {
  const db = admin.firestore();

  // cutoff timestamp = 24 * 4  hours ago
  // Any notification older than this should receive a reminder
  const cutoff = Date.now() - 24 * 4 * 60 * 60 * 1000;

  // Fetch all notifications where:
  // 1. First email was already sent (NOTIFIED)
  // 2. Reminders are not paused
  const snapshot = await db
    .collection(COLLECTION.SUBMISSION_NOTIFICATIONS)
    .where("status", "==", NOTIFICATION_STATUS.NOTIFIED)
    .where("reminderPaused", "==", false)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Ensure emailSentAt exists and is older than 24 * 4  (4 Days)hours (cutoff)
    if (data.emailSentAt?.toMillis() < cutoff) {
      console.log("Sending reminder to:", data.adminEmail);

      // Update notification to mark reminder as sent
      await doc.ref.update({
        status: NOTIFICATION_STATUS.REMINDER_SENT,
        reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
});

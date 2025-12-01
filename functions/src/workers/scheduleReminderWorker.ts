import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { COLLECTION, NOTIFICATION_STATUS } from "../constants";
import { notificationService } from "../services/notificationService";
// import e from "cors";
// import { email } from "zod";


// Runs every 12 hour
export const reminderWorker = onSchedule("every 12 hours", async () => {
  const db = admin.firestore();
  const cutoff = Date.now() -  4 * 24 * 60 * 60 * 1000;  

  const snapshot = await db
    .collection(COLLECTION.SUBMISSION_NOTIFICATIONS)
    .where("status", "==", NOTIFICATION_STATUS.REMINDER_SCHEDULED)
    .where("reminderPaused", "==", false)
    .where("emailSentAt", "<", admin.firestore.Timestamp.fromMillis(cutoff))
    .get();

  if (snapshot.empty) {
    console.log("No reminders due at this hour.");
    return;
  }

  console.log(`Found ${snapshot.docs.length} reminders due.`);

  let batch = db.batch();
  let batchCounter = 0;

  for (const doc of snapshot.docs) {
    try {
      // Try sending email
      const result = await notificationService.sendInitialEmail(doc.id,false);

      // Only add to batch if mail was sent successfully
      if (result?.success) {
        batch.update(doc.ref, {
          reminderScheduledAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() +  2 * 60 * 60 * 1000)
          ),
          emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batchCounter++;
      }

      // Commit every 500 updates
      if (batchCounter === 500) {
        await batch.commit();
        batch = db.batch();
        batchCounter = 0;
      }
    } catch (err) {
      // Email sending failed —> skip batch update for this doc
      console.error(`❌ Failed to send reminder for doc ${doc.id}:`, err);
    }
  }

  if (batchCounter > 0) {
    await batch.commit();
  }

  console.log("Reminder worker finished.");
});


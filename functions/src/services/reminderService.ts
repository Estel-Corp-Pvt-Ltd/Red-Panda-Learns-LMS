import * as admin from "firebase-admin";
import { SubmissionNotification } from "../types/notifications";
import { COLLECTION, NOTIFICATION_STATUS } from "../constants";

import { ok, Result } from "../utils/response";

const db = admin.firestore();
const notificationsRef = db.collection(COLLECTION.SUBMISSION_NOTIFICATION);

export const reminderService = {
  async pauseReminder(id: string) {
    try {
      await notificationsRef.doc(id).update({
        status: NOTIFICATION_STATUS.PAUSED,
        reminderPaused: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error(`Error pausing reminder for notification ${id}:`, error);
      throw error;
    }
  },

  async pauseRemindersForAssignments(
    assignmentIds: string[]
  ): Promise<Result<SubmissionNotification[]>> {
    try {
      if (!assignmentIds.length) return ok([]);

      const updatedNotifications: SubmissionNotification[] = [];

      // Firestore 'in' query supports max 10 items
      const chunkSize = 10;
      for (let i = 0; i < assignmentIds.length; i += chunkSize) {
        const chunk = assignmentIds.slice(i, i + chunkSize);

        const snapshot = await db
          .collection(COLLECTION.SUBMISSION_NOTIFICATION)
          .where("assignmentId", "in", chunk)
          .where("reminderPaused", "==", false)
          .where("status", "==", NOTIFICATION_STATUS.REMINDER_SCHEDULED)
          .get();

        if (snapshot.empty) continue;

        const batch = db.batch();

        snapshot.docs.forEach((doc) => {
          const data = doc.data() as SubmissionNotification;

          batch.update(doc.ref, {
            reminderPaused: true,
            status: NOTIFICATION_STATUS.PAUSED,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          updatedNotifications.push({
            ...data,
            reminderPaused: true,
            status: NOTIFICATION_STATUS.PAUSED,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
          });
        });

        // Commit batch
        await batch.commit();
      }

      return ok(updatedNotifications);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const stack = error instanceof Error ? error.stack : undefined;
      return {
        success: false,
        error: { message, stack },
      };
    }
  },

async checkIsReminderPausedForAssignment(
  assignmentId: string
): Promise<Result<boolean>> {
  try {
    const snapshot = await db
      .collection(COLLECTION.SUBMISSION_NOTIFICATION)
      .where("assignmentId", "==", assignmentId)
      .where("reminderPaused", "==", true)
      .where("status", "==", NOTIFICATION_STATUS.PAUSED)
      .get();

    return ok(!snapshot.empty);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    return {
      success: false,
      error: { message, stack },
    };
  }
}
};

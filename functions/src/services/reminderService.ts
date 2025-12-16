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

    if (!assignmentIds.length) {
      return ok([]);
    }

    const updatedNotifications: SubmissionNotification[] = [];
    const chunkSize = 10;

    for (let i = 0; i < assignmentIds.length; i += chunkSize) {
      const chunk = assignmentIds.slice(i, i + chunkSize);

      const snapshot = await db
        .collection(COLLECTION.SUBMISSION_NOTIFICATION)
        .where("assignmentId", "in", chunk)
        .where("reminderPaused", "==", false)
        .where("status", "==", NOTIFICATION_STATUS.REMINDER_SCHEDULED)
        .get();


      if (snapshot.empty) {
        console.log("No notifications to update in this chunk");
        continue;
      }

      const batch = db.batch();

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as SubmissionNotification;
        console.log("Updating notification:", doc.id, data);

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

      console.log("Committing batch for this chunk");
      await batch.commit();
      console.log("Batch committed successfully");
    }

    console.log("All chunks processed, total updated notifications:", updatedNotifications.length);
    return ok(updatedNotifications);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Error pausing reminders:", message, stack);
    return {
      success: false,
      error: { message, stack },
    };
  }
},



    async unpauseRemindersForAssignments(
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
          .where("reminderPaused", "==", true)
          .where("status", "==", NOTIFICATION_STATUS.PAUSED)
          .get();

        if (snapshot.empty) continue;

        const batch = db.batch();

        snapshot.docs.forEach((doc) => {
          const data = doc.data() as SubmissionNotification;

          batch.update(doc.ref, {
            reminderPaused: false,
            status: NOTIFICATION_STATUS.REMINDER_SCHEDULED,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          updatedNotifications.push({
            ...data,
            reminderPaused: false,
            status: NOTIFICATION_STATUS.REMINDER_SCHEDULED,
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
    // Fetch all notifications for this assignment
    const snapshot = await db
      .collection(COLLECTION.SUBMISSION_NOTIFICATION)
      .where("assignmentId", "==", assignmentId)
      .get();

    // If no notification exists yet, pause the first one by default
    if (snapshot.empty) {
      return ok(true);
    }

    // Check if any existing notification is paused
    const isAnyPaused = snapshot.docs.some(
      (doc) =>
        doc.get("reminderPaused") === true &&
        doc.get("status") === NOTIFICATION_STATUS.PAUSED
    );

    return ok(isAnyPaused);
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

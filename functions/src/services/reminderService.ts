import * as admin from "firebase-admin";
import { SubmissionNotification } from "../types/notifications";
import { COLLECTION, NOTIFICATION_STATUS } from "../constants";

import { ok, Result } from "../utils/response";
import { logger } from "firebase-functions";

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
  assignmentIds: string[],
  adminId: string
): Promise<Result<SubmissionNotification[]>> {
  try {
    if (!assignmentIds.length) return ok([]);

    const updatedNotifications: SubmissionNotification[] = [];
    logger.info(`Pausing reminders for assignments: ${assignmentIds.join(", ")} by admin: ${adminId}`);
    // Firestore 'in' query supports max 10 items
    const chunkSize = 10;
    for (let i = 0; i < assignmentIds.length; i += chunkSize) {
      const chunk = assignmentIds.slice(i, i + chunkSize);

      const snapshot = await db
        .collection(COLLECTION.SUBMISSION_NOTIFICATION)
        .where("assignmentId", "in", chunk)
        .where("adminId", "==", adminId) // Only this admin's notifications
        .where("reminderPaused", "==", false)
        .where("status", "in", [
          NOTIFICATION_STATUS.PENDING,
          NOTIFICATION_STATUS.REMINDER_SCHEDULED,
        ])
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

  async unpauseRemindersForAssignments(
    assignmentIds: string[],
    adminId: string
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
          .where("adminId", "==", adminId) // Only this admin's notifications
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

  /**
   * Get the list of admin IDs who have paused reminders for this assignment
   * @param assignmentId - The assignment ID to check
   * @returns Array of admin IDs who have paused their reminders
   */
  async checkIsReminderPausedForAssignmentforThisAdmin(
    assignmentId: string
  ): Promise<Result<string[]>> {
    try {
      // Fetch all notifications for this assignment that are paused
      const snapshot = await db
        .collection(COLLECTION.SUBMISSION_NOTIFICATION)
        .where("assignmentId", "==", assignmentId)
        .where("reminderPaused", "==", true)
        .where("status", "==", NOTIFICATION_STATUS.PAUSED)
        .get();

      // If no paused notifications exist, return empty array
      if (snapshot.empty) {
        return ok([]);
      }

      // Extract unique admin IDs who have paused notifications
      const pausedAdminIds: string[] = [];
      snapshot.docs.forEach((doc) => {
        const adminId = doc.get("adminId") as string;
        if (adminId && !pausedAdminIds.includes(adminId)) {
          pausedAdminIds.push(adminId);
        }
      });

      return ok(pausedAdminIds);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const stack = error instanceof Error ? error.stack : undefined;

      return {
        success: false,
        error: { message, stack },
      };
    }
  },
};

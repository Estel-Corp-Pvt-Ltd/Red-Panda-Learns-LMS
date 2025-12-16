import * as admin from "firebase-admin";
import { SubmissionNotification } from "../types/notifications";
import { NotificationStatus } from "../types/general";
import { COLLECTION, NOTIFICATION_STATUS } from "../constants";
import {
  sendMail,
  buildEvaluationEmail,
  buildReminderEmail,
} from "./emailService";
import crypto from "crypto";
import { reminderService } from "./reminderService";

const db = admin.firestore();
const notificationsRef = db.collection(COLLECTION.SUBMISSION_NOTIFICATION);


const BATCH_LIMIT = 450; 

const base62Chars =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateShortAdminId(adminId: string, length = 8) {
  const hash = crypto.createHash("sha256").update(adminId).digest();

  let shortId = "";
  for (let i = 0; i < length; i++) {
    // Take each byte of the hash, modulo 62
    shortId += base62Chars[hash[i] % 62];
  }
  return shortId;
}

export const notificationService = {
  /**
   * Create multiple notifications for all admins assigned to the student.
   * Uses deterministic hashed document IDs to avoid duplicates.
   * Uses Firestore batch writes for efficiency (1 network request).
   * 
   * 
   *  * Behavior:
 * - Checks if reminders are paused for the given assignment
 * - If paused: Creates notifications with PAUSED status (won't trigger reminders)
 * - If not paused: Creates notifications with PENDING status (will be scheduled for reminders)
 *
 * @param data - Object containing submission details and admin information
 * @returns Array of created SubmissionNotification objects
   */

async createNotification(data: {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  adminIds: string[];
  notificationEmailAddresses: string[];
}): Promise<SubmissionNotification[]> {
  try {
    // Check if reminders are paused for this assignment
    // If any notification for this assignment has reminderPaused=true,
    // new notifications should also be created in PAUSED state
    const isPausedResult = await reminderService.checkIsReminderPausedForAssignment(
      data.assignmentId
    );

    // Determine the initial status and reminderPaused flag based on pause state
    // - PAUSED: Notifications won't trigger reminder emails
    // - PENDING: Notifications will be picked up by the reminder scheduler
    const isReminderPaused = isPausedResult.success && isPausedResult.data === true;
    const initialStatus = isReminderPaused
      ? NOTIFICATION_STATUS.PAUSED
      : NOTIFICATION_STATUS.PENDING;

    const batch = db.batch();
    const notifications: SubmissionNotification[] = [];

    data.adminIds.forEach((adminId, index) => {
      const adminEmail = data.notificationEmailAddresses[index] ?? null;

      const shortAdminId = generateShortAdminId(adminId, 8);

      // Use new ID scheme: N_<submissionId>_<shortAdminId>
      const customId = `N_${data.submissionId}_${shortAdminId}`;

      const docRef = notificationsRef.doc(customId);

      const payload: SubmissionNotification = {
        id: customId,
        submissionId: data.submissionId,
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        adminId,
        adminEmail,
        // Status is determined by the assignment's current reminder pause state
        status: initialStatus,
        // Inherit the pause state from existing notifications for this assignment
        reminderPaused: isReminderPaused,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      };

      notifications.push(payload);
      batch.set(docRef, payload);
    });

    // Execute batch write only once → minimizes Firestore cost
    await batch.commit();

    return notifications;
  } catch (error) {
    console.error("Error in createNotification:", error);
    throw error;
  }
},

  async updateStatus(id: string, status: NotificationStatus, extra: any = {}) {
    try {
      await notificationsRef.doc(id).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...extra,
      });
    } catch (error) {
      console.error(`Error updating status for notification ${id}:`, error);
      throw error;
    }
  },

async scheduleReminder(id: string) {
  try {
    // Fetch the notification to get its assignmentId
    const docRef = notificationsRef.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.warn(`Notification ${id} does not exist`);
      return;
    }

    const data = docSnap.data() as SubmissionNotification;
    const assignmentId = data.assignmentId;

    // Check if reminder is paused for this assignment
    const isPausedResult = await reminderService.checkIsReminderPausedForAssignment(assignmentId);

    if (!isPausedResult.success) {
      console.error(
        `Failed to check pause status for assignment ${assignmentId}:`,
        isPausedResult.error
      );
      throw new Error("Failed to check pause status");
    }

    const isReminderPaused = isPausedResult.data === true;

    const newStatus = isReminderPaused
      ? NOTIFICATION_STATUS.PAUSED
      : NOTIFICATION_STATUS.REMINDER_SCHEDULED;

    await docRef.update({
      status: newStatus,
      reminderPaused: isReminderPaused, // update the boolean field
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `Notification ${id} updated. Status: ${newStatus}, reminderPaused: ${isReminderPaused}`
    );
  } catch (error) {
    console.error(`Error scheduling reminder for notification ${id}:`, error);
    throw error;
  }
},


  async sendInitialEmail(id: string, shouldScheduleReminder = true) {
    try {
      const parts = id.split("_");
      const submissionId = parts[1];

      const evalLink = `https://vizuara.ai/admin/submissions?submissionId=${submissionId}`;

      const doc = await notificationsRef.doc(id).get();
      if (!doc.exists) {
        return { success: false, error: "Notification not found" };
      }

      const notif = doc.data() as SubmissionNotification;

      // Choose template based on type
      const html = shouldScheduleReminder
        ? buildEvaluationEmail(evalLink) // INITIAL TEMPLATE
        : buildReminderEmail(evalLink); // REMINDER TEMPLATE

      // Send email with type included
      await sendMail({
        to: notif.adminEmail,
        subject: shouldScheduleReminder
          ? "New Submission Ready for Evaluation"
          : "Reminder: Submission Pending Evaluation",
        html, // use html instead
        type: shouldScheduleReminder ? "INITIAL" : "REMINDER",
      });

      /**
       * We only want to schedule the next reminder when this email
       * is being sent for the first time (triggered on document creation).
       *
       * When this function is called from the cron worker, we handle
       * reminder scheduling and status updates in batch (for performance
       * and efficiency), so running `scheduleReminder()` here again would
       * duplicate updates and create unnecessary writes.
       *
       * To avoid double status updates and redundant Firestore writes,
       * we use this flag to control whether scheduling should occur.
       */
      if (shouldScheduleReminder) {
        await this.scheduleReminder(id);
      }

      return { success: true };
    } catch (error) {
      console.error(
        `Error sending initial email for notification ${id}:`,
        error
      );
      return { success: false, error: (error as Error).message };
    }
  },

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

/**
 * Marks all notifications for a given submission as evaluated.
 */
async  markSubmissionNotificationsEvaluated(submissionId: string) {
  try {
    // 1️⃣ Query all notification docs for the submission
    const snapshot = await db
      .collection(COLLECTION.SUBMISSION_NOTIFICATION)
      .where("submissionId", "==", submissionId)
      .get();

    if (snapshot.empty) {
      console.warn(`No notification docs found for submission ${submissionId}`);
      return;
    }

    const docs = snapshot.docs;

    // 2️⃣ Process in chunks because Firestore batch limit = 500 writes
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const chunk = docs.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();

      chunk.forEach((doc) => {
        batch.update(doc.ref, { status: NOTIFICATION_STATUS.EVALUATED });
      });

      // 3️⃣ Commit batch
      await batch.commit();
    }

    console.log(
      `Successfully marked ${docs.length} notifications as evaluated for submission ${submissionId}`
    );
  } catch (error) {
    console.error(
      `Error marking notifications for submission ${submissionId} as evaluated:`,
      error
    );
    throw error; // Re-throw so callers can handle it
  }
},


  async archive(id: string) {
    try {
      await this.updateStatus(id, NOTIFICATION_STATUS.ARCHIVED);
    } catch (error) {
      console.error(`Error archiving notification ${id}:`, error);
      throw error;
    }
  },

  async getById(id: string) {
    try {
      const doc = await notificationsRef.doc(id).get();
      if (!doc.exists) return null;
      return doc.data() as SubmissionNotification;
    } catch (error) {
      console.error(`Error getting notification by id ${id}:`, error);
      throw error;
    }
  },
};

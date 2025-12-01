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
import { ok, Result } from "../utils/response";

const db = admin.firestore();
const notificationsRef = db.collection(COLLECTION.SUBMISSION_NOTIFICATION);

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
   */
  async createNotification(data: {
    submissionId: string;
    assignmentId: string;
    studentId: string;
    adminIds: string[];
    adminEmails: string[];
  }) {
    try {
      const batch = db.batch();
      const notifications: SubmissionNotification[] = [];

      data.adminIds.forEach((adminId, index) => {
        const adminEmail = data.adminEmails[index] ?? null;

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
          status: NOTIFICATION_STATUS.PENDING,
          reminderPaused: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
          updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        };

        notifications.push(payload);
        batch.set(docRef, payload);
      });

      // Execute only once → minimizes Firestore cost
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
      await notificationsRef.doc(id).update({
        status: NOTIFICATION_STATUS.REMINDER_SCHEDULED,
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
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

  async markEvaluated(id: string) {
    try {
      await this.updateStatus(id, NOTIFICATION_STATUS.EVALUATED);
    } catch (error) {
      console.error(`Error marking notification ${id} as evaluated:`, error);
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
          .get();

        if (snapshot.empty) continue;

        const batch = db.batch();

        snapshot.docs.forEach((doc) => {
          const data = doc.data() as SubmissionNotification;

          batch.update(doc.ref, {
            reminderPaused: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          updatedNotifications.push({
            ...data,
            reminderPaused: true,
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

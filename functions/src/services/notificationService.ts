import * as admin from "firebase-admin";
import { SubmissionNotification } from "../types/notifications";
import { NotificationStatus } from "../types/general";
import { COLLECTION, NOTIFICATION_STATUS } from "../constants";
import { sendMail, buildEvaluationEmail ,buildReminderEmail } from "./emailService";
import crypto from "crypto";

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
  },

  async updateStatus(id: string, status: NotificationStatus, extra: any = {}) {
    await notificationsRef.doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...extra,
    });
  },

  async scheduleReminder(id: string) {
  
    await notificationsRef.doc(id).update({
      status: NOTIFICATION_STATUS.REMINDER_SCHEDULED,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
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
    const html =
      shouldScheduleReminder
        ? buildEvaluationEmail(evalLink)           // INITIAL TEMPLATE
        : buildReminderEmail(evalLink);            // REMINDER TEMPLATE

    // Send email with type included
    await sendMail({
      to: notif.adminEmail,
      subject: shouldScheduleReminder
        ? "New Submission Ready for Evaluation"
        : "Reminder: Submission Pending Evaluation",
      html,   // use html instead
      type: shouldScheduleReminder ? "INITIAL" : "REMINDER"
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
    return { success: false, error: (error as Error).message };
  }
},


  async pauseReminder(id: string) {
    await notificationsRef.doc(id).update({
      status: NOTIFICATION_STATUS.PAUSED,
      reminderPaused: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  async markEvaluated(id: string) {
    await this.updateStatus(id, NOTIFICATION_STATUS.EVALUATED);
  },

  async archive(id: string) {
    await this.updateStatus(id, NOTIFICATION_STATUS.ARCHIVED);
  },

  async getById(id: string) {
    const doc = await notificationsRef.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as SubmissionNotification;
  },
};



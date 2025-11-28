import * as admin from "firebase-admin";
import { SubmissionNotifications } from "../types/notifications";
import { NotificationStatus } from "../types/general";
import { COLLECTION, NOTIFICATION_STATUS } from "../constants";
import { sendMail, buildEvaluationEmail } from "./emailService";
import crypto from "crypto";

const db = admin.firestore();
const notificationsRef = db.collection(COLLECTION.SUBMISSION_NOTIFICATIONS);

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
    const notifications: SubmissionNotifications[] = [];

    data.adminIds.forEach((adminId, index) => {
      const adminEmail = data.adminEmails[index] ?? null;

      const shortAdminId = generateShortAdminId(adminId, 8);

      // Use new ID scheme: N_<submissionId>_<shortAdminId>
      const customId = `N_${data.submissionId}_${shortAdminId}`;

      const docRef = notificationsRef.doc(customId);

      const payload: SubmissionNotifications = {
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

  async sendInitialEmail(id: string) {
    const parts = id.split("_");
    const submissionId = parts[1]; // parts[0] = 'N', parts[1] = submissionId, parts[2] = shortAdminId

    const evalLink = `https://vizuara.ai/admin/submissions?submissionId=${submissionId}`;

    // Fetch the notification to get admin email
    const doc = await notificationsRef.doc(id).get();
    if (!doc.exists) throw new Error("Notification not found");

    const notif = doc.data() as SubmissionNotifications;

    const html = buildEvaluationEmail(evalLink);

    await sendMail({
      to: notif.adminEmail,
      subject: "New Submission Ready for Evaluation",
      html,
    });

    await this.updateStatus(id, NOTIFICATION_STATUS.NOTIFIED, {
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  },

  async pauseReminder(id: string) {
    await notificationsRef.doc(id).update({
      status: "paused",
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
    return doc.data() as SubmissionNotifications;
  },
};

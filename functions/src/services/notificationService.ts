import * as admin from "firebase-admin";
import { SubmissionNotifications } from "../types/notifications";
import { NotificationStatus } from "../types/general";
import { COLLECTION, NOTIFICATION_STATUS } from "../constants";
const db = admin.firestore();
const notificationsRef = db.collection(COLLECTION.SUBMISSION_NOTIFICATIONS);

export const notificationService = {
  async createNotification(data: Partial<SubmissionNotifications>) {
    const docRef = notificationsRef.doc();

    const payload: SubmissionNotifications = {
      id: docRef.id,
      submissionId: data.submissionId!,
      assignmentId: data.assignmentId!,
      studentId: data.studentId!,
      adminId: data.adminId!,
      adminEmail: data.adminEmail!,
      status: NOTIFICATION_STATUS.PENDING,
      reminderPaused: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    };

    await docRef.set(payload);
    return payload;
  },

  async updateStatus(id: string, status: NotificationStatus, extra: any = {}) {
    await notificationsRef.doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...extra,
    });
  },

  async sendInitialEmail(id: string) {
    const doc = await notificationsRef.doc(id).get();
    if (!doc.exists) throw new Error("Notification not found");

    const notif = doc.data() as SubmissionNotifications;

    try {
      // TODO: integrate with real email provider
      console.log("sending email to:", notif.adminEmail);

      await this.updateStatus(id, NOTIFICATION_STATUS.NOTIFIED, {
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (err) {
      await this.updateStatus(id, NOTIFICATION_STATUS.ERROR, {
        lastError: String(err),
      });
      return { success: false, error: String(err) };
    }
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

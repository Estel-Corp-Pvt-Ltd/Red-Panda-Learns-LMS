import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions";
import { EmailType } from "../../types/general";

export interface MailPayload {
  to?: string;
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  type?: EmailType;
}

const pubsub = new PubSub();

export async function sendAnnouncementEmails(payload: MailPayload) {
  try {
    const topicName = "send-announcements";

    const dataBuffer = Buffer.from(JSON.stringify(payload));
    await pubsub.topic(topicName).publish(dataBuffer);

    if (payload.bcc && payload.bcc.length) {
      logger.info(`📧 Email queued with BCC (${payload.bcc.length} recipients)`);
    } else {
      logger.info(`📧 Email queued to: ${payload.to}`);
    }

    return { success: true };
  } catch (err: any) {
    logger.error("❌ Failed to queue email:", err);
    return { success: false, error: err.message };
  }
}

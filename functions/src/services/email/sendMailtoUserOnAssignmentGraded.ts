import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions/v2";  // Importing the logger from v2


export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMailtoUserOnAssignmentGraded(payload: MailPayload) {
  try {
    const topicName = "send-mail-to-user-on-assignment-graded"; // your Pub/Sub topic name

    // Create an instance of the PubSub client
    const pubsubClient = new PubSub();

    // Create a buffer from the payload to send as the message
    const dataBuffer = Buffer.from(JSON.stringify(payload));

    // Publish the message to the specified topic
    await pubsubClient.topic(topicName).publish(dataBuffer);

    logger.info("📧 Email queued successfully:", payload.to);
    return { success: true };
  } catch (err: any) {
    logger.error("❌ Failed to queue email:", err);
    return { success: false, error: err.message };
  }
}

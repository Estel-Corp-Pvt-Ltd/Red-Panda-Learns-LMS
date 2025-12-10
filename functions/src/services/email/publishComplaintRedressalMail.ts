import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions";
import { ComplaintActionType, ComplaintStatus } from "../../types/general";

export interface ComplaintMailPayload {
    to: string;
    subject: string;
    html: string;
    complaintId: string;
    actionType: ComplaintActionType;
    status: ComplaintStatus;
    isInternal: boolean;
    senderName: string;
    senderEmail: string;
};

const pubsub = new PubSub();

export async function sendComplaintRedressalEmail(
    payload: ComplaintMailPayload
) {
    try {

        if (payload.isInternal) {
            logger.info("🔒 Skipping email for internal complaint action", {
                complaintId: payload.complaintId,
                actionType: payload.actionType,
            });
            return { success: true, skipped: true };
        }

        const {
            to,
            subject,
            html,
            complaintId,
            actionType,
            status,
        } = payload;

        if (!to || !subject || !html || !complaintId) {
            logger.error("❌ Invalid complaint email payload", {
                toPresent: !!to,
                subjectPresent: !!subject,
                htmlPresent: !!html,
                complaintId,
            });
            return { success: false, error: "Invalid payload" };
        }

        const topicName = "send-complaint-redressal-emails";

        const dataBuffer = Buffer.from(JSON.stringify(payload));
        await pubsub.topic(topicName).publish(dataBuffer);

        logger.info("📨 Complaint email queued", {
            complaintId,
            actionType,
            status,
            to,
        });

        return { success: true };

    } catch (err: any) {
        logger.error("❌ Failed to queue complaint email", {
            message: err.message,
            stack: err.stack,
            complaintId: payload?.complaintId,
        });

        return { success: false, error: err.message };
    }
};

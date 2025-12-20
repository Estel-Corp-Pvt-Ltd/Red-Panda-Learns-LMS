import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions";
import { ComplaintStatus } from "../../types/general";

export interface ComplaintMailPayload {
    to: string;
    subject: string;
    message: string;
    complaintId: string;
    status: ComplaintStatus;
    isInternal: boolean;
};

const pubsub = new PubSub();

export async function publishComplaintRedressalMail(
    payload: ComplaintMailPayload
) {
    try {

        if (payload.isInternal) {
            logger.info("🔒 Skipping mail for internal complaint action", {
                complaintId: payload.complaintId,
            });
            return { success: true, skipped: true };
        }

        const {
            to,
            subject,
            message,
            complaintId,
            status,
        } = payload;

        if (!to || !subject || !message || !complaintId || !status) {
            logger.error("❌ Invalid complaint mail payload", {
                toPresent: !!to,
                subjectPresent: !!subject,
                messagePresent: !!message,
                complaintId,
            });
            return { success: false, error: "Invalid payload" };
        }

        const topicName = "send-complaint-redressal-mails";

        logger.info("Payload: ", payload);

        await pubsub.topic(topicName).publishMessage({ json: payload });

        logger.info("📨 Complaint mail queued", {
            complaintId,
            status,
            to,
        });

        return { success: true };

    } catch (err: any) {
        logger.error("❌ Failed to queue complaint mail", {
            message: err.message,
            stack: err.stack,
            complaintId: payload?.complaintId,
        });

        return { success: false, error: err.message };
    }
};

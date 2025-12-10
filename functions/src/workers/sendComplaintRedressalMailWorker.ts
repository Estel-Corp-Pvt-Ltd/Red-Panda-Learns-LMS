import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

export const sendComplaintRedressalEmailWorker = onMessagePublished(
    {
        topic: "send-complaint-redressal-emails",
        secrets: [BREVO_API_KEY],
    },
    async (event) => {
        const apiKey = BREVO_API_KEY.value();
        const payload = event.data.message.json;

        try {
            if (!payload) {
                logger.error("❌ Complaint redressal mail worker received empty payload");
                return;
            }

            const {
                to,
                subject,
                html,
                complaintId,
                actionType,
                status,
                senderName,
                senderEmail,
                isInternal,
            } = payload;

            if (isInternal) {
                logger.info("🔒 Skipping internal complaint action email", {
                    complaintId,
                    actionType,
                });
                return;
            }

            const safeTo = Array.isArray(to) ? to.filter(Boolean) : [];

            if (safeTo.length === 0) {
                logger.warn("⚠️ No recipients for complaint email", {
                    complaintId,
                    actionType,
                    status,
                });
                return;
            }

            if (!complaintId || !subject || !html) {
                logger.error("❌ Missing required complaint email fields", {
                    complaintId,
                    subjectPresent: !!subject,
                    htmlPresent: !!html,
                });
                return;
            }

            const sender = {
                name: senderName || "Vizuara Support",
                email: senderEmail || "support@vizuara.ai",
            };

            const textContent = html.replace(/<[^>]+>/g, "");

            const body = {
                sender,
                to: safeTo.map((email: string) => ({ email })),
                subject,
                htmlContent: html,
                textContent,
            };

            logger.info("📨 Sending complaint email", {
                complaintId,
                actionType,
                status,
                recipients: safeTo.length,
            });

            const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": apiKey,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                    `Brevo API failed (${res.status}): ${errorText}`
                );
            }

            logger.info("✅ Complaint email sent successfully", {
                complaintId,
                actionType,
                toCount: safeTo.length,
            });

        } catch (err: any) {
            logger.error("❌ Complaint email worker failed", {
                message: err.message,
                stack: err.stack,
                complaintId: payload?.complaintId,
                actionType: payload?.actionType,
            });
        }
    }
);

import * as admin from 'firebase-admin';
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";
import { buildComplaintRedressalEmail } from "../services/emailService";
import { Complaint } from '../types/complaint';

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export const sendComplaintRedressalMailWorker = onMessagePublished(
    {
        topic: "send-complaint-redressal-mails",
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
                message,
                complaintId,
                status,
                isInternal
            } = payload;

            if (isInternal) {
                logger.info("🔒 Skipping internal complaint action mail", {
                    complaintId,
                });
                return;
            }

            if (!to) {
                logger.warn("⚠️ No recipients for complaint mail", {
                    complaintId,
                    status,
                });
                return;
            }

            if (!complaintId || !subject || !message) {
                logger.error("❌ Missing required complaint mail fields", {
                    complaintId,
                    subjectPresent: !!subject,
                    messagePresent: !!message,
                });
                return;
            }

            const complaintSnap = await db
                .collection("Complaints")
                .doc(complaintId)
                .get();

            if (!complaintSnap.exists) {
                logger.error("❌ Complaint not found", { complaintId });
                return;
            }

            const complaint = complaintSnap.data() as Complaint;

            const sender = {
                name: "Vizuara Support",
                email: "no_reply@vizuara.com",
            };

            const html = buildComplaintRedressalEmail(
                {
                    complaintId,
                    userName: complaint.userName,
                    category: complaint.category,
                    status: complaint.status,
                    severity: complaint.severity,
                    actionTitle: subject,
                    messageBody: message,
                    resolutionSummary: complaint.resolutionSummary,
                    actionDate: (new Date()).toLocaleDateString()
                }
            );

            const textContent =
                message || (html ? html.replace(/<[^>]+>/g, "") : "");

            const body = {
                sender,
                to: [{ email: to }],
                subject,
                htmlContent: html,
                textContent,
            };

            logger.info("📨 Sending complaint mail", {
                complaintId,
                status,
                to,
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

            logger.info("✅ Complaint mail sent successfully", {
                complaintId,
                res
            });

        } catch (err: any) {
            logger.error("❌ Complaint mail worker failed", {
                message: err.message,
                stack: err.stack,
                complaintId: payload?.complaintId,
                actionType: payload?.actionType,
            });
        }
    }
);

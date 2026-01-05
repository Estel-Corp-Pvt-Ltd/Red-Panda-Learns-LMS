import { Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { COLLECTION, USER_ROLE } from "../constants";
import { authMiddleware } from "../middlewares/auth";
import { corsMiddleware } from "../middlewares/cors";
import { withMiddleware } from "../middlewares";
import crypto from "crypto";
import { logger } from "firebase-functions";
import { PubSub } from "@google-cloud/pubsub";
import { CertificateEmail } from "../utils/mails/certificate";
import { Enrollment } from "../types/enrollment";

const pubsub = new PubSub();

async function bulkIssueCertificatesHandler(req: Request, res: Response) {
    try {
        if (!(req as any).user || (req as any).user.role !== USER_ROLE.ADMIN) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { enrollments, remark } = req.body;

        if (!Array.isArray(enrollments) || enrollments.length === 0) {
            res.status(400).json({
                error: "enrollments must be a non-empty array of enrollment IDs",
            });
            return;
        }

        // Validate all items are strings (enrollment IDs)
        if (!enrollments.every(id => typeof id === "string")) {
            res.status(400).json({
                error: "All enrollment IDs must be strings",
            });
            return;
        }

        if (!remark || typeof remark !== "string") {
            res.status(400).json({
                error: "remark is required and must be a string",
            });
            return;
        }

        const db = admin.firestore();
        const now = admin.firestore.FieldValue.serverTimestamp();

        let issuedCount = 0;
        const issuedCertificates: string[] = [];
        let skippedCount = 0;
        const skippedEnrollments: string[] = [];

        // Process enrollments one by one
        for (const enrollmentId of enrollments) {
            try {
                const enrollmentRef = db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId);
                const snap = await enrollmentRef.get();

                if (!snap.exists) {
                    logger.log(`Enrollment ${enrollmentId} does not exist, skipping.`);
                    skippedEnrollments.push(enrollmentId);
                    skippedCount++;
                    continue;
                }

                const data = snap.data() as Enrollment;

                if (data?.certification?.issued === true) {
                    logger.log(`Certificate already issued for enrollment ${enrollmentId}, skipping.`);
                    skippedEnrollments.push(enrollmentId);
                    skippedCount++;
                    continue;
                }

                const certificateId = crypto.randomUUID();

                await enrollmentRef.update({
                    "certification.issued": true,
                    "certification.issuedAt": now,
                    "certification.certificateId": certificateId,
                    "certification.remark": remark,
                    completionDate: data?.completionDate ?? now,
                    updatedAt: now,
                });
                await pubsub.topic("certificate-mail").publishMessage({
                    json: {
                        email: data.userEmail,
                        subject: `Certificate for {{COURSE_NAME}} is Here! - Vizuara`,
                        body: `Dear {{USER_NAME}},\n\nCongratulations on completing the course "{{COURSE_NAME}}"! We are thrilled to inform you that your certificate is now ready.\n\nYou can download your certificate using the following link:\n\n{{CERTIFICATE_LINK}}\n\nREMARK: {{REMARK}}\n\nKeep up the great work!`,
                        vars: {
                            CERTIFICATE_LINK: `https://vizuara.ai/certificate/${data.id}`,
                            USER_NAME: data.userName,
                            COURSE_NAME: data.courseName,
                            REMARK: remark,
                        }
                    } as CertificateEmail,
                });
                issuedCertificates.push(enrollmentId);
                issuedCount++;
            } catch (error: any) {
                logger.error(`Failed to issue certificate for ${enrollmentId}:`, error);
                skippedEnrollments.push(enrollmentId);
                skippedCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: "Certificates issued successfully",
            issued: issuedCount,
            skipped: skippedCount,
            issuedCertificates,
            skippedEnrollments,
        });
        return;
    } catch (err: any) {
        logger.error("❌ Bulk certificate issuance failed:", err);
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        });
        return;
    }
};

export const bulkIssueCertificates = onRequest(
    { region: "us-central1" },
    withMiddleware(corsMiddleware, authMiddleware, bulkIssueCertificatesHandler)
);

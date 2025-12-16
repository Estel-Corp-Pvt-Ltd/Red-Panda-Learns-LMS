import { Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { COLLECTION, USER_ROLE } from "../constants";
import { authMiddleware } from "../middlewares/auth";
import { corsMiddleware } from "../middlewares/cors";
import { withMiddleware } from "../middlewares";
import crypto from "crypto";
import { logger } from "firebase-functions";

function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

// TODO: Make sure to add check for Admin operations

async function bulkIssueCertificatesHandler(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        if (!user || user.role !== USER_ROLE.ADMIN) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { enrollments, remark } = req.body;

        if (!Array.isArray(enrollments) || enrollments.length === 0) {
            res.status(400).json({
                error: "enrollments must be a non-empty array",
            });
            return;
        }

        for (const e of enrollments) {
            if (!e.userId || !e.courseId) {
                res.status(400).json({
                    error: "Each enrollment must have userId and courseId",
                });
                return;
            }
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
        let skippedCount = 0;

        const enrollmentChunks = chunk(enrollments, 450);
        const READ_CONCURRENCY = 15;

        for (const enrollmentChunk of enrollmentChunks) {
            const batch = db.batch();

            const readChunks = chunk(enrollmentChunk, READ_CONCURRENCY);

            for (const readChunk of readChunks) {
                const progressSnaps = await Promise.all(
                    readChunk.map(({ userId, courseId }) => {
                        return db
                            .collection(COLLECTION.LEARNING_PROGRESS)
                            .where("userId", "==", userId)
                            .where("courseId", "==", courseId)
                            .limit(1)
                            .get();
                    })
                );

                for (const snap of progressSnaps) {
                    if (!snap || snap.empty) continue;

                    const doc = snap.docs[0];
                    const data = doc.data();

                    if (data.certification?.issued === true) {
                        skippedCount++;
                        continue;
                    }

                    const certificateId = crypto.randomUUID();

                    batch.update(doc.ref, {
                        certification: {
                            issued: true,
                            issuedAt: now,
                            certificateId,
                            remark,
                        },
                        completionDate: data.completionDate ?? now,
                        updatedAt: now,
                    });

                    issuedCount++;
                }
            }

            await batch.commit();
        }

        res.status(200).json({
            success: true,
            message: "Certificates issued successfully",
            issued: issuedCount,
            skipped: skippedCount,
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

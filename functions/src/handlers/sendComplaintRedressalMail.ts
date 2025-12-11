import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { publishComplaintRedressalMail } from "../services/email/publishComplaintRedressalMail";
import { ComplaintStatus } from "../types/general";
import { USER_ROLE } from "../constants";

if (!admin.apps.length) {
    admin.initializeApp();
}

const sendComplaintRedressalMailHandler = async (
    req: Request,
    res: Response
) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed",
        });
        return;
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                error: "Missing authorization token",
            });
            return;
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        if (decodedToken.role !== USER_ROLE.ADMIN) {
            res.status(403).json({
                success: false,
                error: "Admin access required",
            });
            return;
        }

        const {
            to,
            subject,
            message,
            complaintId,
            status,
            isInternal
        } = req.body;

        if (
            !to ||
            !subject ||
            !message ||
            !complaintId ||
            !status
        ) {
            res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
            return;
        }

        const result = await publishComplaintRedressalMail({
            to,
            subject,
            message,
            complaintId,
            status: status as ComplaintStatus,
            isInternal: Boolean(isInternal),
        });

        if (!result.success) {
            throw new Error(result.error || "Failed to queue email");
        }

        res.status(200).json({
            success: true,
            queued: true,
        });

    } catch (err: any) {
        console.error("❌ sendComplaintRedressalMail error:", err);

        res.status(500).json({
            success: false,
            error: err.message || "Failed to send email",
        });
    }
};

export const sendComplaintRedressalMail = onRequest(
    { region: "us-central1" },
    withMiddleware(corsMiddleware, sendComplaintRedressalMailHandler)
);

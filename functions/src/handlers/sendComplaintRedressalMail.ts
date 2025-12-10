import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import * as admin from "firebase-admin";
import { sendComplaintRedressalEmail } from "../services/email/publishComplaintRedressalMail";
import { ComplaintActionType, ComplaintStatus } from "../types/general";

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

        if (!decodedToken.admin) {
            res.status(403).json({
                success: false,
                error: "Admin access required",
            });
            return;
        }

        const {
            to,
            subject,
            html,
            complaintId,
            actionType,
            status,
            isInternal,
            senderName,
            senderEmail,
        } = req.body;

        if (
            !to ||
            !subject ||
            !html ||
            !complaintId ||
            !actionType ||
            !status
        ) {
            res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
            return;
        }

        const result = await sendComplaintRedressalEmail({
            to,
            subject,
            html,
            complaintId,
            actionType: actionType as ComplaintActionType,
            status: status as ComplaintStatus,
            isInternal: Boolean(isInternal),
            senderName,
            senderEmail,
        });

        if (!result.success) {
            throw new Error(result.error || "Failed to queue email");
        }

        res.status(200).json({
            success: true,
            queued: true,
        });

    } catch (err: any) {
        console.error("❌ sendComplaintEmail error:", err);

        res.status(500).json({
            success: false,
            error: err.message || "Failed to send complaint email",
        });
    }
};

export const sendComplaintEmail = onRequest(
    { region: "us-central1" },
    withMiddleware(corsMiddleware, sendComplaintRedressalMailHandler)
);

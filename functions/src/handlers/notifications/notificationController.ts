import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { notificationService } from "../../services/notificationService";
import { COLLECTION } from "../../constants";
import * as admin from "firebase-admin";
import { FieldPath } from "firebase-admin/firestore";

// Helper: chunk array for Firestore "in" queries (>10 items limit)
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// TODO: Make sure to add check for Admin operations

async function createNotificationHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { submissionId, assignmentId, studentId } = req.body;

    if (!submissionId || !assignmentId || !studentId) {
      res.status(400).json({
        error: "Missing required fields: submissionId, assignmentId, studentId",
      });
      return;
    }

    // ----------------------------------------------------
    // 1. FIND ALL ADMINS ASSIGNED TO THIS STUDENT
    // ----------------------------------------------------
    const assignedAdminsSnap = await admin
      .firestore()
      .collection(COLLECTION.ADMIN_ASSIGNED_STUDENTS)
      .where("studentId", "==", studentId)
      .where("active", "==", true)
      .get();

    if (assignedAdminsSnap.empty) {
      res.status(404).json({
        error: "No active admins found for this student",
      });
      return;
    }

    const adminIds: string[] = assignedAdminsSnap.docs.map(
      (d) => d.data().adminId
    );

    // ----------------------------------------------------
    // 2. FETCH ADMIN EMAILS — Optimized (1 read if <= 10)
    // ----------------------------------------------------
    const adminEmails: string[] = [];

    const idChunks = chunk(adminIds, 10); // Firestore "in" query limit is 10
    console.log("Admin ID Chunks:", idChunks);
    for (const idChunk of idChunks) {
      const snap = await admin
        .firestore()
        .collection(COLLECTION.USERS)
        .where(FieldPath.documentId(), "in", idChunk)
        .get();

      snap.docs.forEach((doc) => {
        const email = doc.data()?.email;
        if (email) adminEmails.push(email);
      });
    }

    // ----------------------------------------------------
    // 3. CREATE NOTIFICATION
    // ----------------------------------------------------
    const notif = await notificationService.createNotification({
      submissionId,
      assignmentId,
      studentId,
      adminIds,
      adminEmails,
    });

    res.status(200).json({ success: true, data: notif });
  } catch (err: any) {
    console.error("❌ Create notification failed:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}

export const createNotification = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, createNotificationHandler)
);

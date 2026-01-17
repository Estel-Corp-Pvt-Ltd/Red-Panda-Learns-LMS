import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { addKarmaService } from "./addkarmaService";
import { COLLECTION, KARMA_CATEGORY } from "../../constants";
import * as admin from "firebase-admin";

const db = admin.firestore();
async function addKarmaHandler(req: Request, res: Response) {
  try {
    const authUser = (req as any).user;
    if (!authUser) {
      res.status(401).json({ error: "Unauthorized" });
      return; // just return, do NOT return res
    }

    const { userId, category, action, courseId, userName } = req.body;

    if (!category || !action || !courseId) {
      res.status(400).json({ error: "Missing required fields: category, action, courseId" });
      return;
    }

    if (!Object.values(KARMA_CATEGORY).includes(category)) {
      res.status(400).json({ error: "Invalid karma category" });
      return;
    }

    if (category === KARMA_CATEGORY.SOCIAL) {
      try {
        // Construct the enrollment ID
        const enrollmentId = `${userId}_${courseId}`;

        // Reference the enrollment document
        const enrollmentRef = db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId);

        // Update hasSharedCertificate to true
        await enrollmentRef.update({
          "certification.hasSharedCertificate": true,
        });

        console.log(`Enrollment ${enrollmentId} marked as hasSharedCertificate=true`);
      } catch (err) {
        console.error("Failed to update hasSharedCertificate:", err);
      }
    }
    const targetUserId = userId ?? authUser.uid;

    await addKarmaService.addKarmaToUser({
      userId: targetUserId,
      category,
      action,
      courseId,
      userName,
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Add karma failed:", error);
    res.status(500).json({ error: "Internal error", details: error.message });
  }
}

export const addKarma = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, addKarmaHandler)
);

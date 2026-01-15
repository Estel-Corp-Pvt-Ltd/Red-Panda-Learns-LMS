import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import { COLLECTION, PUSH_NOTIFICATION_TYPE } from "../constants";
import { sendGradedAssignmentNotification } from "../services/sendGradedAssignmentNotification";
import { calculateKarmaForAssignmentSubmission } from "../services/karma/calculateKarmaForAssignmentSubmission";

if (!admin.apps.length) admin.initializeApp();

async function sendSubmissionGradedNotificationHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user; // set by authMiddleware
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      submissionId,
      title,
      body,
      marks,
      assignmentTitle,
      isReevaluated,
      maximumMarks,
      minimumMarks,
      courseId,
    } = req.body;

    if (!submissionId || !title || !body) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const submissionSnap = await admin
      .firestore()
      .collection(COLLECTION.ASSIGNMENT_SUBMISSIONS)
      .doc(submissionId)
      .get();

    if (!submissionSnap.exists) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const { studentId, studentName } = submissionSnap.data() as {
      studentId: string;
      studentName: string;
    };

    if (!isReevaluated) {
      calculateKarmaForAssignmentSubmission({
        studentId,
        submissionId,
        courseId,
        marks,
        maximumMarks,
        minimumMarks,
        studentName,
      }).catch((err) => {
        console.error("Karma calculation failed:", err);
      });
    }

    const userSnap = await admin.firestore().collection(COLLECTION.USERS).doc(studentId).get();

    const { fcmTokens, email, userName, firstName } = userSnap.data() as {
      fcmTokens?: {
        token: string;
        platform: string;
      }[];
      email?: string;
      userName?: string;
      firstName?: string;
    };

    if (email) {
      (async () => {
        try {
          const result = await sendGradedAssignmentNotification(
            email,
            userName || firstName || "Student",
            marks,
            assignmentTitle || "Assignment",
            isReevaluated || false
          );

          if (!result.success) {
            console.error("Error sending graded assignment email:", result.error);
          }
        } catch (err) {
          console.error("Email notification failed:", err);
        }
      })();
    }

    if (fcmTokens && fcmTokens.length > 0) {
      const tokens = fcmTokens.map((t) => t.token);

      (async () => {
        try {
          const response = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {
              title,
              body,
            },
            data: {
              type: PUSH_NOTIFICATION_TYPE.GRADING,
              url: "https://vizuara.ai/submissions",
            },
          });

          // Cleanup invalid tokens
          const invalidTokens: string[] = [];
          response.responses.forEach((r, idx) => {
            if (!r.success) {
              const code = r.error?.code;
              if (
                code === "messaging/registration-token-not-registered" ||
                code === "messaging/invalid-registration-token"
              ) {
                invalidTokens.push(tokens[idx]);
              }
            }
          });

          if (invalidTokens.length > 0) {
            await admin
              .firestore()
              .collection(COLLECTION.USERS)
              .doc(studentId)
              .update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(
                  ...invalidTokens.map((token) => ({ token }))
                ),
              });
          }
        } catch (err) {
          console.error("FCM multicast failed:", err);
        }
      })();
    }

    res.status(200).json({ message: "Notification sent" });
  } catch (error: any) {
    console.error("Push notification error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export const sendSubmissionGradedNotification = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, sendSubmissionGradedNotificationHandler)
);

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { COLLECTION, QUIZ_STATUS } from "../constants";

if (!admin.apps.length) admin.initializeApp();

export const canStartQuizHandler = async (
  req: functions.https.CallableRequest
) => {
  try {
    if (!req.auth) {
      return {
        success: false,
        message: "Only logged-in students can attempt quizzes.",
      };
    }

    const { quizId } = req.data;

    if (!quizId || typeof quizId !== "string") {
      return {
        success: false,
        message: "Invalid quizId provided.",
      };
    }

    const quizSnap = await admin
      .firestore()
      .collection(COLLECTION.QUIZZES)
      .doc(quizId)
      .get();

    if (!quizSnap.exists) {
      return {
        success: false,
        message: "Quiz not found.",
      };
    }

    const quiz = quizSnap.data() as any;

    if (quiz.status !== QUIZ_STATUS.PUBLISHED) {
      return {
        success: false,
        message: "Quiz is not yet published.",
      };
    }

    if (!quiz.scheduledAt) {
      return {
        success: false,
        message: "Quiz start time not configured.",
      };
    }

    const serverTime = admin.firestore.Timestamp.now();
    const scheduledAt = quiz.scheduledAt as admin.firestore.Timestamp;

    // 🔒 Normalize endAt
    const rawEndAt = quiz.endAt;
    const endAt =
      rawEndAt instanceof admin.firestore.Timestamp
        ? rawEndAt
        : null;

    const now = serverTime.toMillis();
    const start = scheduledAt.toMillis();

    // ✅ Start time ALWAYS enforced
    if (now < start) {
      return {
        success: false,
        message: "Quiz has not started yet.",
      };
    }

    // ✅ Expiration ONLY if endAt exists
    if (endAt) {
      const end = endAt.toMillis();

      if (now >= end) {
        return {
          success: false,
          message: "Quiz has expired.",
        };
      }
    }

    // ✅ Quiz starts even without end time
    return {
      success: true,
      message: "Quiz can be started.",
    };
  } catch (error: any) {
    functions.logger.error("Unexpected error:", error);
    return {
      success: false,
      message: "Unexpected error occurred.",
    };
  }
};


export const canStartQuiz = functions.https.onCall(
  {
    cors: [
      "https://vizuara.ai",
      "http://localhost:8080",
      "https://vizuara-ai-labs-dev.web.app",
    ],
  },
  canStartQuizHandler
);

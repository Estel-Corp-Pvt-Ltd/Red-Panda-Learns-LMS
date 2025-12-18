import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { COLLECTION } from "../constants";

if (!admin.apps.length) admin.initializeApp();

export const getQuizTimeLeftHandler = async (
  req: functions.https.CallableRequest
) => {
  try {
    functions.logger.info("[getQuizTimeLeft] Request received", {
      auth: req.auth,
      data: req.data,
    });

    if (!req.auth) {
      return { success: false, message: "Only logged-in students can access quiz timing." };
    }

    const { quizId } = req.data;

    if (!quizId || typeof quizId !== "string") {
      return { success: false, message: "Invalid quizId provided." };
    }

    // Fetch quiz
    const quizSnap = await admin.firestore().collection(COLLECTION.QUIZZES).doc(quizId).get();
    if (!quizSnap.exists) {
      functions.logger.warn("[getQuizTimeLeft] Quiz not found", { quizId });
      return { success: false, message: "Quiz not found." };
    }

    const quiz = quizSnap.data() as any;

    functions.logger.info("[getQuizTimeLeft] Quiz data fetched", {
      quizId,
      scheduledAt: quiz.scheduledAt?.toDate?.() ?? quiz.scheduledAt,
      endAt: quiz.endAt?.toDate?.() ?? quiz.endAt,
      durationMinutes: quiz.durationMinutes,
    });

    if (!quiz.durationMinutes) {
      return { success: false, message: "Quiz duration not configured." };
    }

    const now = admin.firestore.Timestamp.now().toMillis();
    const durationMs = quiz.durationMinutes * 60 * 1000;
    functions.logger.info("[getQuizTimeLeft] Server time and duration", {
      now: new Date(now).toISOString(),
      durationMs,
    });

    // Fetch user's submission if exists
    const submissionSnap = await admin
      .firestore()
      .collection(COLLECTION.QUIZ_SUBMISSIONS)
      .where("quizId", "==", quizId)
      .where("userId", "==", req.auth.uid)
      .limit(1)
      .get();

    let effectiveEndMillis: number;

    if (quiz.endAt instanceof admin.firestore.Timestamp) {
      // Quiz has a fixed end time
      effectiveEndMillis = quiz.endAt.toMillis();
      functions.logger.info("[getQuizTimeLeft] Using quiz endAt", {
        effectiveEndMillis: new Date(effectiveEndMillis).toISOString(),
      });
    } else if (!submissionSnap.empty && submissionSnap.docs[0].data().startedAt) {
      // No endAt, but user already started → use submission.startedAt
      const submission = submissionSnap.docs[0].data();
      const startedAtMillis =
        submission.startedAt.toMillis?.() ?? new Date(submission.startedAt).getTime();

      effectiveEndMillis = startedAtMillis + durationMs;
      functions.logger.info("[getQuizTimeLeft] No endAt, using submission.startedAt", {
        startedAt: new Date(startedAtMillis).toISOString(),
        effectiveEndMillis: new Date(effectiveEndMillis).toISOString(),
      });
    } else {
      // First time starting quiz → use now + duration
      effectiveEndMillis = now + durationMs;
      functions.logger.info("[getQuizTimeLeft] No endAt and no submission, using now + duration", {
        effectiveEndMillis: new Date(effectiveEndMillis).toISOString(),
      });
    }

    const timeLeftSeconds = Math.max(0, Math.floor((effectiveEndMillis - now) / 1000));

    functions.logger.info("[getQuizTimeLeft] Computed timeLeftSeconds", { timeLeftSeconds });

    return { success: true, timeLeftSeconds };
  } catch (error) {
    functions.logger.error("[getQuizTimeLeft] Unexpected error:", error);
    return { success: false, message: "Unexpected error occurred." };
  }
};

export const getQuizTimeLeft = functions.https.onCall(
  {
    cors: [
      "https://vizuara.ai",
      "http://localhost:8080",
      "https://vizuara-ai-labs-dev.web.app",
    ],
  },
  getQuizTimeLeftHandler
);

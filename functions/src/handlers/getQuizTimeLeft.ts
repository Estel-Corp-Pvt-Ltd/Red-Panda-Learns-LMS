import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { COLLECTION, QUIZ_SUBMISSION_STATUS } from "../constants";

if (!admin.apps.length) admin.initializeApp();

/**
 * Safely converts a Firestore Timestamp / Date / date-string to milliseconds.
 * Always returns a number (ms since epoch) or null if conversion fails.
 */
const toMillis = (value: any): number | null => {
  if (!value) return null;

  // Firestore Timestamp
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  // Firestore-like object with toDate()
  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  // Date instance or string
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export const getQuizTimeLeftHandler = async (
  req: functions.https.CallableRequest
) => {
  try {
    functions.logger.info("[getQuizTimeLeft] Request received", {
      auth: req.auth,
      data: req.data,
    });

    // 1. Auth check: only logged-in users can query quiz timing
    if (!req.auth) {
      return {
        success: false,
        message: "Only logged-in students can access quiz timing.",
      };
    }

    const { quizId } = req.data;

    // 2. Basic input validation
    if (!quizId || typeof quizId !== "string") {
      return { success: false, message: "Invalid quizId provided." };
    }

    const db = admin.firestore();

    // 3. Fetch quiz document
    const quizSnap = await db.collection(COLLECTION.QUIZZES).doc(quizId).get();

    if (!quizSnap.exists) {
      functions.logger.warn("[getQuizTimeLeft] Quiz not found", { quizId });
      return { success: false, message: "Quiz not found." };
    }

    const quiz = quizSnap.data() as any;

    // Expect durationMinutes to be configured on the quiz
    if (!quiz.durationMinutes || typeof quiz.durationMinutes !== "number") {
      functions.logger.warn("[getQuizTimeLeft] Quiz duration not configured", {
        quizId,
        durationMinutes: quiz.durationMinutes,
      });
      return { success: false, message: "Quiz duration not configured." };
    }

    const nowMillis = admin.firestore.Timestamp.now().toMillis();
    const durationMs = quiz.durationMinutes * 60 * 1000;

    const scheduledAtMillis = toMillis(quiz.scheduledAt);
    const endAtMillis = toMillis(quiz.endAt);

    functions.logger.info("[getQuizTimeLeft] Quiz data fetched", {
      quizId,
      scheduledAt: scheduledAtMillis
        ? new Date(scheduledAtMillis).toISOString()
        : null,
      endAt: endAtMillis ? new Date(endAtMillis).toISOString() : null,
      durationMinutes: quiz.durationMinutes,
      serverNow: new Date(nowMillis).toISOString(),
      durationMs,
    });

    // 4. Fetch user's existing submission (if any)
    const submissionSnap = await db
      .collection(COLLECTION.QUIZ_SUBMISSIONS)
      .where("quizId", "==", quizId)
      .where("userId", "==", req.auth.uid)
      .limit(1)
      .get();

let startedAtMillis: number | null;

// 1. Ensure startedAt exists (persist once)
if (!submissionSnap.empty) {
  const submission = submissionSnap.docs[0].data();
  startedAtMillis = toMillis(submission.startedAt);

  if (!startedAtMillis) {
    functions.logger.error("[getQuizTimeLeft] Invalid startedAt", {
      quizId,
      userId: req.auth.uid,
      startedAt: submission.startedAt,
    });
    return { success: false, message: "Invalid submission start time." };
  }
} else {
  const startedAt = admin.firestore.Timestamp.now();

  await db.collection(COLLECTION.QUIZ_SUBMISSIONS).add({
    quizId,
    userId: req.auth.uid,
    startedAt,
    status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
  });

  startedAtMillis = startedAt.toMillis();

  functions.logger.info("[getQuizTimeLeft] Created submission", {
    startedAt: new Date(startedAtMillis).toISOString(),
  });
}

// 2. Calculate duration-based end
const durationEndMillis = startedAtMillis + durationMs;

// 3. Apply absolute quiz expiry (endAt)
const effectiveEndMillis =
  endAtMillis != null
    ? Math.min(durationEndMillis, endAtMillis)
    : durationEndMillis;

functions.logger.info("[getQuizTimeLeft] Effective end calculated", {
  startedAt: new Date(startedAtMillis).toISOString(),
  durationEnd: new Date(durationEndMillis).toISOString(),
  quizEndAt: endAtMillis ? new Date(endAtMillis).toISOString() : null,
  effectiveEnd: new Date(effectiveEndMillis).toISOString(),
});

    // 5. Compute remaining time in whole seconds, never less than 0
    const timeLeftSeconds = Math.max(
      0,
      Math.floor((effectiveEndMillis - nowMillis) / 1000)
    );

    functions.logger.info("[getQuizTimeLeft] Computed timeLeftSeconds", {
      timeLeftSeconds,
    });

    return { success: true, timeLeftSeconds };
  } catch (error) {
    functions.logger.error("[getQuizTimeLeft] Unexpected error", { error });
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
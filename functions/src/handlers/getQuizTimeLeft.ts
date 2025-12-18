import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { COLLECTION } from "../constants";

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

    let effectiveEndMillis: number;

    if (endAtMillis != null) {
      /**
       * Case 1: Quiz has a fixed endAt configured.
       * All students share this hard deadline, regardless of when they started.
       */
      effectiveEndMillis = endAtMillis;
      functions.logger.info("[getQuizTimeLeft] Using quiz endAt", {
        effectiveEndMillis: new Date(effectiveEndMillis).toISOString(),
      });
    } else if (!submissionSnap.empty) {
      /**
       * Case 2: No fixed endAt, but this user already has a submission.
       * Use submission.startedAt + duration to determine when this user’s quiz ends.
       */
      const submission = submissionSnap.docs[0].data();
      const startedAtMillis = toMillis(submission.startedAt);

      if (!startedAtMillis) {
        functions.logger.error(
          "[getQuizTimeLeft] Submission has invalid startedAt",
          {
            quizId,
            userId: req.auth.uid,
            startedAt: submission.startedAt,
          }
        );
        return {
          success: false,
          message: "Invalid submission start time.",
        };
      }

      effectiveEndMillis = startedAtMillis + durationMs;

      functions.logger.info(
        "[getQuizTimeLeft] No quiz endAt, using submission.startedAt",
        {
          startedAt: new Date(startedAtMillis).toISOString(),
          effectiveEndMillis: new Date(effectiveEndMillis).toISOString(),
        }
      );
    } else {
      /**
       * Case 3: No fixed endAt and no previous submission.
       * This is effectively the user’s first time starting the quiz.
       * Use now + duration as their personal end time.
       *
       * NOTE: If you want to persist this "start" moment, you should
       * create a submission document here with startedAt = nowMillis.
       */
      effectiveEndMillis = nowMillis + durationMs;

      functions.logger.info(
        "[getQuizTimeLeft] No quiz endAt and no previous submission; using now + duration",
        {
          effectiveEndMillis: new Date(effectiveEndMillis).toISOString(),
        }
      );
    }

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
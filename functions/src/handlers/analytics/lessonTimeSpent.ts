import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/https";
import { lessonAnalyticsService } from "../../services/lessonAnalyticsService";
import { courseAnalyticsService } from "../../services/courseAnalyticsService";
import { learningProgressService } from "../../services/learningProgressService";
import { durationToSeconds } from "../../utils/date-time";
import { addKarmaService } from "../../services/karma/addkarmaService";
import { COLLECTION, KARMA_CATEGORY, LEARNING_ACTION } from "../../constants";
import { LearningAction } from "../../types/general";

if (!admin.apps.length) admin.initializeApp();

// Constants
const KARMA_INTERVAL_SECONDS = 600; // 10 minutes = 600 seconds

async function lessonTimeSpentHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      lessonId,
      courseId,
      timeSpentSec,
      duration,
      updatedAt,
      karmaBoostExpiresAfter,
    } = req.body;

    if (!lessonId || !courseId || timeSpentSec === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // functions.logger.info("🔍 Raw request body:", {
    //   lessonId,
    //   courseId,
    //   timeSpentSec,
    //   duration,
    //   updatedAt,
    //   karmaBoostExpiresAfter,
    // });
    // Get current progress to find existing time spent BEFORE update
    const progressResult = await learningProgressService.getUserCourseProgress(user.uid, courseId);

    let existingTimeSpent = 0;

    if (progressResult.success && progressResult.data.length > 0) {
      const progress = progressResult.data[0];
      existingTimeSpent = progress.lessonHistory?.[lessonId]?.timeSpent || 0;
    }

    // Calculate new total after this update
    const newTotalTimeSpent = existingTimeSpent + timeSpentSec;

    // Calculate lesson duration cap (if provided)
    const durationInSeconds = durationToSeconds(duration);

    // Cap times at lesson duration
    const cappedExistingTime = Math.min(existingTimeSpent, durationInSeconds);
    const cappedNewTime = Math.min(newTotalTimeSpent, durationInSeconds);

    // Calculate intervals BEFORE this update
    const intervalsBefore = Math.floor(cappedExistingTime / KARMA_INTERVAL_SECONDS);
    // Calculate intervals AFTER this update
    const intervalsAfter = Math.floor(cappedNewTime / KARMA_INTERVAL_SECONDS);

    // How many NEW 10-minute thresholds were crossed
    const newIntervalsCompleted = intervalsAfter - intervalsBefore;

    // Debug logging
    // functions.logger.info("🔍 Debug time values:", {
    //   existingTimeSpent,
    //   timeSpentSec,
    //   newTotalTimeSpent,
    //   duration,
    //   durationInSeconds,
    //   cappedExistingTime,
    //   cappedNewTime,
    //   KARMA_INTERVAL_SECONDS,
    //   intervalsBefore,
    //   intervalsAfter,
    //   newIntervalsCompleted,
    //   // Check data types
    //   typeOfTimeSpentSec: typeof timeSpentSec,
    //   typeOfExistingTimeSpent: typeof existingTimeSpent,
    // });

    // Grant karma for each new interval crossed
    if (newIntervalsCompleted > 0) {
      functions.logger.info(`Granting ${newIntervalsCompleted} karma for watch time`, {
        userId: user.uid,
        lessonId,
        courseId,
        existingTimeSpent,
        timeSpentSec,
        newTotalTimeSpent,
        cappedExistingTime,
        cappedNewTime,
        intervalsBefore,
        intervalsAfter,
        newIntervalsCompleted,
      });

      // Fetching User Details
      const userSnap = await admin.firestore().collection(COLLECTION.USERS).doc(user.uid).get();

      const { userName, firstName, lastName } = userSnap.data() as {
        userName?: string;
        firstName?: string;
        lastName?: string;
      };

      // ----------------------------
      // Karma boost active check
      // ----------------------------
      const updatedAtMs = new Date(updatedAt).getTime();
      const boostDurationMs = karmaBoostExpiresAfter
        ? durationToSeconds(karmaBoostExpiresAfter) * 1000
        : 0;

      const boostExpiryTime = updatedAtMs + boostDurationMs;
      const now = Date.now();

      const isKarmaBoostActive = !!karmaBoostExpiresAfter && boostExpiryTime > now;

      // ----------------------------
      // Decide karma action
      // ----------------------------
      let karmaAction: LearningAction = LEARNING_ACTION.LESSON_WATCH_TIME;

      if (isKarmaBoostActive) {
        karmaAction = LEARNING_ACTION.KARMA_BOOST_LESSON_POINTS;
      } else {
        functions.logger.info("[KarmaBoost Debug] Karma boost is NOT active, using default action");
      }
      // Fire-and-forget: Grant karma for each new interval
      for (let i = 0; i < newIntervalsCompleted; i++) {
        addKarmaService.addKarmaToUser({
          userId: user.uid,
          category: KARMA_CATEGORY.LEARNING,
          action: karmaAction,
          courseId,
          userName: userName || firstName || lastName,
        });
      }
    }

    // Now update time spent (this adds timeSpentSec to existing)
    await learningProgressService.timeSpentOnLesson(user.uid, courseId, lessonId, timeSpentSec);

    await lessonAnalyticsService.updateLessonAnalytics({
      courseId,
      lessonId,
      timeSpentSec,
    });

    await courseAnalyticsService.updateCourseAnalytics({
      courseId,
      timeSpentSec,
    });

    functions.logger.info(
      `Updated time spent for lesson ${lessonId} in course ${courseId} by user ${user.uid}`
    );

    res.json({
      success: true,
      karmaGranted: newIntervalsCompleted,
      totalTimeSpent: newTotalTimeSpent,
    });
  } catch (err: any) {
    functions.logger.error("❌ lessonTimeSpentHandler error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}

export const lessonTimeSpent = onRequest(
  {
    region: "us-central1",
  },
  withMiddleware(corsMiddleware, authMiddleware, lessonTimeSpentHandler)
);

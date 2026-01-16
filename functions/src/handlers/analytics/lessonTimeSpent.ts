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
import { KARMA_CATEGORY, LEARNING_ACTION } from "../../constants";

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

    const { lessonId, courseId, timeSpentSec, duration } = req.body;

    if (!lessonId || !courseId || timeSpentSec === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

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
    functions.logger.info("What is new interval before", intervalsBefore);
    // Calculate intervals AFTER this update
    const intervalsAfter = Math.floor(cappedNewTime / KARMA_INTERVAL_SECONDS);
    functions.logger.info("What is new interval after", intervalsAfter);
    // How many NEW 10-minute thresholds were crossed
    const newIntervalsCompleted = intervalsAfter - intervalsBefore;
    functions.logger.info("What is new interval", newIntervalsCompleted);
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

      // Fire-and-forget: Grant karma for each new interval
      for (let i = 0; i < newIntervalsCompleted; i++) {
        addKarmaService.addKarmaToUser({
          userId: user.uid,
          category: KARMA_CATEGORY.LEARNING,
          action: LEARNING_ACTION.LESSON_WATCH_TIME,
          courseId,
          userName: user.userName || user.firstName,
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

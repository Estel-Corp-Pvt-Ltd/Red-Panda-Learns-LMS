import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { COLLECTION, QUIZ_STATUS } from "../constants";

if (!admin.apps.length) admin.initializeApp();

export const canStartQuizHandler = async (req: functions.https.CallableRequest) => {
    try {
        if (!req.auth) {
            return { success: false, message: "Only logged-in students can attempt quizzes." };
        }

        const { quizId } = req.data;

        if (!quizId || typeof quizId !== "string") {
            return {
                success: false,
                message: "Invalid quizId provided."
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
                message: "Quiz not found."
            };
        }

        const quiz = quizSnap.data() as any;

        if (quiz.status !== QUIZ_STATUS.PUBLISHED) {
            return { success: false, message: "Quiz is not yet published." };
        }

        if (!quiz.scheduledAt || !quiz.durationMinutes) {
            return {
                success: false,
                message: "Quiz timings invalid."
            };
        }

        const serverTime = admin.firestore.Timestamp.now();
        const scheduledAt = quiz.scheduledAt as admin.firestore.Timestamp;

        const quizEndMillis = scheduledAt.toMillis() + quiz.durationMinutes * 60 * 1000;

        const now = serverTime.toMillis();
        const start = scheduledAt.toMillis();
        const end = quizEndMillis;

        if (now < start) {
            return {
                success: false,
                message: "Quiz has not started yet."
            };
        }

        if (now >= end) {
            return {
                success: false,
                message: "Quiz has expired."
            };
        }

        return {
            success: true,
            message: "Quiz can be started."
        };

    } catch (error: any) {
        functions.logger.error("Unexpected error:", error);
        return {
            success: false,
            message: "Unexpected error occurred."
        };
    }
};

export const canStartQuiz = functions.https.onCall({ cors: ["https://vizuara.ai", "http://localhost:8080"] }, canStartQuizHandler);

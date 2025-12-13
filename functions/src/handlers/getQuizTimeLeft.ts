import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { COLLECTION } from "../constants";

if (!admin.apps.length) admin.initializeApp();

export const getQuizTimeLeftHandler = async (req: functions.https.CallableRequest) => {
    try {
        if (!req.auth) {
            return { success: false, message: "Only logged-in students can access quiz timing." };
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

        if (!quiz.scheduledAt || !quiz.durationMinutes) {
            return {
                success: false,
                message: "Quiz has invalid timing configuration."
            };
        }

        // const startMillis = quiz.scheduledAt.toMillis();
        const endAt = quiz.endAt as admin.firestore.Timestamp | undefined;
        const durationMs = quiz.durationMinutes * 60 * 1000;

        const now = admin.firestore.Timestamp.now().toMillis();
        let endMillis = endAt ? endAt.toMillis() : now + durationMs;

        // Ensure endMillis does not exceed scheduled start + duration
        if (endMillis > now + durationMs) {
            endMillis = now + durationMs;
        }

        // Find Quiz attempt time
        const quizSubmissionSnap = await admin
            .firestore()
            .collection(COLLECTION.QUIZ_SUBMISSIONS)
            .where("quizId", "==", quizId)
            .where("userId", "==", req.auth.uid)
            .limit(1)
            .get();

        if (!quizSubmissionSnap.empty) {
            const submissionData = quizSubmissionSnap.docs[0].data() as any;
            if (submissionData.startedAt) {
                const startedAtMillis = submissionData.startedAt?.toMillis() ?? new Date(submissionData.startedAt).getTime();   // it is Firebase FieldValue
                const adjustedEndMillis = startedAtMillis + durationMs;
                if (adjustedEndMillis < endMillis) {
                    endMillis = adjustedEndMillis;
                }
            }
        }

        const timeLeftSeconds = Math.max(0, Math.floor((endMillis - now) / 1000));

        return {
            success: true,
            timeLeftSeconds
        };

    } catch (error) {
        functions.logger.error("Unexpected error:", error);
        return {
            success: false,
            message: "Unexpected error occurred."
        };
    }
};

export const getQuizTimeLeft = functions.https.onCall(
    { cors: ["https://vizuara.ai", "http://localhost:8080", "https://vizuara-ai-labs-dev.web.app"] },
    getQuizTimeLeftHandler
);

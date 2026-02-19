import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getQuizSubmissionsSchema = {
    quizId: z.string().describe("The quiz ID to get submissions for"),
    status: z.string().optional().describe("Filter by status: IN PROGRESS, SUBMITTED, AUTO_SUBMITTED"),
    limit: z.number().optional().default(50).describe("Maximum number of results (default 50)"),
};
export async function getQuizSubmissions(params) {
    let query = db
        .collection(COLLECTION.QUIZ_SUBMISSIONS)
        .where("quizId", "==", params.quizId);
    if (params.status) {
        query = query.where("status", "==", params.status);
    }
    const limit = params.limit ?? 50;
    const snap = await query.limit(limit).get();
    // Get quiz details for pass/fail context
    const quizDoc = await db.collection(COLLECTION.QUIZZES).doc(params.quizId).get();
    const quizData = quizDoc.exists ? quizDoc.data() : null;
    const passingPercentage = quizData?.passingPercentage ?? 0;
    const totalMarks = quizData?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) ?? 0;
    const submissions = snap.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            quizId: d.quizId,
            userId: d.userId,
            userName: d.userName,
            userEmail: d.userEmail,
            status: d.status,
            totalScore: d.totalScore ?? null,
            passed: d.passed ?? null,
            answersCount: d.answers?.length ?? 0,
            startedAt: d.startedAt?.toDate?.()?.toISOString() ?? null,
            submittedAt: d.submittedAt?.toDate?.()?.toISOString() ?? null,
            lastSavedAt: d.lastSavedAt?.toDate?.()?.toISOString() ?? null,
        };
    });
    // Calculate summary stats
    const submitted = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED");
    const passedCount = submitted.filter((s) => s.passed === true).length;
    const failedCount = submitted.filter((s) => s.passed === false).length;
    const avgScore = submitted.length > 0
        ? submitted.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / submitted.length
        : 0;
    return {
        quizId: params.quizId,
        quizTitle: quizData?.title ?? "Unknown",
        totalMarks,
        passingPercentage,
        totalCount: submissions.length,
        limit,
        summary: {
            submitted: submitted.length,
            inProgress: submissions.filter((s) => s.status === "IN PROGRESS").length,
            passed: passedCount,
            failed: failedCount,
            averageScore: Math.round(avgScore * 100) / 100,
        },
        submissions,
    };
}
//# sourceMappingURL=get_quiz_submissions.js.map
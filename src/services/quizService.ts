import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from "firebase/firestore";

import { COLLECTION, QUIZ_STATUS, QUIZ_SUBMISSION_STATUS } from "@/constants";
import { db } from "@/firebaseConfig";
import { Question, Quiz, QuizSubmission, SubmittedAnswer } from "@/types/quiz";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";

class QuizService {
    /**
     * Creates a new Quiz document.
     *
     * @param createdBy - Creator's UID
     * @param quiz - The quiz object
     * @returns Result<{ quizId: string }>
     */
    async createQuiz(
        createdBy: string, // uid
        quiz: Omit<Quiz, "id" | "createdBy" | "totalMarks" | "questions" | "createdAt" | "updatedAt">
    ): Promise<Result<{ quizId: string }>> {
        try {
            const quizRef = doc(collection(db, COLLECTION.QUIZZES));
            const quizId = quizRef.id;

            const newQuiz: Quiz = {
                id: quizId,
                title: quiz.title,
                courseId: quiz.courseId,
                description: quiz.description || "",
                allowAllStudents: quiz.allowAllStudents,
                allowedStudentUids: quiz.allowedStudentUids || [],
                questions: [],
                totalMarks: 0,
                passingPercentage: quiz.passingPercentage,
                scheduledAt: quiz.scheduledAt,
                durationMinutes: quiz.durationMinutes,
                enableFreeNavigation: quiz.enableFreeNavigation,
                status: quiz.status,
                createdBy: createdBy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await setDoc(quizRef, newQuiz);

            return ok({ quizId });
        } catch (error: any) {
            logError("QuizService.createQuiz", error);
            return fail("Failed to create quiz.", error.code || error.message);
        }
    }

    /**
     * Updates a quiz document.
     *
     * @param quizId - ID of the quiz to update
     * @param updates - Partial quiz fields to update
     */
    async updateQuiz(
        quizId: string,
        updates: Partial<Quiz>
    ): Promise<Result<null>> {
        try {
            const quizRef = doc(db, COLLECTION.QUIZZES, quizId);

            // ---- ALLOWED FIELDS ONLY ----
            const allowedUpdates: (keyof Quiz)[] = [
                "title",
                "description",
                "allowAllStudents",
                "allowedStudentUids",
                "questions",
                "totalMarks",
                "passingPercentage",
                "scheduledAt",
                "durationMinutes",
                "enableFreeNavigation",
                "status"
            ];

            const safeUpdates: Partial<Quiz> = {};

            for (const key of allowedUpdates) {
                if (key in updates && updates[key] !== undefined) {
                    // @ts-expect-error - dynamic key assignment
                    safeUpdates[key] = updates[key];
                }
            }

            // Prevent updating sensitive fields
            const forbidden = ["id", "createdAt", "createdBy", "courseId"];
            for (const field of forbidden) {
                if (field in updates) {
                    return fail(
                        `Field "${field}" cannot be updated.`,
                        "forbidden-update"
                    );
                }
            }

            if (Object.keys(safeUpdates).length === 0) {
                return fail("No valid fields provided for update.");
            }

            safeUpdates.updatedAt = serverTimestamp();

            await updateDoc(quizRef, safeUpdates);

            return ok(null);
        } catch (error: any) {
            logError("QuizService.updateQuiz", error);
            return fail("Failed to update quiz.", error.code || error.message);
        }
    }

    /**
     * Replaces the entire list of questions in a quiz with a new list.
     *
     * @param quizId - The ID of the quiz to update.
     * @param questions - The full new list of questions.
     */
    async setQuestions(
        quizId: string,
        questions: Question[]
    ): Promise<Result<null>> {
        try {
            const quizRef = doc(db, COLLECTION.QUIZZES, quizId);
            const snap = await getDoc(quizRef);

            if (!snap.exists()) {
                return fail("Quiz not found.", "not-found");
            }

            const totalMarks = this.calculateTotalMarks(questions);

            await updateDoc(quizRef, {
                questions,
                totalMarks,
                updatedAt: serverTimestamp(),
            });

            return ok(null);

        } catch (error: any) {
            logError("QuizService.setQuestions", error);
            return fail("Failed to update questions.", error.code || error.message);
        }
    }

    /**
     * Fetches all quizzes belonging to a specific course.
     *
     * @param courseId - The ID of the course whose quizzes should be retrieved.
     */
    async getQuizzesByCourse(
        courseId: string
    ): Promise<Result<Quiz[]>> {
        try {
            const quizzesQuery = query(
                collection(db, COLLECTION.QUIZZES),
                where("courseId", "==", courseId)
            );

            const snapshot = await getDocs(quizzesQuery);

            const quizzes: Quiz[] = snapshot.docs.map(doc => ({
                ...(doc.data() as Quiz),
            }));

            return ok(quizzes);

        } catch (error: any) {
            logError("QuizService.getQuizzesByCourse", error);
            return fail("Failed to fetch quizzes.", error.code || error.message);
        }
    }

    async deleteQuiz(quizId: string): Promise<Result<null>> {
        try {
            if (!quizId || quizId.trim().length === 0) {
                return fail("Invalid quiz ID");
            }

            const quizRef = doc(db, COLLECTION.QUIZZES, quizId);
            await deleteDoc(quizRef);

            return ok(null);
        } catch (error) {
            logError("QuizService.deleteQuiz", error);
            return fail("Failed to delete quiz");
        }
    }

    /**
     * Fetches all quizzes for multiple course IDs and filters by allowed student.
     *
     * @param courseIds - Array of course IDs
     * @param userId - UID of the student
     */
    async getQuizzesByCoursesForUser(
        courseIds: string[],
        userId: string
    ): Promise<Result<Quiz[]>> {
        try {
            if (!courseIds || courseIds.length === 0) {
                return ok([]); // return empty if no courseIds provided
            }

            const chunkSize = 10; // Firestore 'in' operator limit
            const chunks: string[][] = [];
            for (let i = 0; i < courseIds.length; i += chunkSize) {
                chunks.push(courseIds.slice(i, i + chunkSize));
            }

            const allQuizzes: Quiz[] = [];

            for (const chunk of chunks) {
                const quizzesQuery = query(
                    collection(db, COLLECTION.QUIZZES),
                    where("courseId", "in", chunk)
                );

                const snapshot = await getDocs(quizzesQuery);
                const quizzes: Quiz[] = snapshot.docs.map(doc => doc.data() as Quiz);
                // Filter quizzes that allow this user
                const userQuizzes = quizzes.filter(q =>
                    q.status === QUIZ_STATUS.PUBLISHED && (q.allowAllStudents || q.allowedStudentUids.includes(userId))
                );

                allQuizzes.push(...userQuizzes);
            }

            return ok(allQuizzes);

        } catch (error: any) {
            logError("QuizService.getQuizzesByCoursesForUser", error);
            return fail("Failed to fetch quizzes.", error.code || error.message);
        }
    }

    /**
     * Checks if a user is allowed to take a quiz AND the quiz is active.
     */
    async isUserAllowedToTakeQuiz(
        quizId: string,
        userId: string
    ): Promise<Result<{ allowed: boolean }>> {
        try {
            if (!quizId || !userId) {
                return ok({ allowed: false });
            }

            const ref = doc(db, COLLECTION.QUIZZES, quizId);
            const snap = await getDoc(ref);

            if (!snap.exists()) {
                return ok({ allowed: false });
            }

            const quiz = snap.data() as Quiz;

            if (quiz.status !== QUIZ_STATUS.PUBLISHED) {
                return ok({ allowed: false });
            }

            const isAllowed =
                quiz.allowAllStudents ||
                quiz.allowedStudentUids?.includes(userId);

            if (!isAllowed) {
                return ok({ allowed: false });
            }

            return ok({ allowed: true });

        } catch (error: any) {
            logError("QuizService.isUserAllowedAndQuizActive", error);
            return ok({ allowed: false });
        }
    }

    /**
     * Fetch a single quiz by its ID.
     *
     * @param quizId - The ID of the quiz to fetch.
     */
    async getQuizById(quizId: string): Promise<Result<Quiz | null>> {
        try {
            if (!quizId || quizId.trim().length === 0) {
                return fail("Invalid quiz ID");
            }

            const quizRef = doc(db, COLLECTION.QUIZZES, quizId);
            const snap = await getDoc(quizRef);

            if (!snap.exists()) {
                return ok(null);
            }

            const quiz = snap.data() as Quiz;

            return ok(quiz);

        } catch (error: any) {
            logError("QuizService.getQuizById", error);
            return fail("Failed to fetch quiz", error.code || error.message);
        }
    }

    /**
     * Save (upsert) a single answer inside the student's QuizSubmission document.
     *
     * The submission document id is: `${quizId}_${userId}` and lives under COLLECTION.QUIZ_SUBMISSIONS.
     * This method:
     * - fetches the quiz to determine question type
     * - loads (or creates) the submission doc following your QuizSubmission schema
     * - replaces or inserts the SubmittedAnswer for the given questionNo
     * - updates lastSavedAt (serverTimestamp)
     *
     * NOTE: does NOT calculate isCorrect / obtainedMarks / totalScore / passed / submittedAt.
     */
    async saveSingleAnswer(
        quizId: string,
        userId: string,
        questionNo: number,
        answer: string | string[] | null
    ): Promise<Result<null>> {
        try {
            if (!quizId || !userId) {
                return fail("Missing quizId or userId", "invalid-input");
            }

            const quizRef = doc(db, COLLECTION.QUIZZES, quizId);
            const quizSnap = await getDoc(quizRef);
            if (!quizSnap.exists()) {
                return fail("Quiz not found", "not-found");
            }
            const quiz = quizSnap.data() as Quiz;

            const question = quiz.questions.find(q => q.questionNo === questionNo);
            if (!question) {
                return fail("Question not found", "invalid-question");
            }

            const submissionId = `${quizId}_${userId}`;
            const submissionRef = doc(db, COLLECTION.QUIZ_SUBMISSIONS, submissionId);

            const submissionSnap = await getDoc(submissionRef);

            let submission: QuizSubmission;
            if (!submissionSnap.exists()) {
                submission = {
                    id: submissionId,
                    quizId,
                    userId,
                    startedAt: serverTimestamp(),
                    lastSavedAt: serverTimestamp(),
                    answers: [],
                    status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS
                };
            } else {
                submission = submissionSnap.data() as QuizSubmission;
                submission.answers = submission.answers ?? [];
            }

            const submittedAnswer: SubmittedAnswer = {
                questionNo,
                type: question.type,
                answer
            };

            const answersCopy = [...(submission.answers || [])];
            const idx = answersCopy.findIndex(a => a.questionNo === questionNo);
            if (idx !== -1) {
                answersCopy[idx] = submittedAnswer;
            } else {
                answersCopy.push(submittedAnswer);
            }

            await setDoc(
                submissionRef,
                {
                    id: submissionId,
                    quizId,
                    userId,
                    startedAt: submission.startedAt || serverTimestamp(),
                    lastSavedAt: serverTimestamp(),
                    answers: answersCopy,
                    status: submission.status || QUIZ_SUBMISSION_STATUS.IN_PROGRESS
                },
                { merge: true }
            );

            return ok(null);
        } catch (error: any) {
            logError("QuizService.saveSingleAnswer", error);
            return fail("Failed to save answer", error.code || error.message);
        }
    }

    async createSubmission(
        quizId: string,
        userId: string
    ): Promise<Result<QuizSubmission>> {
        try {
            if (!quizId || !userId) {
                return fail("Missing quizId or userId", "invalid-input");
            }

            const submissionId = `${quizId}_${userId}`;
            const submissionRef = doc(db, COLLECTION.QUIZ_SUBMISSIONS, submissionId);
            const submissionSnap = await getDoc(submissionRef);

            if (submissionSnap.exists()) {
                return ok(submissionSnap.data() as QuizSubmission);
            }

            const newSubmission: QuizSubmission = {
                id: submissionId,
                quizId,
                userId,
                startedAt: serverTimestamp(),
                lastSavedAt: serverTimestamp(),
                answers: [],
                status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS
            };

            await setDoc(submissionRef, newSubmission);

            return ok(newSubmission);
        } catch (error: any) {
            logError("QuizService.createSubmission", error);
            return fail("Failed to create submission", error.code || error.message);
        }
    }

    async getSubmission(
        quizId: string,
        userId: string
    ): Promise<Result<QuizSubmission | null>> {
        try {
            if (!quizId || !userId) {
                return fail("Missing quizId or userId", "invalid-input");
            }

            const submissionId = `${quizId}_${userId}`;
            const submissionRef = doc(db, COLLECTION.QUIZ_SUBMISSIONS, submissionId);
            const submissionSnap = await getDoc(submissionRef);

            if (!submissionSnap.exists()) {
                return ok(null); // no submission exists yet
            }

            const submission = submissionSnap.data() as QuizSubmission;
            submission.answers = submission.answers ?? [];

            return ok(submission);
        } catch (error: any) {
            logError("QuizService.getSubmission", error);
            return fail("Failed to fetch submission", error.code || error.message);
        }
    }

    private calculateTotalMarks(questions: Question[]): number {
        return questions.reduce((sum, q) => sum + (q.marks ?? 0), 0);
    }
}

export const quizService = new QuizService();

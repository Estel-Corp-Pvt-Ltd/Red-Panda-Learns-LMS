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
  where,
} from "firebase/firestore";

import { COLLECTION, QUIZ_QUESTION_TYPE, QUIZ_STATUS, QUIZ_SUBMISSION_STATUS } from "@/constants";
import { db } from "@/firebaseConfig";
import { Question, Quiz, QuizSubmission, SubmittedAnswer } from "@/types/quiz";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import { authService } from "./authService";
import { error } from "console";
import { calulateKarmaForQuizSubmission } from "./calculateKarmaForQuiz";

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
        endAt: quiz.endAt,
        durationMinutes: quiz.durationMinutes,
        enableFreeNavigation: quiz.enableFreeNavigation,
        status: quiz.status,
        createdBy: createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
  async updateQuiz(quizId: string, updates: Partial<Quiz>): Promise<Result<null>> {
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
        "endAt",
        "durationMinutes",
        "enableFreeNavigation",
        "status",
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
          return fail(`Field "${field}" cannot be updated.`, "forbidden-update");
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
  async setQuestions(quizId: string, questions: Question[]): Promise<Result<null>> {
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
  async getQuizzesByCourse(courseId: string): Promise<Result<Quiz[]>> {
    try {
      const quizzesQuery = query(
        collection(db, COLLECTION.QUIZZES),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(quizzesQuery);

      const quizzes: Quiz[] = snapshot.docs.map((doc) => ({
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
  async getQuizzesByCoursesForUser(courseIds: string[], userId: string): Promise<Result<Quiz[]>> {
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
        const quizzes: Quiz[] = snapshot.docs.map((doc) => doc.data() as Quiz);
        // Filter quizzes that allow this user
        const userQuizzes = quizzes.filter(
          (q) =>
            q.status === QUIZ_STATUS.PUBLISHED &&
            (q.allowAllStudents || q.allowedStudentUids.includes(userId))
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

      const isAllowed = quiz.allowAllStudents || quiz.allowedStudentUids?.includes(userId);

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
    userName: string,
    userEmail: string,
    questionNo: number,
    answer: string | string[] | null,
    markedForReview: boolean
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

      const question = quiz.questions.find((q) => q.questionNo === questionNo);
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
          userName,
          userEmail,
          startedAt: serverTimestamp(),
          lastSavedAt: serverTimestamp(),
          answers: [],
          status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
        };
      } else {
        submission = submissionSnap.data() as QuizSubmission;
        submission.answers = submission.answers ?? [];
      }

      const submittedAnswer: SubmittedAnswer = {
        questionNo,
        type: question.type,
        answer,
        markedForReview,
      };

      const answersCopy = [...(submission.answers || [])];
      const idx = answersCopy.findIndex((a) => a.questionNo === questionNo);
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
          status: submission.status || QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
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
    userId: string,
    userName: string,
    userEmail: string
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
        userName,
        userEmail,
        startedAt: serverTimestamp(),
        lastSavedAt: serverTimestamp(),
        answers: [],
        status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
      };

      await setDoc(submissionRef, newSubmission);

      return ok(newSubmission);
    } catch (error: any) {
      logError("QuizService.createSubmission", error);
      return fail("Failed to create submission", error.code || error.message);
    }
  }

  async markAnswerForReview(
    quizId: string,
    userId: string,
    questionNo: number,
    markedForReview: boolean
  ): Promise<Result<null>> {
    try {
      if (!quizId || !userId) {
        return fail("Missing quizId or userId", "invalid-input");
      }

      const submissionId = `${quizId}_${userId}`;
      const submissionRef = doc(db, COLLECTION.QUIZ_SUBMISSIONS, submissionId);
      const submissionSnap = await getDoc(submissionRef);

      if (!submissionSnap.exists()) {
        return fail("Submission not found", "not-found");
      }

      const submission = submissionSnap.data() as QuizSubmission;
      submission.answers = submission.answers ?? [];

      const idx = submission.answers.findIndex((a) => a.questionNo === questionNo);

      if (idx !== -1) {
        submission.answers[idx] = {
          ...submission.answers[idx],
          markedForReview,
        };

        await setDoc(
          submissionRef,
          {
            lastSavedAt: serverTimestamp(),
            answers: submission.answers,
          },
          { merge: true }
        );
      }

      return ok(null);
    } catch (error: any) {
      logError("QuizService.markAnswerForReview", error);
      return fail("Failed to mark/unmark answer", error.code || error.message);
    }
  }

  async getSubmission(quizId: string, userId: string): Promise<Result<QuizSubmission | null>> {
    try {
      if (!quizId || !userId) {
        return fail("Missing quizId or userId", "invalid-input");
      }

      const submissionId = `${quizId}_${userId}`;
      const submissionRef = doc(db, COLLECTION.QUIZ_SUBMISSIONS, submissionId);
      const submissionSnap = await getDoc(submissionRef);

      if (!submissionSnap.exists()) {
        return ok(null);
      }

      const submission = submissionSnap.data() as QuizSubmission;
      submission.answers = submission.answers ?? [];

      return ok(submission);
    } catch (error: any) {
      logError("QuizService.getSubmission", error);
      return fail("Failed to fetch submission", error.code || error.message);
    }
  }

  /**
   * Set or unset the releaseScores flag on a quiz.
   *
   * @param quizId - ID of the quiz
   * @param release - true to release scores, false to hide
   */
  async setReleaseScores(quizId: string, release: boolean): Promise<Result<null>> {
    try {
      if (!quizId) {
        return fail("Missing quizId", "invalid-input");
      }

      const quizRef = doc(db, COLLECTION.QUIZZES, quizId);
      const snap = await getDoc(quizRef);

      if (!snap.exists()) {
        return fail("Quiz not found", "not-found");
      }

      await updateDoc(quizRef, {
        releaseScores: release,
        updatedAt: serverTimestamp(),
      });

      return ok(null);
    } catch (error: any) {
      logError("QuizService.setReleaseScores", error);
      return fail("Failed to update releaseScores", error.code || error.message);
    }
  }

  /**
   * Final submission of a quiz by a user using the latest frontend answers state.
   *
   * @param quizId - The quiz being submitted
   * @param userId - The student's UID
   * @param answers - Latest answers from frontend
   */
  async submitQuiz(
    quizId: string,
    userId: string,
    userName: string,
    userEmail: string,
    answers: Record<number, { selectedOptions: string[]; markedForReview: boolean }>
  ): Promise<Result<QuizSubmission>> {
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

      const submissionId = `${quizId}_${userId}`;
      const submissionRef = doc(db, COLLECTION.QUIZ_SUBMISSIONS, submissionId);
      const submissionSnap = await getDoc(submissionRef);

      let submission: QuizSubmission;
      if (!submissionSnap.exists()) {
        // Create a new submission if it does not exist
        submission = {
          id: submissionId,
          quizId,
          userId,
          userName,
          userEmail,
          startedAt: serverTimestamp(),
          lastSavedAt: serverTimestamp(),
          answers: [],
          status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
        };
      } else {
        submission = submissionSnap.data() as QuizSubmission;
      }

      const submittedAnswers: SubmittedAnswer[] = quiz.questions.map((q) => {
        const ans = answers[q.questionNo];
        return {
          questionNo: q.questionNo,
          type: q.type,
          answer: ans?.selectedOptions ?? null,
          markedForReview: ans?.markedForReview ?? false,
        };
      });

      let totalScore = 0;

      const evaluatedAnswers = submittedAnswers.map((ans) => {
        const question = quiz.questions.find((q) => q.questionNo === ans.questionNo);
        if (!question) return ans;

        let obtainedMarks = 0;
        const fullMarks = question.marks ?? 0;

        if (ans.answer != null) {
          if (question.type === QUIZ_QUESTION_TYPE.MCQ) {
            if (ans.answer[0] === question.correctAnswer) {
              obtainedMarks = fullMarks;
            }
          } else if (question.type === QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER) {
            const correctArr = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
            const answerArr = Array.isArray(ans.answer) ? ans.answer : [];

            const allCorrect =
              correctArr.length === answerArr.length &&
              correctArr.every((a) => answerArr.includes(a));

            if (allCorrect) obtainedMarks = fullMarks;
          } else if (question.type === QUIZ_QUESTION_TYPE.FILL_BLANK) {
            let correctAnswer = Array.isArray(question.correctAnswer)
              ? question.correctAnswer[0]
              : question.correctAnswer;
            let userAnswer = Array.isArray(ans.answer) ? ans.answer[0] : ans.answer;
            // Apply rules if any
            if (question.rules) {
              if (question.rules.spaceRemoval) {
                correctAnswer = correctAnswer.replace(/\s+/g, "").trim();
                userAnswer = userAnswer.replace(/\s+/g, "").trim();
              }
              if (question.rules.caseInSensitive) {
                correctAnswer = correctAnswer.toLowerCase();
                userAnswer = userAnswer.toLowerCase();
              }
            }
            if (userAnswer === correctAnswer) {
              obtainedMarks = fullMarks;
            }
          }
        }

        totalScore += obtainedMarks;

        return {
          ...ans,
          obtainedMarks,
          isCorrect: obtainedMarks === fullMarks,
        };
      });

      const passingPercentage = quiz.passingPercentage ?? 0;
      const passed =
        quiz.totalMarks > 0 ? (totalScore / quiz.totalMarks) * 100 >= passingPercentage : false;

      try {
        const idToken = await authService.getToken();

        // fire-and-forget (intentionally NOT awaited)
        calulateKarmaForQuizSubmission
          .calculateKarma(
            passingPercentage,
            quiz.totalMarks,
            totalScore,
            idToken,
            quiz.courseId
          )
          .catch((err) => {
            console.error("[KarmaCalculation] Async error:", err);
          });
      } catch (err) {
        console.error("[KarmaCalculation] Failed to trigger karma calculation:", err);
      }

      const finalSubmission: QuizSubmission = {
        ...submission,
        answers: evaluatedAnswers,
        totalScore,
        passed,
        status: QUIZ_SUBMISSION_STATUS.SUBMITTED,
        submittedAt: serverTimestamp(),
        lastSavedAt: serverTimestamp(),
      };

      await setDoc(submissionRef, finalSubmission, { merge: true });

      return ok(finalSubmission);
    } catch (error: any) {
      logError("QuizService.submitQuiz", error);
      return fail("Failed to submit quiz", error.code || error.message);
    }
  }

  /**
   * Fetch submissions for a user for multiple quizzes.
   *
   * @param quizInfoArr - Array of quizzes with { id: string; releaseScores: boolean }
   * @param userId - UID of the user
   * @returns Array of submission info: { quizId, releaseScores, status, totalScore }
   */
  async getUserSubmissionsStatus(
    quizInfoArr: { id: string; releaseScores: boolean }[],
    userId: string
  ): Promise<
    Result<
      {
        quizId: string;
        releaseScores: boolean;
        status: string;
        totalScore: number;
        passed: boolean;
      }[]
    >
  > {
    try {
      if (!quizInfoArr || !Array.isArray(quizInfoArr) || !userId) {
        return fail("Invalid input", "invalid-input");
      }

      const results: {
        quizId: string;
        releaseScores: boolean;
        status: string;
        totalScore: number;
        passed: boolean;
      }[] = [];

      for (const quizInfo of quizInfoArr) {
        const submissionId = `${quizInfo.id}_${userId}`;
        const submissionRef = doc(db, COLLECTION.QUIZ_SUBMISSIONS, submissionId);
        const submissionSnap = await getDoc(submissionRef);

        if (!submissionSnap.exists()) {
          results.push({
            quizId: quizInfo.id,
            releaseScores: quizInfo.releaseScores,
            status: QUIZ_SUBMISSION_STATUS.NOT_SUBMITTED,
            totalScore: 0,
            passed: false,
          });
          continue;
        }

        const submission = submissionSnap.data() as QuizSubmission;

        results.push({
          quizId: quizInfo.id,
          releaseScores: quizInfo.releaseScores,
          status: submission.status,
          totalScore: submission.totalScore ?? 0,
          passed: submission.passed,
        });
      }

      return ok(results);
    } catch (error: any) {
      logError("QuizService.getUserSubmissionsStatus", error);
      return fail("Failed to fetch submissions status", error.code || error.message);
    }
  }

  async getAllSubmissionsForQuiz(quizId: string): Promise<Result<QuizSubmission[]>> {
    try {
      if (!quizId || quizId.trim().length === 0) {
        return fail("Invalid quiz ID");
      }

      const submissionsQuery = query(
        collection(db, COLLECTION.QUIZ_SUBMISSIONS),
        where("quizId", "==", quizId)
      );

      const snapshot = await getDocs(submissionsQuery);

      const submissions: QuizSubmission[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as QuizSubmission),
      }));

      return ok(submissions);
    } catch (error: any) {
      logError("QuizService.getAllSubmissionsForQuiz", error);
      return fail("Failed to fetch submissions.", error.code || error.message);
    }
  }

  async deleteQuizSubmission(submissionId: string): Promise<Result<void>> {
    try {
      const submissionRef = doc(db, COLLECTION.QUIZ_SUBMISSIONS, submissionId);
      await deleteDoc(submissionRef);
      return ok(null);
    } catch (error: any) {
      logError("QuizService.resetQuizSubmission", error);
      return fail("Failed to reset quiz submission", error.code || error.message);
    }
  }

  private calculateTotalMarks(questions: Question[]): number {
    return questions.reduce((sum, q) => sum + (q.marks ?? 0), 0);
  }
}

export const quizService = new QuizService();

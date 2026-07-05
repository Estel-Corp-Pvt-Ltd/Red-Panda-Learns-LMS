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

import {
  COLLECTION,
  KARMA_CATEGORY,
  LEARNING_ACTION,
  QUIZ_QUESTION_TYPE,
  QUIZ_STATUS,
  QUIZ_SUBMISSION_STATUS,
} from "@/constants";
import { BACKEND_URL } from "@/config";
import { db } from "@/firebaseConfig";
import { Question, TopicQuiz, TopicQuizSubmission, SubmittedAnswer } from "@/types/quiz";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import { authService } from "./authService";

class TopicQuizService {
  async createTopicQuiz(
    createdBy: string,
    quiz: Omit<TopicQuiz, "id" | "createdBy" | "totalMarks" | "questions" | "createdAt" | "updatedAt">
  ): Promise<Result<{ quizId: string }>> {
    try {
      const quizRef = doc(collection(db, COLLECTION.TOPIC_QUIZZES));
      const quizId = quizRef.id;

      const newQuiz: TopicQuiz = {
        id: quizId,
        courseId: quiz.courseId,
        topicId: quiz.topicId,
        title: quiz.title,
        description: quiz.description || "",
        questions: [],
        totalMarks: 0,
        passingPercentage: quiz.passingPercentage,
        durationMinutes: quiz.durationMinutes,
        enableFreeNavigation: quiz.enableFreeNavigation,
        status: quiz.status,
        xpReward: quiz.xpReward ?? 0,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(quizRef, newQuiz);

      return ok({ quizId });
    } catch (error: any) {
      logError("TopicQuizService.createTopicQuiz", error);
      return fail("Failed to create topic quiz.", error.code || error.message);
    }
  }

  async updateTopicQuiz(quizId: string, updates: Partial<TopicQuiz>): Promise<Result<null>> {
    try {
      const quizRef = doc(db, COLLECTION.TOPIC_QUIZZES, quizId);

      const allowedUpdates: (keyof TopicQuiz)[] = [
        "title",
        "description",
        "passingPercentage",
        "durationMinutes",
        "enableFreeNavigation",
        "status",
        "xpReward",
      ];

      const safeUpdates: Partial<TopicQuiz> = {};
      for (const key of allowedUpdates) {
        if (key in updates && updates[key] !== undefined) {
          // @ts-expect-error - dynamic key assignment
          safeUpdates[key] = updates[key];
        }
      }

      const forbidden = ["id", "createdAt", "createdBy", "courseId", "topicId"];
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
      logError("TopicQuizService.updateTopicQuiz", error);
      return fail("Failed to update topic quiz.", error.code || error.message);
    }
  }

  async setQuestions(quizId: string, questions: Question[]): Promise<Result<null>> {
    try {
      const quizRef = doc(db, COLLECTION.TOPIC_QUIZZES, quizId);
      const snap = await getDoc(quizRef);

      if (!snap.exists()) {
        return fail("Topic quiz not found.", "not-found");
      }

      const totalMarks = this.calculateTotalMarks(questions);

      await updateDoc(quizRef, {
        questions,
        totalMarks,
        updatedAt: serverTimestamp(),
      });

      return ok(null);
    } catch (error: any) {
      logError("TopicQuizService.setQuestions", error);
      return fail("Failed to update questions.", error.code || error.message);
    }
  }

  async getTopicQuizById(quizId: string): Promise<Result<TopicQuiz | null>> {
    try {
      if (!quizId?.trim()) return fail("Invalid quiz ID");

      const quizRef = doc(db, COLLECTION.TOPIC_QUIZZES, quizId);
      const snap = await getDoc(quizRef);

      if (!snap.exists()) return ok(null);

      return ok(snap.data() as TopicQuiz);
    } catch (error: any) {
      logError("TopicQuizService.getTopicQuizById", error);
      return fail("Failed to fetch topic quiz.", error.code || error.message);
    }
  }

  async getQuizzesByTopic(topicId: string): Promise<Result<TopicQuiz[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.TOPIC_QUIZZES),
        where("topicId", "==", topicId)
      );
      const snapshot = await getDocs(q);
      const quizzes: TopicQuiz[] = snapshot.docs.map((d) => d.data() as TopicQuiz);
      return ok(quizzes);
    } catch (error: any) {
      logError("TopicQuizService.getQuizzesByTopic", error);
      return fail("Failed to fetch topic quizzes.", error.code || error.message);
    }
  }

  async getPublishedQuizzesByTopic(topicId: string): Promise<Result<TopicQuiz[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.TOPIC_QUIZZES),
        where("topicId", "==", topicId),
        where("status", "==", QUIZ_STATUS.PUBLISHED)
      );
      const snapshot = await getDocs(q);
      const quizzes: TopicQuiz[] = snapshot.docs.map((d) => d.data() as TopicQuiz);
      return ok(quizzes);
    } catch (error: any) {
      logError("TopicQuizService.getPublishedQuizzesByTopic", error);
      return fail("Failed to fetch topic quizzes.", error.code || error.message);
    }
  }

  async getQuizzesByCourse(courseId: string): Promise<Result<TopicQuiz[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.TOPIC_QUIZZES),
        where("courseId", "==", courseId)
      );
      const snapshot = await getDocs(q);
      const quizzes: TopicQuiz[] = snapshot.docs.map((d) => d.data() as TopicQuiz);
      return ok(quizzes);
    } catch (error: any) {
      logError("TopicQuizService.getQuizzesByCourse", error);
      return fail("Failed to fetch topic quizzes.", error.code || error.message);
    }
  }

  async deleteTopicQuiz(quizId: string): Promise<Result<null>> {
    try {
      if (!quizId?.trim()) return fail("Invalid quiz ID");

      const quizRef = doc(db, COLLECTION.TOPIC_QUIZZES, quizId);
      await deleteDoc(quizRef);

      return ok(null);
    } catch (error: any) {
      logError("TopicQuizService.deleteTopicQuiz", error);
      return fail("Failed to delete topic quiz.", error.code || error.message);
    }
  }

  async createSubmission(
    quizId: string,
    userId: string,
    userName: string,
    userEmail: string,
    courseId: string,
    topicId: string
  ): Promise<Result<TopicQuizSubmission>> {
    try {
      if (!quizId || !userId) return fail("Missing quizId or userId", "invalid-input");

      const submissionId = `${quizId}_${userId}`;
      const submissionRef = doc(db, COLLECTION.TOPIC_QUIZ_SUBMISSIONS, submissionId);
      const snap = await getDoc(submissionRef);

      if (snap.exists()) {
        return ok(snap.data() as TopicQuizSubmission);
      }

      const newSubmission: TopicQuizSubmission = {
        id: submissionId,
        quizId,
        courseId,
        topicId,
        userId,
        userName,
        userEmail,
        startedAt: serverTimestamp(),
        lastSavedAt: serverTimestamp(),
        answers: [],
        status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
        xpAwarded: false,
      };

      await setDoc(submissionRef, newSubmission);

      return ok(newSubmission);
    } catch (error: any) {
      logError("TopicQuizService.createSubmission", error);
      return fail("Failed to create submission.", error.code || error.message);
    }
  }

  async saveSingleAnswer(
    quizId: string,
    userId: string,
    userName: string,
    userEmail: string,
    courseId: string,
    topicId: string,
    questionNo: number,
    answer: string | string[] | null,
    markedForReview: boolean
  ): Promise<Result<null>> {
    try {
      if (!quizId || !userId) return fail("Missing quizId or userId", "invalid-input");

      const quizRef = doc(db, COLLECTION.TOPIC_QUIZZES, quizId);
      const quizSnap = await getDoc(quizRef);
      if (!quizSnap.exists()) return fail("Quiz not found", "not-found");

      const quiz = quizSnap.data() as TopicQuiz;
      const question = quiz.questions.find((q) => q.questionNo === questionNo);
      if (!question) return fail("Question not found", "invalid-question");

      const submissionId = `${quizId}_${userId}`;
      const submissionRef = doc(db, COLLECTION.TOPIC_QUIZ_SUBMISSIONS, submissionId);
      const submissionSnap = await getDoc(submissionRef);

      let submission: TopicQuizSubmission;
      if (!submissionSnap.exists()) {
        submission = {
          id: submissionId,
          quizId,
          courseId,
          topicId,
          userId,
          userName,
          userEmail,
          startedAt: serverTimestamp(),
          lastSavedAt: serverTimestamp(),
          answers: [],
          status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
          xpAwarded: false,
        };
      } else {
        submission = submissionSnap.data() as TopicQuizSubmission;
        submission.answers = submission.answers ?? [];
      }

      const submittedAnswer: SubmittedAnswer = { questionNo, type: question.type, answer, markedForReview };
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
          courseId,
          topicId,
          userId,
          startedAt: submission.startedAt || serverTimestamp(),
          lastSavedAt: serverTimestamp(),
          answers: answersCopy,
          status: submission.status || QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
          xpAwarded: submission.xpAwarded ?? false,
        },
        { merge: true }
      );

      return ok(null);
    } catch (error: any) {
      logError("TopicQuizService.saveSingleAnswer", error);
      return fail("Failed to save answer.", error.code || error.message);
    }
  }

  async getSubmission(quizId: string, userId: string): Promise<Result<TopicQuizSubmission | null>> {
    try {
      if (!quizId || !userId) return fail("Missing quizId or userId", "invalid-input");

      const submissionId = `${quizId}_${userId}`;
      const submissionRef = doc(db, COLLECTION.TOPIC_QUIZ_SUBMISSIONS, submissionId);
      const snap = await getDoc(submissionRef);

      if (!snap.exists()) return ok(null);

      const submission = snap.data() as TopicQuizSubmission;
      submission.answers = submission.answers ?? [];
      return ok(submission);
    } catch (error: any) {
      logError("TopicQuizService.getSubmission", error);
      return fail("Failed to fetch submission.", error.code || error.message);
    }
  }

  async getAllSubmissionsForQuiz(quizId: string): Promise<Result<TopicQuizSubmission[]>> {
    try {
      if (!quizId?.trim()) return fail("Invalid quiz ID");

      const q = query(
        collection(db, COLLECTION.TOPIC_QUIZ_SUBMISSIONS),
        where("quizId", "==", quizId)
      );
      const snapshot = await getDocs(q);
      const submissions: TopicQuizSubmission[] = snapshot.docs.map((d) => d.data() as TopicQuizSubmission);
      return ok(submissions);
    } catch (error: any) {
      logError("TopicQuizService.getAllSubmissionsForQuiz", error);
      return fail("Failed to fetch submissions.", error.code || error.message);
    }
  }

  async deleteSubmission(submissionId: string): Promise<Result<null>> {
    try {
      const ref = doc(db, COLLECTION.TOPIC_QUIZ_SUBMISSIONS, submissionId);
      await deleteDoc(ref);
      return ok(null);
    } catch (error: any) {
      logError("TopicQuizService.deleteSubmission", error);
      return fail("Failed to delete submission.", error.code || error.message);
    }
  }

  async submitTopicQuiz(
    quizId: string,
    userId: string,
    userName: string,
    userEmail: string,
    answers: Record<number, { selectedOptions: string[]; markedForReview: boolean }>
  ): Promise<Result<TopicQuizSubmission>> {
    try {
      if (!quizId || !userId) return fail("Missing quizId or userId", "invalid-input");

      const quizRef = doc(db, COLLECTION.TOPIC_QUIZZES, quizId);
      const quizSnap = await getDoc(quizRef);
      if (!quizSnap.exists()) return fail("Quiz not found", "not-found");

      const quiz = quizSnap.data() as TopicQuiz;

      const submissionId = `${quizId}_${userId}`;
      const submissionRef = doc(db, COLLECTION.TOPIC_QUIZ_SUBMISSIONS, submissionId);
      const submissionSnap = await getDoc(submissionRef);

      // If already submitted, return existing submission (idempotency)
      if (submissionSnap.exists()) {
        const existing = submissionSnap.data() as TopicQuizSubmission;
        if (existing.status === QUIZ_SUBMISSION_STATUS.SUBMITTED) {
          return ok(existing);
        }
      }

      let submission: TopicQuizSubmission;
      if (!submissionSnap.exists()) {
        submission = {
          id: submissionId,
          quizId,
          courseId: quiz.courseId,
          topicId: quiz.topicId,
          userId,
          userName,
          userEmail,
          startedAt: serverTimestamp(),
          lastSavedAt: serverTimestamp(),
          answers: [],
          status: QUIZ_SUBMISSION_STATUS.IN_PROGRESS,
          xpAwarded: false,
        };
      } else {
        submission = submissionSnap.data() as TopicQuizSubmission;
      }

      // Evaluate answers
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
            if (userAnswer === correctAnswer) obtainedMarks = fullMarks;
          }
        }

        totalScore += obtainedMarks;
        return { ...ans, obtainedMarks, isCorrect: obtainedMarks === fullMarks };
      });

      const passingPercentage = quiz.passingPercentage ?? 0;
      const passed =
        quiz.totalMarks > 0 ? (totalScore / quiz.totalMarks) * 100 >= passingPercentage : false;

      // Award XP/karma — fire-and-forget, idempotent (only if not already awarded)
      const alreadyAwarded = submissionSnap.exists()
        ? (submissionSnap.data() as TopicQuizSubmission).xpAwarded
        : false;

      if (!alreadyAwarded) {
        try {
          const idToken = await authService.getToken();
          this.triggerKarma(passingPercentage, quiz.totalMarks, totalScore, userId, quiz.courseId, idToken, userName);
        } catch (err) {
          console.error("[TopicQuizKarma] Failed to trigger karma:", err);
        }
      }

      const finalSubmission: TopicQuizSubmission = {
        ...submission,
        answers: evaluatedAnswers,
        totalScore,
        passed,
        status: QUIZ_SUBMISSION_STATUS.SUBMITTED,
        submittedAt: serverTimestamp(),
        lastSavedAt: serverTimestamp(),
        xpAwarded: !alreadyAwarded ? true : submission.xpAwarded,
      };

      await setDoc(submissionRef, finalSubmission, { merge: true });

      return ok(finalSubmission);
    } catch (error: any) {
      logError("TopicQuizService.submitTopicQuiz", error);
      return fail("Failed to submit quiz.", error.code || error.message);
    }
  }

  private triggerKarma(
    passingPercentage: number,
    totalMarks: number,
    userScore: number,
    userId: string,
    courseId: string,
    idToken: string,
    userName: string
  ) {
    if (!totalMarks || totalMarks <= 0) return;

    const percentage = (userScore / totalMarks) * 100;
    let action: string;

    if (percentage > 90) {
      action = LEARNING_ACTION.QUIZ_GRADE_90_PLUS;
    } else if (percentage >= passingPercentage) {
      action = LEARNING_ACTION.QUIZ_GRADE_PASS;
    } else {
      action = LEARNING_ACTION.QUIZ_GRADE_FAIL;
    }

    fetch(`${BACKEND_URL}/addKarma`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        userId,
        category: KARMA_CATEGORY.LEARNING,
        action,
        courseId,
        userName,
      }),
    }).catch((err) => {
      console.error("[TopicQuizKarma] Failed to add karma:", err);
    });
  }

  private calculateTotalMarks(questions: Question[]): number {
    return questions.reduce((sum, q) => sum + (q.marks ?? 0), 0);
  }
}

export const topicQuizService = new TopicQuizService();

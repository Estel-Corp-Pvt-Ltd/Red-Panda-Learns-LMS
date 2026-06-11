import ConfirmDialog from "@/components/ConfirmDialog";
import { QUIZ_QUESTION_TYPE, QUIZ_STATUS, QUIZ_SUBMISSION_STATUS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { topicQuizService } from "@/services/topicQuizService";
import { Question, TopicQuiz, TopicQuizSubmission } from "@/types/quiz";
import { Flag, ChevronLeft, ChevronRight, RotateCcw, Bookmark, Clock } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

const AttemptTopicQuiz = () => {
  const { param, quizId } = useParams<{ param: string; quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<TopicQuiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQ, setActiveQ] = useState<number>(1);
  const [answers, setAnswers] = useState<{
    [key: number]: { selectedOptions: string[]; markedForReview: boolean };
  }>({});

  const [loading, setLoading] = useState(true);
  const [openSubmissionModal, setOpenSubmissionModal] = useState(false);
  const [openEndModal, setOpenEndModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<TopicQuizSubmission | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmitted = useRef(false);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submitQuiz = useCallback(
    async (answersToSubmit?: typeof answers) => {
      const currentAnswers = answersToSubmit ?? answersRef.current;
      if (isSubmitting) return { success: false };

      setIsSubmitting(true);
      try {
        const userName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");

        const response = await topicQuizService.submitTopicQuiz(
          quizId!,
          user.id,
          userName,
          user.email,
          currentAnswers
        );

        if (response.success) {
          setSubmission(response.data);
          toast({ title: "Quiz submitted successfully" });
        } else {
          toast({ title: "Submission failed", variant: "destructive" });
        }

        return response;
      } catch (error) {
        toast({
          title: "Submission error",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        return { success: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    [quizId, user, isSubmitting]
  );

  const handleTimeOver = useCallback(async () => {
    if (hasAutoSubmitted.current) return;
    hasAutoSubmitted.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    toast({ title: "⏰ Time Over!", description: "Your quiz is being submitted automatically...", variant: "destructive" });

    const res = await submitQuiz(answersRef.current);
    if (res?.success) {
      setOpenSubmissionModal(true);
    } else {
      toast({ title: "Auto submission failed. Please try submitting manually.", variant: "destructive" });
      hasAutoSubmitted.current = false;
    }
  }, [submitQuiz]);

  const handleTimeOverRef = useRef(handleTimeOver);
  useEffect(() => {
    handleTimeOverRef.current = handleTimeOver;
  }, [handleTimeOver]);

  const startTimer = useCallback((initialTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(initialTime);

    if (initialTime <= 0) {
      handleTimeOverRef.current();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setTimeout(() => handleTimeOverRef.current(), 0);
          return 0;
        }
        const newTime = prev - 1;
        if (newTime === 60) toast({ title: "⚠️ 1 minute remaining!", variant: "destructive" });
        if (newTime === 30) toast({ title: "⚠️ 30 seconds remaining!", variant: "destructive" });
        return newTime;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!quizId || !user?.id) return;

      // Fetch quiz
      const quizRes = await topicQuizService.getTopicQuizById(quizId);
      if (!quizRes.success || !quizRes.data) {
        toast({ title: "Quiz not found.", variant: "destructive" });
        navigate(-1);
        return;
      }

      const q = quizRes.data;

      // Only published quizzes accessible to students
      if (q.status !== QUIZ_STATUS.PUBLISHED) {
        toast({ title: "This quiz is not available.", variant: "destructive" });
        navigate(-1);
        return;
      }

      setQuiz(q);
      setQuestions(q.questions);

      const userName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");

      // Create or resume submission
      await topicQuizService.createSubmission(quizId, user.id, userName, user.email, q.courseId, q.topicId);

      // Populate existing answers
      const subRes = await topicQuizService.getSubmission(quizId, user.id);
      if (subRes.success && subRes.data) {
        const existing = subRes.data;

        // If already submitted, show result directly
        if (existing.status === QUIZ_SUBMISSION_STATUS.SUBMITTED) {
          setSubmission(existing);
          setOpenSubmissionModal(true);
          setLoading(false);
          return;
        }

        const populated: typeof answers = {};
        existing.answers.forEach((ans) => {
          populated[ans.questionNo] = {
            selectedOptions: Array.isArray(ans.answer) ? ans.answer : ans.answer ? [ans.answer] : [],
            markedForReview: ans.markedForReview ?? false,
          };
        });
        setAnswers(populated);
        answersRef.current = populated;
      }

      // Start timer (local only for topic quizzes)
      startTimer(q.durationMinutes * 60);
      setLoading(false);
    };

    init();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleOptionChange = async (qNo: number, option: string, type: string) => {
    const existing = answers[qNo] || { selectedOptions: [], markedForReview: false };
    let updated: string[] = [];

    if (type === QUIZ_QUESTION_TYPE.MCQ || type === QUIZ_QUESTION_TYPE.FILL_BLANK) {
      updated = [option];
    } else {
      updated = existing.selectedOptions.includes(option)
        ? existing.selectedOptions.filter((o) => o !== option)
        : [...existing.selectedOptions, option];
    }

    const newAnswers = {
      ...answers,
      [qNo]: { selectedOptions: updated, markedForReview: existing.markedForReview },
    };
    setAnswers(newAnswers);
    answersRef.current = newAnswers;

    if (!quiz) return;
    const userName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
    const answerVal = type === QUIZ_QUESTION_TYPE.MCQ || type === QUIZ_QUESTION_TYPE.FILL_BLANK
      ? option
      : updated.length > 0 ? updated : null;

    await topicQuizService.saveSingleAnswer(
      quizId!,
      user.id,
      userName,
      user.email,
      quiz.courseId,
      quiz.topicId,
      qNo,
      answerVal,
      existing.markedForReview
    );
  };

  const resetAnswer = async (qNo: number) => {
    const existing = answers[qNo] || { selectedOptions: [], markedForReview: false };
    const newAnswers = { ...answers, [qNo]: { ...existing, selectedOptions: [] } };
    setAnswers(newAnswers);
    answersRef.current = newAnswers;

    if (!quiz) return;
    const userName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
    await topicQuizService.saveSingleAnswer(
      quizId!,
      user.id,
      userName,
      user.email,
      quiz.courseId,
      quiz.topicId,
      qNo,
      null,
      existing.markedForReview
    );
  };

  const toggleReview = (qNo: number) => {
    const existing = answers[qNo] || { selectedOptions: [], markedForReview: false };
    const newAnswers = { ...answers, [qNo]: { ...existing, markedForReview: !existing.markedForReview } };
    setAnswers(newAnswers);
    answersRef.current = newAnswers;
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions.find((q) => q.questionNo === activeQ);
  const currentAnswer = answers[activeQ] || { selectedOptions: [], markedForReview: false };
  const attemptedCount = Object.values(answers).filter((a) => a.selectedOptions.length > 0).length;
  const reviewCount = Object.values(answers).filter((a) => a.markedForReview).length;

  const goBack = () => navigate(-1);

  // ── Result View ─────────────────────────────────────────────────────────────
  if (submission?.status === QUIZ_SUBMISSION_STATUS.SUBMITTED && openSubmissionModal) {
    const percentage = quiz?.totalMarks
      ? Math.round((submission.totalScore! / quiz.totalMarks) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className={`text-6xl ${submission.passed ? "text-green-500" : "text-red-500"}`}>
            {submission.passed ? "🎉" : "📝"}
          </div>
          <h1 className="text-2xl font-bold">
            {submission.passed ? "Congratulations!" : "Better luck next time!"}
          </h1>
          <div className="p-6 rounded-2xl border bg-card space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Score</span>
              <span className="font-semibold">
                {submission.totalScore ?? 0} / {quiz?.totalMarks ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Percentage</span>
              <span className="font-semibold">{percentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Result</span>
              <span className={`font-bold ${submission.passed ? "text-green-600" : "text-red-600"}`}>
                {submission.passed ? "PASS" : "FAIL"}
              </span>
            </div>
            {(quiz?.xpReward ?? 0) > 0 && submission.passed && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">XP Reward</span>
                <span className="font-semibold text-yellow-600">+{quiz!.xpReward} XP</span>
              </div>
            )}
          </div>
          <button
            onClick={goBack}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-accent transition"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="text-4xl animate-bounce inline-block">🐼</span>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                {quiz?.title || "Quiz"}
              </h1>
              {quiz?.description && (
                <p className="text-sm text-slate-500 truncate hidden sm:block">{quiz.description}</p>
              )}
            </div>

            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-mono font-bold text-lg ${
                timeLeft === null
                  ? "bg-slate-50 text-slate-600 border-slate-200"
                  : timeLeft <= 30
                  ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                  : timeLeft <= 60
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200"
              }`}
            >
              <Clock size={20} />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={() => setOpenEndModal(true)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-accent active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flag size={16} />
              <span className="hidden sm:inline">Submit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className={`flex gap-6 ${quiz?.enableFreeNavigation ? "flex-row" : "flex-col"}`}>

          {/* Sidebar navigation */}
          {quiz?.enableFreeNavigation && (
            <aside className="w-64 shrink-0">
              <div className="sticky top-24 bg-slate-50 border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-1 text-[11px] text-center">
                  <div className="bg-green-100 text-green-700 rounded p-1.5">
                    <div className="font-bold">{attemptedCount}</div>
                    <div>Done</div>
                  </div>
                  <div className="bg-yellow-100 text-yellow-700 rounded p-1.5">
                    <div className="font-bold">{reviewCount}</div>
                    <div>Review</div>
                  </div>
                  <div className="bg-slate-100 text-slate-600 rounded p-1.5">
                    <div className="font-bold">{questions.length - attemptedCount}</div>
                    <div>Left</div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q) => {
                    const ans = answers[q.questionNo];
                    const attempted = (ans?.selectedOptions?.length ?? 0) > 0;
                    const forReview = ans?.markedForReview;
                    const isActive = q.questionNo === activeQ;

                    return (
                      <button
                        key={q.questionNo}
                        onClick={() => setActiveQ(q.questionNo)}
                        className={`h-8 w-8 text-xs font-medium rounded-lg transition-all ${
                          isActive
                            ? "bg-primary text-white shadow-md scale-105"
                            : forReview
                            ? "bg-yellow-400 text-white"
                            : attempted
                            ? "bg-green-500 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-primary/50"
                        }`}
                      >
                        {q.questionNo}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}

          {/* Question area */}
          <div className="flex-1 min-w-0">
            {currentQuestion ? (
              <div className="space-y-6">
                {/* Question card */}
                <div className="bg-white border rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Question {activeQ} of {questions.length}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-1 rounded-full">
                      {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <p className="text-base font-medium mb-4">{currentQuestion.description}</p>

                  {currentQuestion.attachments?.map((src, i) => (
                    <img key={i} src={src} className="mb-3 max-h-48 rounded-lg object-contain" alt="" />
                  ))}

                  {/* Options */}
                  {currentQuestion.type !== QUIZ_QUESTION_TYPE.FILL_BLANK ? (
                    <div className="space-y-2.5">
                      {currentQuestion.options.map((opt, i) => {
                        const selected = currentAnswer.selectedOptions.includes(opt);
                        return (
                          <button
                            key={i}
                            onClick={() => handleOptionChange(activeQ, opt, currentQuestion.type)}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                              selected
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <span className="font-mono text-xs text-muted-foreground mr-3">
                              {String.fromCharCode(65 + i)}.
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                      placeholder="Type your answer..."
                      value={currentAnswer.selectedOptions[0] ?? ""}
                      onChange={(e) => handleOptionChange(activeQ, e.target.value, currentQuestion.type)}
                    />
                  )}
                </div>

                {/* Action row */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => resetAnswer(activeQ)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border hover:bg-slate-50 text-slate-600"
                    >
                      <RotateCcw size={13} /> Clear
                    </button>
                    <button
                      onClick={() => toggleReview(activeQ)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        currentAnswer.markedForReview
                          ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                          : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Bookmark size={13} />
                      {currentAnswer.markedForReview ? "Marked" : "Mark"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveQ((p) => Math.max(1, p - 1))}
                      disabled={activeQ === 1}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button
                      onClick={() => setActiveQ((p) => Math.min(questions.length, p + 1))}
                      disabled={activeQ === questions.length}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-slate-50"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">No questions found.</div>
            )}
          </div>
        </div>
      </main>

      {/* Confirm submit dialog */}
      <ConfirmDialog
        open={openEndModal}
        title="Submit Quiz"
        body={`You have answered ${attemptedCount} of ${questions.length} question(s). Submit now?`}
        onCancel={() => setOpenEndModal(false)}
        onConfirm={async () => {
          setOpenEndModal(false);
          const res = await submitQuiz();
          if (res?.success) setOpenSubmissionModal(true);
        }}
      />
    </div>
  );
};

export default AttemptTopicQuiz;

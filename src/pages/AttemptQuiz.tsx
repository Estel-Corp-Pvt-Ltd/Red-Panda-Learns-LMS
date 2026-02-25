import ConfirmDialog from "@/components/ConfirmDialog";
import { QUIZ_QUESTION_TYPE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { quizService } from "@/services/quizService";
import { Question, Quiz } from "@/types/quiz";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Flag, ChevronLeft, ChevronRight, RotateCcw, Bookmark, Clock } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

const AttemptQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const functions = getFunctions();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [activeQ, setActiveQ] = useState<number>(1);
    const [answers, setAnswers] = useState<{
        [key: number]: { selectedOptions: string[]; markedForReview: boolean };
    }>({});

    const [loading, setLoading] = useState(true);
    const [openSubmissionModal, setOpenSubmissionModal] = useState(false);
    const [openEndModal, setOpenEndModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const hasAutoSubmitted = useRef(false);
    const answersRef = useRef(answers);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    const submitQuiz = useCallback(async (answersToSubmit?: typeof answers) => {
        const currentAnswers = answersToSubmit ?? answersRef.current;

        if (isSubmitting) return { success: false };

        setIsSubmitting(true);

        try {
            const userName = [user.firstName, user.middleName, user.lastName]
                .filter(Boolean)
                .join(" ");

            const response = await quizService.submitQuiz(
                quizId,
                user.id,
                userName,
                user.email,
                currentAnswers
            );

            if (response.success) {
                toast({
                    title: "Quiz submitted successfully",
                    variant: "default"
                });
            } else {
                toast({
                    title: "Submission failed",
                    variant: "destructive"
                });
            }

            return response;
        } catch (error) {
            toast({
                title: "Submission error",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
            return { success: false };
        } finally {
            setIsSubmitting(false);
        }
    }, [quizId, user, isSubmitting]);

    const handleTimeOver = useCallback(async () => {
        if (hasAutoSubmitted.current) return;

        hasAutoSubmitted.current = true;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        toast({
            title: "⏰ Time Over!",
            description: "Your quiz is being submitted automatically...",
            variant: "destructive"
        });

        const res = await submitQuiz(answersRef.current);

        if (res?.success) {
            setTimeout(() => navigate("/quizzes"), 1000);
        } else {
            toast({
                title: "Auto submission failed",
                description: "Please try submitting manually",
                variant: "destructive"
            });
            hasAutoSubmitted.current = false;
        }
    }, [navigate, submitQuiz]);

    const fetchSubmissionAndPopulateAnswers = async () => {
        if (!quizId || !user?.id) return;

        const res = await quizService.getSubmission(quizId, user.id);
        if (!res.success || !res.data) return;

        const populatedAnswers: typeof answers = {};
        res.data.answers.forEach(ans => {
            populatedAnswers[ans.questionNo] = {
                selectedOptions: Array.isArray(ans.answer)
                    ? ans.answer
                    : ans.answer ? [ans.answer] : [],
                markedForReview: ans.markedForReview ?? false
            };
        });

        setAnswers(populatedAnswers);
        answersRef.current = populatedAnswers;
    };

    const getServerTimeLeft = async (): Promise<number | null> => {
        try {
            // const getQuizTimeLeft = httpsCallable(getFunctions(), "getQuizTimeLeft");
            // const result = await getQuizTimeLeft({ quizId });
            // const data = result.data as { success: boolean; timeLeftSeconds?: number };
            //
            // if (data.success && data.timeLeftSeconds !== undefined) {
            //     return data.timeLeftSeconds;
            // }
            // return null;
            console.warn("getQuizTimeLeft cloud function call is disabled");
            return null;
        } catch {
            return null;
        }
    };

    const canTakeQuiz = async () => {
        try {
            const allowedResp = await quizService.isUserAllowedToTakeQuiz(quizId!, user.id);

            if (!allowedResp.data.allowed) {
                navigate("/quizzes");
                return false;
            }

            // const canStartQuizFn = httpsCallable(functions, "canStartQuiz");
            // const result = await canStartQuizFn({ quizId });
            // const data = result.data as { success: boolean; message: string };
            //
            // if (!data.success) {
            //     toast({
            //         title: "Cannot start quiz now",
            //         description: data.message,
            //         variant: "destructive",
            //     });
            //     navigate("/quizzes");
            //     return false;
            // }
            console.warn("canStartQuiz cloud function call is disabled");

            return true;
        } catch {
            navigate("/quizzes");
            return false;
        }
    };

    const fetchQuizAndSetQuestions = async () => {
        const response = await quizService.getQuizById(quizId!);

        if (!response.data) {
            toast({ title: "Could not fetch quiz. Contact Instructor." });
            navigate("/quizzes");
            return;
        }

        setQuiz(response.data);
        setQuestions(response.data.questions);
    };

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
            setTimeLeft(prev => {
                if (prev === null) return null;

                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    timerRef.current = null;
                    setTimeout(() => handleTimeOverRef.current(), 0);
                    return 0;
                }

                const newTime = prev - 1;

                if (newTime === 60) {
                    toast({ title: "⚠️ 1 minute remaining!", variant: "destructive" });
                }

                if (newTime === 30) {
                    toast({ title: "⚠️ 30 seconds remaining!", variant: "destructive" });
                }

                return newTime;
            });
        }, 1000);
    }, []);

    const handleOptionChange = async (qNo: number, option: string, type: string) => {
        const existing = answers[qNo] || { selectedOptions: [], markedForReview: false };

        let updated: string[] = [];

        if (type === QUIZ_QUESTION_TYPE.MCQ || type === QUIZ_QUESTION_TYPE.FILL_BLANK) {
            updated = [option];
        } else {
            updated = existing.selectedOptions.includes(option)
                ? existing.selectedOptions.filter(o => o !== option)
                : [...existing.selectedOptions, option];
        }

        const newAnswers = {
            ...answers,
            [qNo]: { selectedOptions: updated, markedForReview: existing.markedForReview }
        };

        setAnswers(newAnswers);
        answersRef.current = newAnswers;

        const updatedAnswerValue = (() => {
            if (type === QUIZ_QUESTION_TYPE.MCQ || type === QUIZ_QUESTION_TYPE.FILL_BLANK) {
                return option;
            }
            return updated.length > 0 ? updated : null;
        })();

        const userName = [user.firstName, user.middleName, user.lastName]
            .filter(Boolean)
            .join(" ");

        const res = await quizService.saveSingleAnswer(
            quizId!,
            user.id,
            userName,
            user.email,
            qNo,
            updatedAnswerValue,
            existing.markedForReview
        );

        if (!res.success) {
            toast({
                title: "Save failed",
                description: "Could not save answer. Try again.",
                variant: "destructive"
            });
        }
    };

    const resetAnswer = async (qNo: number) => {
        const existing = answers[qNo] || { selectedOptions: [], markedForReview: false };

        const newAnswers = {
            ...answers,
            [qNo]: { ...existing, selectedOptions: [] }
        };

        setAnswers(newAnswers);
        answersRef.current = newAnswers;

        const userName = [user.firstName, user.middleName, user.lastName]
            .filter(Boolean)
            .join(" ");

        await quizService.saveSingleAnswer(
            quizId!,
            user.id,
            userName,
            user.email,
            qNo,
            null,
            existing.markedForReview
        );
    };

    const toggleReview = async (qNo: number) => {
        const existing = answers[qNo] || { selectedOptions: [], markedForReview: false };

        const newAnswers = {
            ...answers,
            [qNo]: { ...existing, markedForReview: !existing.markedForReview }
        };

        setAnswers(newAnswers);
        answersRef.current = newAnswers;

        await quizService.markAnswerForReview(quizId, user.id, qNo, !existing.markedForReview);
    };

    useEffect(() => {
        const init = async () => {
            const canStart = await canTakeQuiz();
            if (!canStart) return;

            await fetchQuizAndSetQuestions();

            const userName = [user.firstName, user.middleName, user.lastName]
                .filter(Boolean)
                .join(" ");

            if (quizId && user?.id) {
                await quizService.createSubmission(quizId, user.id, userName, user.email);
                await fetchSubmissionAndPopulateAnswers();
            }

            const serverTime = await getServerTimeLeft();

            if (serverTime !== null && serverTime !== undefined) {
                if (serverTime <= 0) {
                    toast({
                        title: "Quiz Expired",
                        description: "This quiz has already ended.",
                        variant: "destructive"
                    });
                    navigate("/quizzes");
                    return;
                }
                startTimer(serverTime);
            } else {
                toast({
                    title: "Warning",
                    description: "Could not sync time with server",
                    variant: "destructive"
                });
            }

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

    useEffect(() => {
        if (!quizId || loading) return;

        const poll = async () => {
            try {
                const serverTime = await getServerTimeLeft();

                if (serverTime === null || serverTime === undefined) return;

                if (serverTime <= 0) {
                    handleTimeOverRef.current();
                    return;
                }

                setTimeLeft(prev => {
                    if (prev === null) return serverTime;
                    const diff = Math.abs(prev - serverTime);
                    return diff > 5 ? serverTime : prev;
                });
            } catch {
                // Silent fail for polling
            }
        };

        const interval = setInterval(poll, 180_000);
        return () => clearInterval(interval);
    }, [quizId, loading]);

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    const getTimeStyles = () => {
        if (timeLeft === null) return "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200";
        if (timeLeft <= 30) return "bg-red-500/10 text-red-600 border-red-200 animate-pulse";
        if (timeLeft <= 60) return "bg-amber-500/10 text-amber-600 border-amber-200";
        return "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200";
    };

    const currentQuestion = questions.find(q => q.questionNo === activeQ);
    const currentAnswer = answers[activeQ] || { selectedOptions: [], markedForReview: false };

    // Stats for header
    const attemptedCount = Object.values(answers).filter(a => a.selectedOptions.length > 0).length;
    const reviewCount = Object.values(answers).filter(a => a.markedForReview).length;

  return (
    <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Quiz Title */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                            {quiz?.title || "Loading..."}
                        </h1>
                        {quiz?.description && (
                            <p className="text-sm text-slate-500 truncate hidden sm:block">
                                {quiz.description}
                            </p>
                        )}
                    </div>

                    {/* Timer */}
                    <div className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg border font-mono font-bold text-lg
                        ${timeLeft === null 
                            ? "bg-slate-50 text-slate-600 border-slate-200" 
                            : timeLeft <= 30 
                                ? "bg-red-50 text-red-600 border-red-200 animate-pulse" 
                                : timeLeft <= 60 
                                    ? "bg-primary text-amber-600 border-amber-200" 
                                    : "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200"
                        }
                    `}>
                        <Clock size={20} />
                        <span>{formatTime(timeLeft)}</span>
                    </div>

                    {/* End Quiz Button */}
                    <button
                        onClick={() => setOpenEndModal(true)}
                        disabled={isSubmitting}
                        className="
                            flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                            bg-primary text-white hover:bg-accent
                            active:scale-95 transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        <Flag size={16} />
                        <span className="hidden sm:inline">End Quiz</span>
                    </button>
                </div>
            </div>
        </header>

        {loading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-slate-200 border-t-fuchsia-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Loading Quiz...</p>
                </div>
            </div>
        ) : !quiz ? (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-slate-400 text-lg">Quiz unavailable</p>
                </div>
            </div>
        ) : (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar - Question Navigator */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="lg:sticky lg:top-20 space-y-4">
                            {/* Stats Card */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                    Progress
                                </h3>
                                <div className="flex justify-between gap-2">
                                    <div className="text-center flex-1">
                                        <div className="text-2xl font-bold text-slate-700">{questions.length}</div>
                                        <div className="text-xs text-slate-500">Total</div>
                                    </div>
                                    <div className="w-px bg-slate-200" />
                                    <div className="text-center flex-1">
                                        <div className="text-2xl font-bold text-emerald-600">{attemptedCount}</div>
                                        <div className="text-xs text-slate-500">Done</div>
                                    </div>
                                    <div className="w-px bg-slate-200" />
                                    <div className="text-center flex-1">
                                        <div className="text-2xl font-bold text-amber-500">{reviewCount}</div>
                                        <div className="text-xs text-slate-500">Marked For Review</div>
                                    </div>
                                </div>
                            </div>

                            {/* Question Grid */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                    Questions
                                </h3>
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map(q => {
                                        const ans = answers[q.questionNo];
                                        const attempted = ans && ans.selectedOptions.length > 0;
                                        const review = ans && ans.markedForReview;
                                        const isActive = activeQ === q.questionNo;

                                        let styles = "bg-white border-slate-200 text-slate-600 hover:border-slate-300";
                                        if (attempted && !review) styles = "bg-emerald-500 border-emerald-500 text-white";
                                        if (review) styles = "bg-amber-400 border-amber-400 text-white";

                                        return (
                                            <button
                                                key={q.questionNo}
                                                onClick={() => setActiveQ(q.questionNo)}
                                                className={`
                                                    aspect-square rounded-lg flex items-center justify-center
                                                    text-sm font-medium border transition-all duration-150
                                                    ${styles}
                                                    ${isActive ? "ring-2 ring-fuchsia-500 ring-offset-1" : ""}
                                                `}
                                            >
                                                {q.questionNo}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <div className="w-3 h-3 rounded border border-slate-200 bg-white" />
                                        <span>Unanswered</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <div className="w-3 h-3 rounded bg-emerald-500" />
                                        <span>Answered</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <div className="w-3 h-3 rounded bg-amber-400" />
                                        <span>Marked For Review</span>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button - Desktop */}
                            <button
                                onClick={() => setOpenSubmissionModal(true)}
                                disabled={isSubmitting}
                                className="
                                    hidden lg:flex w-full items-center justify-center gap-2
                                    px-5 py-3 rounded-lg text-sm font-semibold
                                    bg-primary text-white hover:bg-accent
                                    active:scale-[0.98] transition-all duration-150
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                "
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Quiz"
                                )}
                            </button>
                        </div>
                    </aside>

                    {/* Main Content - Question */}
                    <main className="flex-1 min-w-0">
                        {currentQuestion && (
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                {/* Question Header */}
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-medium text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded">
                                                    Q{currentQuestion.questionNo}/{questions.length}
                                                </span>
                                                {currentQuestion.type !== QUIZ_QUESTION_TYPE.MCQ && (
                                                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                        {currentQuestion.type === QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER 
                                                            ? "Multiple Select" 
                                                            : "Fill in the Blank"
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
                                                {currentQuestion.description}
                                            </h2>
                                        </div>
                                        {currentAnswer.markedForReview && (
                                            <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                                                <Bookmark size={12} />
                                              Marked for Review
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Attachments */}
                                {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                                    <div className="px-6 py-4 border-b border-slate-100">
                                        <div className="flex flex-wrap gap-3">
                                            {currentQuestion.attachments.map((url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    alt={`Attachment ${idx + 1}`}
                                                    className="max-w-xs h-auto rounded-lg border border-slate-200"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Options */}
                                <div className="p-6">
                                    {(currentQuestion.type === QUIZ_QUESTION_TYPE.MCQ ||
                                        currentQuestion.type === QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER) && (
                                        <div className="space-y-2">
                                            {currentQuestion.options.map((opt, idx) => {
                                                const isSelected = currentAnswer.selectedOptions.includes(opt);
                                                return (
                                                    <label
                                                        key={idx}
                                                        className={`
                                                            flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer
                                                            transition-all duration-150
                                                            ${isSelected
                                                                ? "border-fuchsia-500 bg-fuchsia-50"
                                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                                            }
                                                        `}
                                                    >
                                                        <input
                                                            type={currentQuestion.type === "MCQ" ? "radio" : "checkbox"}
                                                            checked={isSelected}
                                                            onChange={() => handleOptionChange(currentQuestion.questionNo, opt, currentQuestion.type)}
                                                            className="w-4 h-4 text-fuchsia-600 border-slate-300 focus:ring-fuchsia-500"
                                                        />
                                                        <span className={`text-sm ${isSelected ? "text-fuchsia-900 font-medium" : "text-slate-700"}`}>
                                                            {opt}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {currentQuestion.type === QUIZ_QUESTION_TYPE.FILL_BLANK && (
                                        <input
                                            type="text"
                                            value={currentAnswer.selectedOptions[0] || ""}
                                            onChange={(e) => handleOptionChange(currentQuestion.questionNo, e.target.value, currentQuestion.type)}
                                            placeholder="Type your answer..."
                                            className="
                                                w-full px-4 py-3 rounded-lg border border-slate-200
                                                focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20
                                                outline-none transition-all duration-150
                                                text-slate-800 placeholder:text-slate-400
                                            "
                                        />
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex gap-2">
                                            <button
                                                disabled={currentAnswer.selectedOptions.length === 0}
                                                onClick={() => resetAnswer(currentQuestion.questionNo)}
                                                className={`
                                                    flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                                                    border transition-all duration-150
                                                    ${currentAnswer.selectedOptions.length === 0
                                                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                                                        : "border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                                                    }
                                                `}
                                            >
                                                <RotateCcw size={14} />
                                                Clear
                                            </button>

                                            <button
                                                onClick={() => toggleReview(currentQuestion.questionNo)}
                                                className={`
                                                    flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                                                    border transition-all duration-150
                                                    ${currentAnswer.markedForReview
                                                        ? "border-amber-300 bg-amber-50 text-amber-700"
                                                        : "border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                                                    }
                                                `}
                                            >
                                                <Bookmark size={14} />
                                                {currentAnswer.markedForReview ? "Marked" : "Mark for Review"}
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                disabled={activeQ === 1}
                                                onClick={() => setActiveQ(prev => prev - 1)}
                                                className={`
                                                    flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
                                                    border transition-all duration-150
                                                    ${activeQ === 1
                                                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                                                        : "border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                                                    }
                                                `}
                                            >
                                                <ChevronLeft size={16} />
                                                Prev
                                            </button>

                                            <button
                                                disabled={activeQ === questions.length}
                                                onClick={() => setActiveQ(prev => prev + 1)}
                                                className={`
                                                    flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium
                                                    transition-all duration-150
                                                    ${activeQ === questions.length
                                                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                                        : "bg-cyan-600 text-white hover:bg-cyan-700"
                                                    }
                                                `}
                                            >
                                                Next
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submit Button - Mobile */}
                        <div className="lg:hidden mt-6">
                            <button
                                onClick={() => setOpenSubmissionModal(true)}
                                disabled={isSubmitting}
                                className="
                                    w-full flex items-center justify-center gap-2
                                    px-5 py-3.5 rounded-lg text-sm font-semibold
                                    bg-cyan-600 text-white hover:bg-cyan-700
                                    active:scale-[0.98] transition-all duration-150
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                "
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Quiz"
                                )}
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        )}

        {/* Dialogs */}
        <ConfirmDialog
            open={openSubmissionModal}
            onCancel={() => setOpenSubmissionModal(false)}
            onConfirm={async () => {
                await submitQuiz();
                navigate("/quizzes");
            }}
            title="Submit Quiz"
            body="Are you sure you want to submit? You won't be able to change your answers after submission."
            confirmText="Submit"
            cancelText="Cancel"
            variant="default"
            dismissible
        />

        <ConfirmDialog
            open={openEndModal}
            onCancel={() => setOpenEndModal(false)}
            onConfirm={async () => {
                await submitQuiz();
                navigate("/quizzes");
            }}
            title="End Quiz"
            body="Are you sure you want to end the quiz? This will submit all your current answers."
            confirmText="End & Submit"
            cancelText="Cancel"
            variant="danger"
            dismissible
        />
    </div>
);
};

export default AttemptQuiz;
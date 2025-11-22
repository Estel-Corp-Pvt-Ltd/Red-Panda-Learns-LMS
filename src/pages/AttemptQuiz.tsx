import ConfirmDialog from "@/components/ConfirmDialog";
import { QUIZ_QUESTION_TYPE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { quizService } from "@/services/quizService";
import { Question, Quiz } from "@/types/quiz";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const submitQuiz = async () => {
        const userName = [user.firstName, user.middleName, user.lastName]
            .filter(Boolean) // removes undefined, null, empty string
            .join(" ");
        const response = await quizService.submitQuiz(quizId, user.id, userName, user.email, answers);

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
    };

    const fetchSubmissionAndPopulateAnswers = async () => {
        if (!quizId || !user?.id) return;

        const res = await quizService.getSubmission(quizId, user.id);
        if (!res.success || !res.data) return;

        const submission = res.data;

        const populatedAnswers: typeof answers = {};
        submission.answers.forEach(ans => {
            populatedAnswers[ans.questionNo] = {
                selectedOptions: Array.isArray(ans.answer)
                    ? ans.answer
                    : ans.answer
                        ? [ans.answer]
                        : [],
                markedForReview: ans.markedForReview ?? false
            };
        });

        setAnswers(populatedAnswers);
    };

    const getServerTimeLeft = async () => {
        const functions = getFunctions();
        const getQuizTimeLeft = httpsCallable(functions, "getQuizTimeLeft");
        const result = await getQuizTimeLeft({ quizId });
        const data = result.data as { success: boolean, message?: string, timeLeftSeconds?: number };
        if (data.success) {
            return data.timeLeftSeconds;
        }
    };

    const canTakeQuiz = async () => {
        try {
            const allowedResp = await quizService.isUserAllowedToTakeQuiz(quizId!, user.id);

            if (!allowedResp.data.allowed) {
                navigate("/quizzes");
                return;
            }

            const canStartQuizFn = httpsCallable(functions, "canStartQuiz");
            const result = await canStartQuizFn({ quizId });

            const data = result.data as { success: boolean; message: string };

            if (!data.success) {
                toast({
                    title: "Cannot start quiz now",
                    description: data.message,
                    variant: "destructive",
                });
                navigate("/quizzes");
            }
        } catch (err) {
            navigate("/quizzes");
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

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleTimeOver();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeOver = async () => {
        toast({
            title: "Time Over",
            description: "Your quiz time has ended. Submitting automatically...",
            variant: "destructive"
        });

        await submitQuiz();
        navigate("/quizzes");
    };


    const handleOptionChange = async (qNo: number, option: string, type: string) => {
        setAnswers(prev => {
            const existing = prev[qNo] || { selectedOptions: [], markedForReview: false };

            let updated: string[] = [];

            if (type === QUIZ_QUESTION_TYPE.MCQ) {
                updated = [option]; // Single choice
            } else {
                updated = existing.selectedOptions.includes(option)
                    ? existing.selectedOptions.filter(o => o !== option)
                    : [...existing.selectedOptions, option];
            }

            return {
                ...prev,
                [qNo]: {
                    selectedOptions: updated,
                    markedForReview: existing.markedForReview
                }
            };
        });

        const updatedAnswerValue = (() => {
            if (type === QUIZ_QUESTION_TYPE.MCQ) return option;
            const existing = answers[qNo]?.selectedOptions || [];
            const next = existing.includes(option)
                ? existing.filter(o => o !== option)
                : [...existing, option];
            return next.length > 0 ? next : null;
        })();

        const existing = answers[qNo] || { selectedOptions: [], markedForReview: false };
        const userName = [user.firstName, user.middleName, user.lastName]
            .filter(Boolean) // removes undefined, null, empty string
            .join(" ");
        const res = await quizService.saveSingleAnswer(quizId!, user.id, userName, user.email, qNo, updatedAnswerValue, existing.markedForReview);
        if (!res.success) {
            toast({
                title: "Save failed",
                description: "Could not save answer. Try again.",
                variant: "destructive"
            });
        }
    };

    const resetAnswer = (qNo: number) => {
        setAnswers(prev => ({
            ...prev,
            [qNo]: { ...prev[qNo], selectedOptions: [] }
        }));
    };

    const toggleReview = (qNo: number) => {
        setAnswers(prev => {
            const existing = prev[qNo] || { selectedOptions: [], markedForReview: false };
            return {
                ...prev,
                [qNo]: { ...existing, markedForReview: !existing.markedForReview }
            };
        });
    };

    useEffect(() => {
        const init = async () => {
            await canTakeQuiz();
            await fetchQuizAndSetQuestions();
            const userName = [user.firstName, user.middleName, user.lastName]
                .filter(Boolean) // removes undefined, null, empty string
                .join(" ");
            if (quizId && user?.id) {
                await quizService.createSubmission(quizId, user.id, userName, user.email);
                await fetchSubmissionAndPopulateAnswers();
            }
            setLoading(false);
            startTimer();
        };
        init();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Poll server time every 3 minutes (180000 ms)
    useEffect(() => {
        if (!quizId) return;

        const poll = async () => {
            try {
                const serverTime = await getServerTimeLeft();

                setTimeLeft(prev => {
                    if (prev === null) return serverTime;
                    const diff = Math.abs(prev - serverTime);
                    if (diff > 5) {
                        return serverTime; // Sync only when drift is large
                    }
                    return prev;
                });

            } catch (e) { }
        };

        // Run once immediately
        poll();

        // Then run every 3 minutes
        const interval = setInterval(poll, 180_000);

        return () => clearInterval(interval);
    }, [quizId]);

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <div className="flex flex-1 overflow-hidden">

                <div className="w-full max-w-4xl mx-auto p-6 overflow-y-auto">

                    {loading ? (
                        <div className="text-gray-500 text-center py-10">
                            Loading Quiz…
                        </div>
                    ) : !quiz ? (
                        <div className="text-gray-400 text-center py-10">
                            Quiz unavailable.
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold text-gray-800">
                                    {quiz.title}
                                </h2>

                                <div className="text-xl font-bold text-pink-600">
                                    ⏳ {formatTime(timeLeft)}
                                </div>

                                <button
                                    onClick={() => setOpenEndModal(true)}
                                    className="
        flex items-center gap-2 
        bg-pink-500 text-white px-4 py-2 rounded-xl text-sm font-semibold
        hover:bg-pink-600 active:scale-95 transition
        shadow-sm hover:shadow-md
    "
                                >
                                    <Flag size={18} />
                                    End Quiz
                                </button>

                            </div>

                            <strong className="font-thin text-gray-700 text-xl">{quiz.description}</strong>
                            <br />
                            <br />
                            {/* Question Navigation Circles */}
                            <div className="flex gap-3 mb-6 flex-wrap">
                                {questions.map(q => {
                                    const ans = answers[q.questionNo];
                                    const attempted = ans && ans.selectedOptions.length > 0;
                                    const review = ans && ans.markedForReview;

                                    let circleColor = "border-pink-400 text-pink-500";
                                    if (attempted) circleColor = "bg-green-500 text-white border-green-600";
                                    if (review) circleColor = "bg-gray-400 text-white border-gray-500";

                                    return (
                                        <button
                                            key={q.questionNo}
                                            onClick={() => setActiveQ(q.questionNo)}
                                            className={`w-8 h-8 rounded-full flex justify-center items-center border text-sm 
                    ${activeQ === q.questionNo ? "ring-2 ring-pink-500" : ""}
                    ${circleColor}
                `}
                                        >
                                            {q.questionNo}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Show Only the Selected Question */}
                            <div className="space-y-6">
                                {questions
                                    .filter(q => q.questionNo === activeQ)
                                    .map(q => {
                                        const ans = answers[q.questionNo] || { selectedOptions: [], markedForReview: false };

                                        return (
                                            <div
                                                key={q.questionNo}
                                                className="bg-white p-6 rounded-2xl shadow-md border border-pink-200 transition-all"
                                            >
                                                {/* Question header */}
                                                <h3 className="font-semibold text-xl mb-4 text-gray-800">
                                                    Q{q.questionNo}. {q.description}
                                                </h3>

                                                {/* Options */}
                                                {(q.type === QUIZ_QUESTION_TYPE.MCQ ||
                                                    q.type === QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER) && (
                                                        <div className="space-y-3">
                                                            {q.options.map((opt, idx) => (
                                                                <label
                                                                    key={idx}
                                                                    className="flex items-center gap-3 group cursor-pointer"
                                                                >
                                                                    <input
                                                                        type={q.type === "MCQ" ? "radio" : "checkbox"}
                                                                        checked={ans.selectedOptions.includes(opt)}
                                                                        onChange={() =>
                                                                            handleOptionChange(q.questionNo, opt, q.type)
                                                                        }
                                                                        className="accent-pink-500 w-4 h-4"
                                                                    />
                                                                    <span className="group-hover:text-pink-600 transition">
                                                                        {opt}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}

                                                {/* Action Buttons */}
                                                <div className="flex gap-3 mt-6">
                                                    {/* Reset */}
                                                    <button
                                                        disabled={ans.selectedOptions.length === 0}
                                                        onClick={() => resetAnswer(q.questionNo)}
                                                        className={`
        px-4 py-2 rounded-lg text-sm font-medium border transition active:scale-95
        ${ans.selectedOptions.length === 0
                                                                ? "border-pink-300 text-pink-300 cursor-not-allowed opacity-50"
                                                                : "border-pink-500 text-pink-600 hover:bg-pink-50"}
    `}
                                                    >
                                                        Reset Answer
                                                    </button>

                                                    {/* Mark / Unmark Review */}
                                                    <button
                                                        onClick={async () => {
                                                            toggleReview(q.questionNo);
                                                            quizService.markAnswerForReview(quizId, user.id, q.questionNo, !ans.markedForReview)
                                                        }}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition active:scale-95 
                                ${ans.markedForReview
                                                                ? "border-gray-500 text-gray-600 hover:bg-gray-100"
                                                                : "border-pink-500 text-pink-600 hover:bg-pink-50"
                                                            }`}
                                                    >
                                                        {ans.markedForReview ? "Unmark" : "Mark for Review"}
                                                    </button>
                                                </div>

                                                {/* Navigation Buttons */}
                                                <div className="flex justify-between mt-8">
                                                    <button
                                                        disabled={activeQ === 1}
                                                        onClick={() => setActiveQ(prev => prev - 1)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium border border-pink-400
                                transition active:scale-95
                                ${activeQ === 1
                                                                ? "opacity-40 cursor-not-allowed"
                                                                : "hover:bg-pink-50 text-pink-600"
                                                            }`}
                                                    >
                                                        ⬅ Previous
                                                    </button>

                                                    <button
                                                        disabled={activeQ === questions.length}
                                                        onClick={() => setActiveQ(prev => prev + 1)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium border border-pink-400
                                transition active:scale-95
                                ${activeQ === questions.length
                                                                ? "opacity-40 cursor-not-allowed"
                                                                : "hover:bg-pink-50 text-pink-600"
                                                            }`}
                                                    >
                                                        Next ➜
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Final Submit Button */}
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={() => setOpenSubmissionModal(true)}
                                    className="bg-pink-600 text-white px-6 py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-pink-700 transition active:scale-95"
                                >
                                    Submit Quiz
                                </button>
                            </div>
                        </div>
                    )}
                    <ConfirmDialog
                        open={openSubmissionModal}
                        onCancel={() => {
                            setOpenSubmissionModal(false);
                        }}
                        onConfirm={async () => {
                            await submitQuiz();
                            navigate("/quizzes");
                        }}
                        title="Submit Quiz"
                        body={"Are you sure you want to submit the quiz? You will not be able to change your answers after submitting."}
                        confirmText="Submit"
                        cancelText="Cancel"
                        variant="default"
                        dismissible
                    />
                    <ConfirmDialog
                        open={openEndModal}
                        onCancel={() => {
                            setOpenEndModal(false);
                        }}
                        onConfirm={async () => {
                            await submitQuiz();
                            navigate("/quizzes");
                        }}
                        title="End Quiz"
                        body={"Are you sure you want to end the quiz? This will count as a submission. You will not be able to change your answers after ending."}
                        confirmText="End"
                        cancelText="Cancel"
                        variant="default"
                        dismissible
                    />
                </div>
            </div>
        </div>
    );
};

export default AttemptQuiz;

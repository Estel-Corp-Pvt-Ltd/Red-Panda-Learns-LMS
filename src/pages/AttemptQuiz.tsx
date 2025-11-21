import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { QUIZ_QUESTION_TYPE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { quizService } from "@/services/quizService";
import { Question, Quiz } from "@/types/quiz";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

const AttemptQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const functions = getFunctions();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

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
        console.log(response.data.questions)
        setQuestions(response.data.questions);

        if (response.data.durationMinutes) {
            setTimeLeft(response.data.durationMinutes * 60);
        }
    };

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    toast({
                        title: "Time Over",
                        description: "Your quiz time has ended.",
                        variant: "destructive"
                    });
                    navigate("/quizzes");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        const init = async () => {
            await canTakeQuiz();
            await fetchQuizAndSetQuestions();
            setLoading(false);
            startTimer();
        };
        init();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

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
                            </div>

                            <div className="space-y-6">
                                {questions.map((q) => (
                                    <div key={q.questionNo} className="bg-white p-5 rounded-xl shadow border">
                                        <h3 className="font-semibold text-lg text-gray-800 mb-2">
                                            Q{q.questionNo}. {q.description}
                                        </h3>

                                        {(q.type === QUIZ_QUESTION_TYPE.MCQ || q.type === QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER) && (
                                            <div className="space-y-2">
                                                {q.options.map((opt, idx) => (
                                                    <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type={q.type === "MCQ" ? "radio" : "checkbox"}
                                                            name={`q-${q.questionNo}`}
                                                            value={opt}
                                                            className="accent-pink-500 w-4 h-4"
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttemptQuiz;

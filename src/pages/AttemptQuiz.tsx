import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { quizService } from "@/services/quizService";
import { Question, Quiz } from "@/types/quiz";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const AttemptQuiz = () => {
    const { quizId } = useParams();

    const navigate = useNavigate();
    const { user } = useAuth();

    const functions = getFunctions();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    const [loading, setLoading] = useState(false);

    const canTakeQuiz = async () => {
        try {
            const allowedToTakeQuizResponse = await quizService.isUserAllowedToTakeQuiz(quizId, user.id);

            if (!allowedToTakeQuizResponse.data.allowed) {
                navigate("/quizzes");
            }

            const canStartQuiz = httpsCallable(functions, "canStartQuiz");

            const result = await canStartQuiz({ quizId });
            const data = result.data as { success: boolean; message: string };
            if (!data.success) {
                navigate("/quizzes");
            }

        } catch (error: any) {
            navigate("/quizzes");
        }
    };

    const fetchQuizAndSetQuestions = async () => {
        const response = await quizService.getQuizById(quizId);
        if (response.data) {
            setQuiz(response.data);
            setQuestions(response.data.questions);
            return;
        }

        toast({
            title: "Could not fetch quiz. Contact Instructor."
        });
    };

    useEffect(() => {
        setLoading(true);
        canTakeQuiz();
        fetchQuizAndSetQuestions();
        setLoading(false);
    }, []);

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <div className="w-full max-w-4xl mx-auto p-6 overflow-y-auto">

                    {loading ? (
                        <div className="text-gray-500 text-center py-10">
                            Loading Quiz Data
                        </div>
                    ) : !quiz ? (
                        <div className="text-gray-400 text-center py-10">
                            Quiz unavailable.
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                                Attempting: {quiz.title}
                            </h2>
                            <p className="text-gray-600">
                                Access validated. Waiting for further instructions…
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AttemptQuiz;

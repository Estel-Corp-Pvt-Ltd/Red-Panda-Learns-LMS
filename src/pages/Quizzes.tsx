import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { QUIZ_SUBMISSION_STATUS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { toast } from "@/hooks/use-toast";
import { quizService } from "@/services/quizService";
import { Quiz } from "@/types/quiz";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Folder, ListChecks, Clock, BookOpen, CheckSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Quizzes = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [submissionsData, setSubmissionsData] = useState<{
        quizId: string;
        releaseScores: boolean;
        status: string;
        totalScore: number;
        passed: boolean;
    }[]>([]);

    const [loading, setLoading] = useState(true);
    const [checkingIfQuizCanBeStarted, setCheckingIfQuizCanBeStarted] = useState(false);

    const navigate = useNavigate();

    const { user } = useAuth();
    const { enrollments, loading: loadingEnrollments } = useEnrollment();
    const functions = getFunctions();

    const fetchAvailableQuizzes = async (enrolledCourseIds: string[]) => {
        const quizResponse = await quizService.getQuizzesByCoursesForUser(enrolledCourseIds, user.id);
        if (quizResponse.success) {
            setQuizzes(quizResponse.data);
            const quizInfoArr = quizResponse.data.map(q => ({
                id: q.id,
                releaseScores: q.releaseScores ?? false
            }));

            const submissionResp = await quizService.getUserSubmissionsStatus(quizInfoArr, user.id);
            if (submissionResp.success) {
                const submissions = submissionResp.data;
                setSubmissionsData(submissions);
            }
        }
    };

    useEffect(() => {
        if (!loadingEnrollments) {
            const enrolledCourseIds = enrollments.map((enrollment) => enrollment.courseId);
            if (enrolledCourseIds.length > 0) {
                fetchAvailableQuizzes(enrolledCourseIds);
            }
            setLoading(false);
        }
    }, [loadingEnrollments]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "TBD";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const canStartQuiz = async (quizId: string) => {
        try {
            setCheckingIfQuizCanBeStarted(true);
            const canStartQuiz = httpsCallable(functions, "canStartQuiz");

            const result = await canStartQuiz({ quizId });
            const data = result.data as { success: boolean; message: string };

            setCheckingIfQuizCanBeStarted(false);

            return { canStart: data.success, message: data.message };

        } catch (error: any) {
            toast({
                title: "Error",
                description: "Something went wrong. Please try again later.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <div className="w-full max-w-4xl mx-auto p-6 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-6">
                        <ListChecks className="w-6 h-6 text-pink-500" />
                        <h2 className="text-2xl font-semibold text-gray-800">Your Quizzes</h2>
                    </div>

                    {loading ? (
                        <div className="text-gray-500 text-center py-10">
                            Loading quizzes…
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="text-gray-400 text-center py-10">
                            No quizzes available.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {quizzes.map((quiz) => {
                                const submission = submissionsData.find(s => s.quizId === quiz.id);
                                const hasSubmitted = submission?.status === QUIZ_SUBMISSION_STATUS.SUBMITTED;
                                const showScore = submission?.releaseScores && hasSubmitted;
                                const hasPassed = submission?.passed;

                                return (
                                    <div
                                        key={quiz.id}
                                        className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 border border-gray-100"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Folder className="w-5 h-5 text-pink-500" />
                                                <h3 className="text-lg font-semibold text-gray-800">
                                                    {quiz.title}
                                                </h3>
                                            </div>
                                            <span className="text-sm text-gray-500">
                                                {formatDate(quiz.scheduledAt)}
                                            </span>
                                            {hasSubmitted && (
                                                <div className="text-sm font-medium text-green-600 mt-1">
                                                    Status: Submitted
                                                    {showScore && submission?.totalScore !== undefined
                                                        ? ` | Score: ${submission.totalScore}/${quiz.totalMarks}`
                                                        : ""}
                                                    {showScore && hasPassed !== undefined
                                                        ? ` | ${hasPassed ? "Passed ✅" : "Failed ❌"}`
                                                        : ""}
                                                </div>
                                            )}

                                        </div>

                                        {quiz.description && (
                                            <p className="text-gray-600 mb-4 text-sm line-clamp-3">
                                                {quiz.description}
                                            </p>
                                        )}

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-gray-700 text-sm">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4 text-pink-500" />
                                                <span>{quiz.durationMinutes} mins</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <BookOpen className="w-4 h-4 text-pink-500" />
                                                <span>{quiz.questions.length} questions</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <CheckSquare className="w-4 h-4 text-pink-500" />
                                                <span>Total Marks: {quiz.totalMarks}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium text-gray-600">Passing:</span>
                                                <span>{quiz.passingPercentage}%</span>
                                            </div>
                                            <div className="flex items-center">
                                                <strong className="text-nowrap text-red-500">*Note: Clicking on Start Quiz will start the timer.</strong>
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <button
                                                    onClick={async () => {
                                                        const response = await canStartQuiz(quiz.id);

                                                        if (!response.canStart) {
                                                            return toast({
                                                                title: "You cannot start this quiz right now",
                                                                description: `${response.message}`,
                                                                variant: "destructive",
                                                            });
                                                        }

                                                        navigate(`/quizzes/${quiz.id}`);
                                                    }}
                                                    disabled={checkingIfQuizCanBeStarted || hasSubmitted}
                                                    className={`px-4 py-2 rounded-lg 
        ${checkingIfQuizCanBeStarted || hasSubmitted ? "bg-pink-700" : "hover:bg-pink-500 bg-primary"} 
        text-white transition`}
                                                >
                                                    {checkingIfQuizCanBeStarted ? "Loading Quiz ..." : hasSubmitted ? "Already Submitted" : "Start Quiz"}
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                )
                            }
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Quizzes;

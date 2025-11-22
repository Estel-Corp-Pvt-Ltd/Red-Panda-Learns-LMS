import { Header } from "@/components/Header";
import QuizCard from "@/components/quiz/QuizCard";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { quizService } from "@/services/quizService";
import { Quiz } from "@/types/quiz";
import { ListChecks } from "lucide-react";
import { useState, useEffect } from "react";

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
    const { user } = useAuth();
    const { enrollments, loading: loadingEnrollments } = useEnrollment();

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
                            {quizzes.sort((a, b) => b.scheduledAt?.toMillis() - a.scheduledAt?.toMillis()).map((quiz) => {
                                return (
                                    <QuizCard
                                        key={quiz.id}
                                        quiz={quiz}
                                        submissionsData={submissionsData}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Quizzes;

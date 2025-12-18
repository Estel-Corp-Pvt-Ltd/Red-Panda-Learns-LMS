import { Header } from "@/components/Header";
import QuizCard from "@/components/quiz/QuizCard";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { quizService } from "@/services/quizService";
import { Quiz } from "@/types/quiz";
import { motion } from "framer-motion";
import { ListChecks , Loader2, FileQuestion, CalendarClock } from "lucide-react";
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
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="w-full flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
                    <div className="max-w-5xl mx-auto">
                        
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-pink-100 dark:bg-accent/10 rounded-2xl shadow-sm border border-pink-100 dark:border-accent/20">
                                    <ListChecks className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                        Your Quizzes
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                        Manage your pending assessments and view results.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-accent" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
                                    Loading your assessments...
                                </p>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && quizzes.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl bg-gray-50/50 dark:bg-slate-900/50">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
                                    <FileQuestion className="w-10 h-10 text-gray-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    No Quizzes Assigned
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm text-center mt-1">
                                    You're all caught up! Check back later for new scheduled assessments.
                                </p>
                            </div>
                        )}

                        {/* Quiz Grid */}
                        {!loading && quizzes.length > 0 && (
                            <div className="grid grid-cols-1 gap-5">
                                {quizzes
                                    .sort((a, b) => b.scheduledAt?.toMillis() - a.scheduledAt?.toMillis())
                                    .map((quiz, index) => (
                                        <motion.div
                                            key={quiz.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05, duration: 0.3 }}
                                            className="group"
                                        >
                                            {/* 
                                              NOTE: Ensure your <QuizCard> component has dark mode classes 
                                              (e.g., dark:bg-slate-900 dark:border-slate-800 dark:text-white)
                                              so it matches this container. 
                                            */}
                                            <div className="relative transform transition-all duration-200 hover:scale-[1.01]">
                                                <QuizCard
                                                    quiz={quiz}
                                                    submissionsData={submissionsData}
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                            </div>
                        )}
                        
                        {/* Footer / Info (Optional) */}
                        {!loading && quizzes.length > 0 && (
                            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-600">
                                <CalendarClock className="w-3 h-3" />
                                <span>Quizzes are sorted by most recently scheduled</span>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Quizzes;

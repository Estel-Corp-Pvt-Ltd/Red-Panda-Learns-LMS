import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Quiz } from "@/types/quiz";
import { Folder, ListChecks } from "lucide-react";
import { useState, useEffect } from "react";

const Quizzes = () => {
    const [quizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, []);

    return (
        <div className="h-screen flex flex-col bg-background">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <div className="w-full max-w-3xl mx-auto p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <ListChecks className="w-6 h-6 text-pink-500" />
                        <h2 className="text-2xl font-semibold text-gray-800">Your Quizzes</h2>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-gray-500 text-center py-10">
                                Loading quizzes…
                            </div>
                        ) : quizzes.length === 0 ? (
                            <div className="text-gray-400 text-center py-10">
                                No quizzes available.
                            </div>
                        ) : (
                            quizzes.map((quiz) => (
                                <div
                                    key={quiz.id}
                                    className="p-4 border rounded-lg bg-white shadow-sm flex items-center gap-3 hover:shadow-md transition"
                                >
                                    <Folder className="w-5 h-5 text-pink-500" />
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-800">{quiz.title}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

};

export default Quizzes;

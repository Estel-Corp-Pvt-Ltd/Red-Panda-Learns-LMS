import { toast } from "@/hooks/use-toast";
import { quizService } from "@/services/quizService";
import { Folder, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import CreateQuizModal from "./CreateQuizModal";
import EditQuizModal from "./EditQuizModal";

const QuizTab = ({ courseId, userId }: { courseId: string, userId: string }) => {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [idToOpenEditModal, setIdToOpenEditModal] = useState("");

    useEffect(() => {
        const fetchQuizzes = async () => {
            const quizListResponse = await quizService.getQuizzesByCourse(courseId);
            if (quizListResponse.success) {
                setQuizzes(quizListResponse.data);
            } else {
                toast({
                    title: "Failed to fetch quizzes"
                });
            }
            setLoading(false);
        };

        if (!openCreateModal) {
            fetchQuizzes();
        }
    }, [courseId, openCreateModal]);

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <ListChecks className="w-6 h-6 text-pink-500" />
                    Quizzes
                </h2>

                <button
                    onClick={() => setOpenCreateModal(true)}
                    className="bg-[#ff00ff] hover:bg-pink-500 text-white px-5 py-2 rounded-full flex items-center gap-2 transition"
                >
                    <Plus size={16} />
                    Add Quiz
                </button>
            </div>
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
                {loading ? (
                    <div className="text-gray-500 text-center py-10">
                        Loading quizzes…
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="text-gray-400 text-center py-10">
                        No quizzes added yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {quizzes.map((quiz, idx) => (
                            <div
                                key={quiz.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <Folder className="w-5 h-5 text-pink-500" />

                                    <span className="font-medium text-gray-800">
                                        {quiz.title || `Quiz ${idx + 1}`}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIdToOpenEditModal(quiz.id)}
                                        className="px-4 py-1.5 text-sm rounded-full border border-gray-300 hover:bg-gray-100 transition flex items-center gap-2"
                                    >
                                        <Pencil size={14} />
                                        Update
                                    </button>

                                    <button className="px-4 py-1.5 text-sm rounded-full border border-red-300 text-red-500 hover:bg-red-50 transition flex items-center gap-2">
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <EditQuizModal
                open={idToOpenEditModal ? true : false}
                onClose={() => setIdToOpenEditModal("")}
                quiz={quizzes.find(quiz => quiz.id === idToOpenEditModal)}
            />

            <CreateQuizModal
                open={openCreateModal}
                onClose={() => setOpenCreateModal(false)}
                createdBy={userId}
                courseId={courseId}
            />
        </div>
    );
};

export default QuizTab;

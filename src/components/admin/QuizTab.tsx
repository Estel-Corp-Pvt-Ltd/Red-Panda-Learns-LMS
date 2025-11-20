import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { Plus, Folder, Pencil, Trash2, ListChecks } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const QuizTab = ({ courseId }: { courseId: string }) => {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const q = query(
                    collection(db, "quizzes"),
                    where("courseId", "==", courseId)
                );

                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                setQuizzes(list);
            } catch (err) {
                toast({
                    title: "Failed to fetch quizzes"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, [courseId]);

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <ListChecks className="w-6 h-6 text-pink-500" />
                    Quizzes
                </h2>

                <button
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
                                    <button className="px-4 py-1.5 text-sm rounded-full border border-gray-300 hover:bg-gray-100 transition flex items-center gap-2">
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
        </div>
    );
};

export default QuizTab;

import { QUIZ_QUESTION_TYPE } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { quizService } from "@/services/quizService";
import { Question, Quiz } from "@/types/quiz";
import {
    closestCenter,
    DndContext,
    PointerSensor,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { ChevronDown, Folder, GripVertical, ListChecks, Pencil, Plus, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import CreateQuizModal from "./CreateQuizModal";
import EditQuizModal from "./EditQuizModal";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QuizQuestionType } from "@/types/general";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";

type SortableQuestionCardProps = {
    id: number;
    question: Question;
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
    updateQuestion: (questionNo: number, patch: Partial<Question>) => void;
    deleteQuestion: (questionNo: number) => void;
    addOption: (questionNo: number) => void;
    updateOption: (questionNo: number, optionIndex: number, value: string) => void;
    deleteOption: (questionNo: number, optionIndex: number) => void;
    updateCorrectAnswer: (questionNo: number, answer: string | string[]) => void;
};

type QuestionsProps = {
    questions: Question[];
    setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
    addQuestion: () => void;
    updateQuestion: (questionNo: number, patch: Partial<Question>) => void;
    deleteQuestion: (questionNo: number) => void;
    addOption: (questionNo: number) => void;
    updateOption: (questionNo: number, optionIndex: number, value: string) => void;
    deleteOption: (questionNo: number, optionIndex: number) => void;
    updateCorrectAnswer: (questionNo: number, answer: string | string[]) => void;
    handleSaveQuestions: () => Promise<void>;
};

const SortableQuestionCard = ({
    id,
    question,
    collapsed,
    setCollapsed,
    updateQuestion,
    deleteQuestion,
    addOption,
    updateOption,
    deleteOption,
    updateCorrectAnswer
}: SortableQuestionCardProps) => {

    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="p-4 border rounded-lg bg-gray-50 mb-3 shadow-sm"
        >
            <div className="flex gap-2 items-center mb-2">
                <div {...listeners} {...attributes}>
                    <GripVertical className="text-gray-500 cursor-grab" />
                </div>

                <Input
                    className="flex-1"
                    placeholder="Question description"
                    value={question.description}
                    onChange={(e) => updateQuestion(id, { description: e.target.value })}
                />

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-pink-600 hover:text-pink-700"
                >
                    <ChevronDown
                        className={`transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
                    />
                </button>

                <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => deleteQuestion(id)}
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {
                !collapsed &&
                (
                    <>
                        <div className="mb-3">
                            <label className="text-sm font-medium">Type</label>
                            <Select
                                value={question.type}
                                onValueChange={(val) =>
                                    updateQuestion(id, { type: val as QuizQuestionType })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Question Type" />
                                </SelectTrigger>

                                <SelectContent>
                                    {Object.values(QUIZ_QUESTION_TYPE).map(t => (
                                        <SelectItem key={t} value={t}>
                                            {t === QUIZ_QUESTION_TYPE.MCQ ? "MCQ" : "Multiple Answers"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Options</h4>

                            <button
                                className="text-pink-600 flex items-center gap-1 hover:text-pink-700"
                                onClick={() => addOption(id)}
                            >
                                <PlusCircle size={18} />
                                Add Option
                            </button>
                        </div>

                        {question.options.map((opt, idx) => (
                            <div key={idx} className="flex gap-2 items-center mb-2">
                                <Input
                                    className="flex-1"
                                    placeholder={`Option ${idx + 1}`}
                                    value={opt}
                                    onChange={(e) => updateOption(id, idx, e.target.value)}
                                />

                                <button
                                    className="text-red-400 hover:text-red-600"
                                    onClick={() => deleteOption(id, idx)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {
                            question.options.length > 0 &&
                            (
                                <div>
                                    <label className="text-sm font-medium">
                                        Correct Answer
                                    </label>
                                    {
                                        question.type === QUIZ_QUESTION_TYPE.MCQ ? (
                                            <Select
                                                value={typeof question.correctAnswer === "string" ? question.correctAnswer : ""}
                                                onValueChange={(val) => updateCorrectAnswer(id, val)}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Correct Option" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {question.options.filter(q => q.trim() !== "").map((o, idx) => (
                                                        <SelectItem key={idx} value={o}>
                                                            {o}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex flex-col gap-1 mt-2">
                                                {question.options.map((o, idx) => {
                                                    const arr = Array.isArray(question.correctAnswer)
                                                        ? question.correctAnswer
                                                        : [];

                                                    const checked = arr.includes(o);

                                                    return (
                                                        <div key={idx} className="flex gap-2 items-center">
                                                            <Checkbox
                                                                checked={checked}
                                                                onCheckedChange={() => {
                                                                    let next = checked
                                                                        ? arr.filter(x => x !== o)
                                                                        : [...arr, o];
                                                                    updateCorrectAnswer(id, next);
                                                                }}
                                                            />
                                                            <span>{o}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    }
                                </div>
                            )
                        }

                        <div className="mt-3">
                            <label className="text-sm font-medium">Marks: </label>
                            <input
                                type="number"
                                min={1}
                                className="mt-1 w-24 border px-3 py-2 rounded-md"
                                value={question.marks ?? 1}
                                onChange={e =>
                                    updateQuestion(id, { marks: parseInt(e.target.value) || 1 })
                                }
                            />
                        </div>
                    </>
                )
            }
        </div>
    );
};

const Questions = ({
    questions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    addOption,
    updateOption,
    deleteOption,
    updateCorrectAnswer,
    setQuestions,
    handleSaveQuestions
}: QuestionsProps) => {

    const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const handleDragStart = (event: any) => {
        const id = event.active.id;
        setCollapsedMap(prev => ({ ...prev, [id]: true }));
    };

    // When drag ends
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = questions.findIndex(q => q.questionNo === active.id);
        const newIndex = questions.findIndex(q => q.questionNo === over.id);

        const newList = arrayMove(questions, oldIndex, newIndex)
            .map((q, idx) => ({ ...q, questionNo: idx + 1 }));

        setQuestions(newList);
    };


    const isSaveDisabled = questions.some(q => {
        if (q.type === QUIZ_QUESTION_TYPE.MCQ) {
            return typeof q.correctAnswer !== "string" || q.correctAnswer.trim() === "";
        }
        return !Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0;
    });

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Questions</h3>

                <button
                    className="px-4 py-2 text-white rounded-full bg-[#ff00ff] hover:bg-pink-500"
                    onClick={addQuestion}
                >
                    + Add Question
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={questions.map((q: Question) => q.questionNo)}
                    strategy={verticalListSortingStrategy}
                >
                    {questions.map((q: Question) => (
                        <SortableQuestionCard
                            key={q.questionNo}
                            id={q.questionNo}
                            question={q}
                            collapsed={collapsedMap[q.questionNo] ?? false}
                            setCollapsed={(val: boolean) =>
                                setCollapsedMap(prev => ({ ...prev, [q.questionNo]: val }))
                            }
                            updateQuestion={updateQuestion}
                            deleteQuestion={deleteQuestion}
                            addOption={addOption}
                            updateOption={updateOption}
                            deleteOption={deleteOption}
                            updateCorrectAnswer={updateCorrectAnswer}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {
                questions.length > 0 ?
                    <button
                        className={`px-4 py-2 text-white rounded-full ${isSaveDisabled ? "bg-pink-700" : "bg-[#ff00ff] hover:bg-pink-500 cursor-pointer"}`}
                        onClick={handleSaveQuestions}
                        disabled={isSaveDisabled}
                    >
                        Save Questions
                    </button>
                    : <></>
            }
        </div>
    );
};

const QuizTab = ({ courseId, userId }: { courseId: string; userId: string }) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [selectedQuizId, setSelectedQuizId] = useState("");
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
    const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

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

        if (!openCreateModal && !openEditModal && !openDeleteModal) {
            fetchQuizzes();
        }
    }, [courseId, openCreateModal, openEditModal, openDeleteModal]);

    useEffect(() => {
        const matchedQuiz = quizzes.find(quiz => quiz.id === selectedQuizId);
        if (matchedQuiz) {
            setSelectedQuiz(matchedQuiz);
        } else {
            setSelectedQuiz(null);
        }
    }, [selectedQuizId]);

    const handleExpandQuiz = async (quizId: string) => {
        if (expandedQuizId === quizId) {
            setExpandedQuizId(null);
            setQuestions([]);
            return;
        }

        const matchedQuiz = quizzes.find(quiz => quiz.id === quizId);
        if (matchedQuiz) {
            setExpandedQuizId(quizId);
            setQuestions(matchedQuiz.questions);
        } else {
            setExpandedQuizId(null);
        }
    };

    const addQuestion = () => {
        setQuestions((prev) => {
            const nextNo = prev.length > 0 ? prev[prev.length - 1].questionNo + 1 : 1;

            return [
                ...prev,
                {
                    questionNo: nextNo,
                    description: "",
                    type: QUIZ_QUESTION_TYPE.MCQ,
                    options: [],
                    correctAnswer: "",
                    marks: 1
                }
            ];
        });
    };

    const updateQuestion = (questionNo: number, patch: Partial<Question>) => {
        setQuestions(prev =>
            prev.map(q =>
                q.questionNo === questionNo ? { ...q, ...patch } : q
            )
        );
    };

    const deleteQuestion = (questionNo: number) => {
        setQuestions(prev =>
            prev
                .filter(q => q.questionNo !== questionNo)
                .map((q, i) => ({ ...q, questionNo: i + 1 }))
        );
    };

    const addOption = (questionNo: number) => {
        setQuestions(prev =>
            prev.map(q => {
                if (q.questionNo !== questionNo) return q;
                return { ...q, options: [...q.options, "New Option"] };
            })
        );
    };

    const updateOption = (
        questionNo: number,
        optionIndex: number,
        value: string
    ) => {
        setQuestions(prev =>
            prev.map(q => {
                if (q.questionNo !== questionNo) return q;

                const updatedOptions = [...q.options];
                updatedOptions[optionIndex] = value;

                return { ...q, options: updatedOptions };
            })
        );
    };

    const deleteOption = (questionNo: number, optionIndex: number) => {
        setQuestions(prev =>
            prev.map(q => {
                if (q.questionNo !== questionNo) return q;

                const deleted = q.options[optionIndex];

                const newOptions = q.options.filter((_, i) => i !== optionIndex);

                let newCorrect = q.correctAnswer;

                if (Array.isArray(newCorrect)) {
                    newCorrect = newCorrect.filter(ans => ans !== deleted);
                } else if (newCorrect === deleted) {
                    newCorrect = "";
                }

                return {
                    ...q,
                    options: newOptions,
                    correctAnswer: newCorrect
                };
            })
        );
    };

    const updateCorrectAnswer = (
        questionNo: number,
        answer: string | string[]
    ) => {
        setQuestions(prev =>
            prev.map(q =>
                q.questionNo === questionNo
                    ? { ...q, correctAnswer: answer }
                    : q
            )
        );
    };

    const handleSaveQuestions = async () => {
        if (!expandedQuizId) return;

        const response = await quizService.setQuestions(expandedQuizId, questions);

        if (!response.success) {
            toast({ title: "Failed to save questions", variant: "destructive" });
            return;
        }

        toast({ title: "Questions saved successfully" });
    };

    const deleteQuiz = async () => {
        if (!selectedQuiz) return;

        try {
            const result = await quizService.deleteQuiz(selectedQuizId);
            if (!result.success) {
                toast({
                    title: 'Error',
                    description: 'Failed to delete quiz',
                    variant: 'destructive'
                });
                return;
            }

            toast({
                title: 'Success',
                description: 'Quiz deleted successfully',
            });
        } catch (error) {
            console.error('Error deleting quiz:', error);
            toast({
                title: 'Error',
                description: 'An error occurred while deleting the quiz',
                variant: 'destructive'
            });
        } finally {
            setOpenDeleteModal(false);
            setSelectedQuizId("");
        }
    };

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
                                className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition"
                            >
                                {/* Header Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Folder className="w-5 h-5 text-pink-500" />
                                        <span className="font-medium text-gray-800">
                                            {quiz.title || `Quiz ${idx + 1}`}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Expand/Collapse Button */}
                                        <button
                                            onClick={() => handleExpandQuiz(quiz.id)}
                                            className="p-2 rounded-full hover:bg-gray-100 transition"
                                        >
                                            <ChevronDown
                                                size={18}
                                                className={`transition-transform duration-200 ${expandedQuizId === quiz.id ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSelectedQuizId(quiz.id);
                                                setOpenEditModal(true);
                                            }}
                                            className="px-4 py-1.5 text-sm rounded-full border border-gray-300 hover:bg-gray-100 transition flex items-center gap-2"
                                        >
                                            <Pencil size={14} />
                                            Update
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSelectedQuizId(quiz.id);
                                                setOpenDeleteModal(true);
                                            }}
                                            className="px-4 py-1.5 text-sm rounded-full border border-red-300 text-red-500 hover:bg-red-50 transition flex items-center gap-2"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>

                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 text-sm">
                                                <span>Release Scores</span>
                                                <Switch
                                                    checked={quiz.releaseScores ?? false}
                                                    onCheckedChange={async (val) => {
                                                        const res = await quizService.setReleaseScores(quiz.id, val);
                                                        if (!res.success) {
                                                            toast({
                                                                title: "Failed to update release scores",
                                                                variant: "destructive"
                                                            });
                                                            return;
                                                        }

                                                        setQuizzes(prev =>
                                                            prev.map(q => q.id === quiz.id ? { ...q, releaseScores: val } : q)
                                                        );
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Questions Section */}
                                {expandedQuizId === quiz.id && (
                                    <div className="mt-4 border-t pt-4">
                                        <Questions
                                            questions={questions}
                                            setQuestions={setQuestions}
                                            addQuestion={addQuestion}
                                            updateQuestion={updateQuestion}
                                            deleteQuestion={deleteQuestion}
                                            addOption={addOption}
                                            updateOption={updateOption}
                                            deleteOption={deleteOption}
                                            updateCorrectAnswer={updateCorrectAnswer}
                                            handleSaveQuestions={handleSaveQuestions}
                                        />
                                    </div>
                                )}
                            </div>

                        ))}
                    </div>
                )}
            </div>

            <EditQuizModal
                open={openEditModal}
                onClose={() => { setSelectedQuizId(""); setOpenEditModal(false); }}
                quiz={selectedQuiz}
            />

            <CreateQuizModal
                open={openCreateModal}
                onClose={() => setOpenCreateModal(false)}
                createdBy={userId}
                courseId={courseId}
            />

            <ConfirmDialog
                open={openDeleteModal}
                onCancel={() => {
                    setSelectedQuizId("");
                    setOpenDeleteModal(false);
                }}
                onConfirm={deleteQuiz}
                title="Delete Quiz"
                body={`Are you sure you want to delete the quiz titled "${selectedQuiz?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                dismissible
            />
        </div>
    );
};

export default QuizTab;

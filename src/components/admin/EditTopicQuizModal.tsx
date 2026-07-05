import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { topicQuizService } from "@/services/topicQuizService";
import { QUIZ_QUESTION_TYPE, QUIZ_STATUS } from "@/constants";
import { QuizQuestionType, QuizStatus } from "@/types/general";
import { Question, TopicQuiz } from "@/types/quiz";
import { fileService } from "@/services/fileService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  BookOpen,
  GripVertical,
  ImagePlus,
  LayoutDashboard,
  Plus,
  PlusCircle,
  Save,
  Trash2,
  UploadCloud,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ─── SortableQuestionCard ────────────────────────────────────────────────────

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
  updateCorrectAnswer,
}: SortableQuestionCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const addAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await fileService.uploadAttachment(`/courses/quizzes/`, file);
      if (!res.success || !res.data) {
        toast({ title: "Failed to upload attachment", variant: "destructive" });
        return;
      }
      updateQuestion(id, { attachments: [...(question.attachments || []), res.data] });
      toast({ title: "Attachment uploaded" });
    } catch (error: any) {
      toast({ title: "Failed to upload attachment", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const deleteAttachment = (index: number) => {
    const updated = question.attachments?.filter((_, i) => i !== index) || [];
    updateQuestion(id, { attachments: updated });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 mb-3 rounded-lg border shadow-sm bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="flex gap-2 items-center mb-2">
        <div {...listeners} {...attributes}>
          <GripVertical className="cursor-grab text-gray-500 dark:text-gray-400" />
        </div>
        <div className="flex-1 flex gap-3 items-center">
          <Input
            className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            placeholder="Question description"
            value={question.description}
            onChange={(e) => updateQuestion(id, { description: e.target.value })}
          />
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
        >
          <ChevronDown className={`transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`} />
        </button>
        <button
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          onClick={() => deleteQuestion(id)}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {!collapsed && (
        <div className="flex gap-3">
          <div className="relative flex-1 p-4 rounded-lg bg-white dark:bg-gray-900 border border-transparent dark:border-gray-700">
            <div className="mb-3">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={question.type}
                onValueChange={(val) => updateQuestion(id, { type: val as QuizQuestionType })}
              >
                <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                  <SelectValue placeholder="Select Question Type" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {Object.values(QUIZ_QUESTION_TYPE).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === QUIZ_QUESTION_TYPE.MCQ && "MCQ"}
                      {t === QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER && "Multiple Answer"}
                      {t === QUIZ_QUESTION_TYPE.FILL_BLANK && "Fill in the Blank"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {[QUIZ_QUESTION_TYPE.MCQ, QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER].includes(question.type as any) && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Options</h4>
                  <button
                    className="flex items-center gap-1 text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                    onClick={() => addOption(id)}
                  >
                    <PlusCircle size={18} /> Add Option
                  </button>
                </div>
                {question.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <Input
                      className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(id, idx, e.target.value)}
                    />
                    <button
                      className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                      onClick={() => deleteOption(id, idx)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {question.type === QUIZ_QUESTION_TYPE.FILL_BLANK && (
              <div>
                <h3 className="mb-2 font-medium">Rules</h3>
                <div className="mb-3 flex gap-4">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Switch
                      checked={question.rules?.caseInSensitive ?? false}
                      onCheckedChange={(val) =>
                        updateQuestion(id, { rules: { ...question.rules, caseInSensitive: val } })
                      }
                    />
                    Case Insensitive
                  </label>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Switch
                      checked={question.rules?.spaceRemoval ?? false}
                      onCheckedChange={(val) =>
                        updateQuestion(id, { rules: { ...question.rules, spaceRemoval: val } })
                      }
                    />
                    Ignore Spaces
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Correct Answer</label>
              {question.type === QUIZ_QUESTION_TYPE.MCQ && (
                <Select
                  value={typeof question.correctAnswer === "string" ? question.correctAnswer : ""}
                  onValueChange={(val) => updateCorrectAnswer(id, val)}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                    <SelectValue placeholder="Select Correct Option" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {question.options.filter((o) => o.trim()).map((o, idx) => (
                      <SelectItem key={idx} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {question.type === QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER && (
                <div className="flex flex-col gap-1 mt-2">
                  {question.options.map((o, idx) => {
                    const arr = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
                    const checked = arr.includes(o);
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            const next = checked ? arr.filter((x) => x !== o) : [...arr, o];
                            updateCorrectAnswer(id, next);
                          }}
                        />
                        <span>{o}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {question.type === QUIZ_QUESTION_TYPE.FILL_BLANK && (
                <input
                  type="text"
                  className="mt-2 w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                  value={question.correctAnswer as string}
                  onChange={(e) => updateCorrectAnswer(id, e.target.value)}
                />
              )}
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium">Marks</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-24 px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                value={question.marks ?? 1}
                onChange={(e) => updateQuestion(id, { marks: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="w-48 p-3 rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Attachments</h4>
              <label
                htmlFor={`tq-attachment-${id}`}
                className="w-8 h-8 flex items-center justify-center rounded cursor-pointer text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <input
                  type="file"
                  id={`tq-attachment-${id}`}
                  className="hidden"
                  accept="image/*"
                  onChange={addAttachment}
                />
                <ImagePlus size={16} />
              </label>
            </div>
            {isUploading && (
              <div className="bg-blue-500/20 p-2 rounded mb-3 flex items-center justify-center">
                <UploadCloud className="w-4 h-4 text-blue-400 mr-2" />
                <span className="text-sm">Uploading…</span>
              </div>
            )}
            {!question.attachments?.length ? (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No attachments</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {question.attachments.map((att, idx) => (
                  <div key={idx} className="relative group border rounded-md overflow-hidden border-gray-200 dark:border-gray-700">
                    <img src={att} className="w-full h-20 object-cover cursor-pointer hover:opacity-90" onClick={() => setSelectedImageSrc(att)} />
                    <button
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition"
                      onClick={() => deleteAttachment(idx)}
                    >
                      <X size={12} />
                    </button>
                    <div className="p-1 text-xs text-gray-600 dark:text-gray-400 truncate">Attachment {idx + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-900 p-4 rounded-lg max-w-4xl">
            <img src={selectedImageSrc} className="max-w-full max-h-[80vh] object-contain" />
            <button
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-pink-600 hover:bg-pink-700 text-white"
              onClick={() => setSelectedImageSrc(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── EditTopicQuizModal ──────────────────────────────────────────────────────

interface EditTopicQuizModalProps {
  open: boolean;
  onClose: () => void;
  quizId: string | null;
  onUpdated: (title: string) => void;
}

const EditTopicQuizModal = ({ open, onClose, quizId, onUpdated }: EditTopicQuizModalProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [quiz, setQuiz] = useState<TopicQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [error, setError] = useState("");

  // Metadata state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingPercentage, setPassingPercentage] = useState(40);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [enableFreeNavigation, setEnableFreeNavigation] = useState(true);
  const [status, setStatus] = useState<QuizStatus>(QUIZ_STATUS.DRAFT);
  const [xpReward, setXpReward] = useState(0);

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

  // Load quiz
  useEffect(() => {
    if (!open || !quizId) return;
    setLoading(true);
    setError("");
    topicQuizService.getTopicQuizById(quizId).then((res) => {
      setLoading(false);
      if (!res.success || !res.data) {
        setError("Failed to load quiz.");
        return;
      }
      const q = res.data;
      setQuiz(q);
      setTitle(q.title);
      setDescription(q.description || "");
      setPassingPercentage(q.passingPercentage);
      setDurationMinutes(q.durationMinutes);
      setEnableFreeNavigation(q.enableFreeNavigation);
      setStatus(q.status);
      setXpReward(q.xpReward ?? 0);
      setQuestions(q.questions || []);
      setCollapsedMap({});
    });
  }, [open, quizId]);

  const handleSaveMeta = async () => {
    if (!quizId) return;
    if (!title.trim()) return setError("Title is required.");
    if (passingPercentage < 1 || passingPercentage > 100) return setError("Passing % must be 1–100.");
    if (durationMinutes <= 0) return setError("Duration must be > 0.");

    setSavingMeta(true);
    setError("");
    const res = await topicQuizService.updateTopicQuiz(quizId, {
      title,
      description,
      passingPercentage,
      durationMinutes,
      enableFreeNavigation,
      status,
      xpReward,
    });
    setSavingMeta(false);

    if (!res.success) {
      setError(res.error.message || "Failed to save.");
      return;
    }

    toast({ title: "Quiz metadata saved." });
    onUpdated(title);
  };

  const handleSaveQuestions = async () => {
    if (!quizId) return;
    setSavingQuestions(true);
    const res = await topicQuizService.setQuestions(quizId, questions);
    setSavingQuestions(false);

    if (!res.success) {
      toast({ title: "Failed to save questions.", variant: "destructive" });
      return;
    }

    toast({ title: "Questions saved." });
  };

  // Question helpers
  const addQuestion = () => {
    const nextNo = questions.length > 0 ? Math.max(...questions.map((q) => q.questionNo)) + 1 : 1;
    const newQ: Question = {
      questionNo: nextNo,
      description: "",
      type: QUIZ_QUESTION_TYPE.MCQ,
      options: ["", "", "", ""],
      correctAnswer: "",
      marks: 1,
      attachments: [],
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const updateQuestion = (questionNo: number, patch: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.questionNo === questionNo ? { ...q, ...patch } : q))
    );
  };

  const deleteQuestion = (questionNo: number) => {
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q.questionNo !== questionNo);
      return filtered.map((q, i) => ({ ...q, questionNo: i + 1 }));
    });
  };

  const addOption = (questionNo: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.questionNo === questionNo ? { ...q, options: [...q.options, ""] } : q))
    );
  };

  const updateOption = (questionNo: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.questionNo !== questionNo) return q;
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      })
    );
  };

  const deleteOption = (questionNo: number, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.questionNo !== questionNo) return q;
        const newOptions = q.options.filter((_, i) => i !== optionIndex);
        return { ...q, options: newOptions };
      })
    );
  };

  const updateCorrectAnswer = (questionNo: number, answer: string | string[]) => {
    setQuestions((prev) =>
      prev.map((q) => (q.questionNo === questionNo ? { ...q, correctAnswer: answer } : q))
    );
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.questionNo === active.id);
      const newIndex = prev.findIndex((q) => q.questionNo === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((q, i) => ({ ...q, questionNo: i + 1 }));
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-gray-950">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <BookOpen className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              Edit Topic Quiz
            </DialogTitle>
          </DialogHeader>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading quiz…</div>
        ) : (
          <div className="p-6 space-y-8">
            {error && (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* ── Metadata section ───────────────────────────────────── */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Quiz Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="etq-title">
                      Quiz Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="etq-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="etq-desc">Description</Label>
                    <Textarea
                      id="etq-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none min-h-[80px]"
                    />
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <Checkbox
                      id="etq-nav"
                      checked={enableFreeNavigation}
                      onCheckedChange={(v) => setEnableFreeNavigation(Boolean(v))}
                      className="mt-1"
                    />
                    <Label htmlFor="etq-nav" className="font-medium cursor-pointer flex items-center gap-2">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Enable Sidebar Navigation
                    </Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="etq-passing">
                        Passing % <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="etq-passing"
                          type="number"
                          min="1"
                          max="100"
                          value={passingPercentage}
                          onChange={(e) => setPassingPercentage(Number(e.target.value))}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-2.5 text-sm text-gray-400">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as QuizStatus)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(QUIZ_STATUS).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.charAt(0) + s.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="etq-duration">Duration (min)</Label>
                      <Input
                        id="etq-duration"
                        type="number"
                        min="1"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etq-xp">XP Reward</Label>
                      <Input
                        id="etq-xp"
                        type="number"
                        min="0"
                        value={xpReward}
                        onChange={(e) => setXpReward(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveMeta}
                    disabled={savingMeta}
                    className="w-full bg-primary hover:bg-accent text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingMeta ? "Saving…" : "Save Settings"}
                  </Button>
                </div>
              </div>
            </section>

            {/* ── Questions section ───────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Questions ({questions.length}) — Total marks:{" "}
                  {questions.reduce((s, q) => s + (q.marks ?? 0), 0)}
                </h3>
                <Button size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </Button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                  No questions yet. Click "Add Question" to get started.
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={questions.map((q) => q.questionNo)}
                    strategy={verticalListSortingStrategy}
                  >
                    {questions.map((q) => (
                      <SortableQuestionCard
                        key={q.questionNo}
                        id={q.questionNo}
                        question={q}
                        collapsed={collapsedMap[q.questionNo] ?? false}
                        setCollapsed={(v) =>
                          setCollapsedMap((prev) => ({ ...prev, [q.questionNo]: v }))
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
              )}

              {questions.length > 0 && (
                <Button
                  onClick={handleSaveQuestions}
                  disabled={savingQuestions}
                  className="mt-4 w-full bg-primary hover:bg-accent text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingQuestions ? "Saving Questions…" : "Save Questions"}
                </Button>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditTopicQuizModal;

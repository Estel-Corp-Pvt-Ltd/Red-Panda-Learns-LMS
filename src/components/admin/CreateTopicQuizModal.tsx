import { useState } from "react";
import { topicQuizService } from "@/services/topicQuizService";
import { QUIZ_STATUS } from "@/constants";
import { QuizStatus } from "@/types/general";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, BookOpen, LayoutDashboard, X } from "lucide-react";

interface CreateTopicQuizModalProps {
  open: boolean;
  onClose: () => void;
  createdBy: string;
  courseId: string;
  topicId: string;
  onCreated: (quizId: string, title: string) => void;
}

const CreateTopicQuizModal = ({
  open,
  onClose,
  createdBy,
  courseId,
  topicId,
  onCreated,
}: CreateTopicQuizModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingPercentage, setPassingPercentage] = useState<number>(40);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [enableFreeNavigation, setEnableFreeNavigation] = useState(true);
  const [status, setStatus] = useState<QuizStatus>(QUIZ_STATUS.DRAFT);
  const [xpReward, setXpReward] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPassingPercentage(40);
    setDurationMinutes(30);
    setEnableFreeNavigation(true);
    setStatus(QUIZ_STATUS.DRAFT);
    setXpReward(0);
    setError("");
    setLoading(false);
  };

  const handleCreate = async () => {
    setError("");

    if (!title.trim()) return setError("Title is required.");
    if (passingPercentage < 1 || passingPercentage > 100)
      return setError("Passing percentage must be 1–100.");
    if (durationMinutes <= 0)
      return setError("Duration must be greater than 0 minutes.");

    setLoading(true);

    const result = await topicQuizService.createTopicQuiz(createdBy, {
      courseId,
      topicId,
      title,
      description,
      passingPercentage,
      durationMinutes,
      enableFreeNavigation,
      status,
      xpReward,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error.message || "Failed to create quiz.");
      return;
    }

    onCreated(result.data.quizId, title);
    resetForm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-gray-950">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <BookOpen className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              Create Topic Quiz
            </DialogTitle>
          </DialogHeader>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tq-title">
                  Quiz Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tq-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 1 Check-in"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tq-desc">Description</Label>
                <Textarea
                  id="tq-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this quiz about?"
                  className="resize-none min-h-[80px]"
                />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <Checkbox
                  id="tq-nav"
                  checked={enableFreeNavigation}
                  onCheckedChange={(v) => setEnableFreeNavigation(Boolean(v))}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="tq-nav" className="font-medium cursor-pointer flex items-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Enable Sidebar Navigation
                  </Label>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tq-passing">
                    Passing % <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="tq-passing"
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
                  <Label>
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as QuizStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
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
                  <Label htmlFor="tq-duration">
                    Duration (min) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tq-duration"
                    type="number"
                    min="1"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    placeholder="e.g. 30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tq-xp">XP Reward</Label>
                  <Input
                    id="tq-xp"
                    type="number"
                    min="0"
                    value={xpReward}
                    onChange={(e) => setXpReward(Number(e.target.value))}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t p-6 bg-white dark:bg-gray-950 z-10 gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full sm:w-auto bg-primary hover:bg-accent text-white"
          >
            {loading ? "Creating..." : "Create Quiz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTopicQuizModal;

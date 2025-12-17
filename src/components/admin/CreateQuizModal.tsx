import { quizService } from "@/services/quizService";
import { Timestamp } from "firebase/firestore";
import { useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QUIZ_STATUS } from "@/constants";
import { userService } from "@/services/userService";
import { QuizStatus } from "@/types/general";
import { X, Calendar, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const CreateQuizModal = ({
    open,
    onClose,
    createdBy,
    courseId
}: {
    open: boolean;
    onClose: () => void;
    createdBy: string;
    courseId: string;
}) => {

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [allowAllStudents, setAllowAllStudents] = useState(true);
    const [allowedStudentEmails, setAllowedStudentEmails] = useState<string[]>([]);

    const [passingPercentage, setPassingPercentage] = useState<number>(40);

    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");

    const [durationMinutes, setDurationMinutes] = useState<number>(30);
    const [enableFreeNavigation, setEnableFreeNavigation] = useState(true);

    const [status, setStatus] = useState<QuizStatus>(QUIZ_STATUS.DRAFT);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const IST_OFFSET_MINUTES = 5 * 60 + 30;

    const buildTimestamp = (date: string, time: string) => {
        if (!date || !time) return null;

        const [year, month, day] = date.split("-").map(Number);
        const [hour, minute] = time.split(":").map(Number);

        // Treat input as IST, convert to UTC
        const istMillis = Date.UTC(year, month - 1, day, hour, minute);
        const utcMillis = istMillis - IST_OFFSET_MINUTES * 60 * 1000;

        return Timestamp.fromMillis(utcMillis);
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");

        setAllowAllStudents(true);
        setAllowedStudentEmails([]);

        setPassingPercentage(40);

        setScheduledDate("");
        setScheduledTime("");
        setEndDate("");
        setEndTime("");

        setDurationMinutes(30);
        setEnableFreeNavigation(true);

        setStatus(QUIZ_STATUS.DRAFT);

        setError("");
        setLoading(false);
    };

    const handleCreate = async () => {
        setError("");

        if (!title.trim()) return setError("Title is required.");
        if (!courseId.trim()) return setError("Course ID is required.");
        if (!status) return setError("Status is required.");

        if (!scheduledDate || !scheduledTime)
            return setError("Both start date and time are required.");

        if (passingPercentage < 1 || passingPercentage > 100)
            return setError("Passing percentage must be 1–100.");
        if (durationMinutes <= 0)
            return setError("Duration must be greater than 0 minutes.");

        const scheduledAt = buildTimestamp(scheduledDate, scheduledTime);
        if (!scheduledAt) {
            return setError("Start date and time are required.");
        }

        let endAt: Timestamp | null = null;

        if (endDate && endTime) {
            endAt = buildTimestamp(endDate, endTime);
            if (!endAt) {
                return setError("Invalid end date/time.");
            }

            if (endAt.toMillis() <= scheduledAt.toMillis()) {
                return setError("End time must be after start time.");
            }
        }

        if (endAt) {
            const maximumAllowedDuration = Math.round((endAt.toMillis() - scheduledAt.toMillis()) / (1000 * 60));
            if (maximumAllowedDuration < durationMinutes) {
                return setError(`Duration (${durationMinutes} minutes) doesn't match the time range between start and end (${maximumAllowedDuration} minutes).`);
            }
        }

        setLoading(true);

        const uidListResponse = await userService.getUidListForEmails(
            allowedStudentEmails.join(",")
        );

        let allowedStudentUids: string[] = [];

        if (uidListResponse.success) {
            allowedStudentUids = uidListResponse.data;
        }

        const quizData = {
            title,
            courseId,
            description,
            allowAllStudents: allowAllStudents || allowedStudentUids.length === 0,
            allowedStudentUids,
            passingPercentage,
            scheduledAt,
            endAt,
            durationMinutes,
            enableFreeNavigation,
            status
        };

        const result = await quizService.createQuiz(createdBy, quizData);

        setLoading(false);

        if (!result.success) {
            setError(result.error.message || "Failed to create quiz.");
            return;
        }

        resetForm();
        onClose();
    };

    return (
  <Dialog
    open={open}
    onOpenChange={() => {
      if (!open) {
        resetForm()
        onClose()
      }
    }}
  >
    <DialogContent className="max-w-2xl w-[95%] rounded-xl max-h-[90vh] overflow-y-auto
      bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">

      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pink-500" />
          Create Quiz
        </DialogTitle>
      </DialogHeader>

      {error && (
        <p className="text-sm p-3 rounded-lg
          text-red-600 bg-red-50
          dark:text-red-400 dark:bg-red-900/30">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

        {/* LEFT COLUMN */}
        <div className="space-y-4">

          <div className="space-y-1">
            <Label htmlFor="title">Quiz Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="passing">Passing Percentage *</Label>
            <Input
              id="passing"
              type="number"
              min="1"
              max="100"
              value={passingPercentage}
              onChange={(e) => setPassingPercentage(Number(e.target.value))}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
          </div>

          <div className="space-y-1">
            <Label>Status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as QuizStatus)}>
              <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {Object.values(QUIZ_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">

          {/* Start Time */}
          <div className="space-y-3 p-3 rounded-lg border
            bg-blue-50 border-blue-200
            dark:bg-blue-900/30 dark:border-blue-800">

            <Label className="font-semibold flex items-center gap-2
              text-blue-700 dark:text-blue-300">
              <Clock className="w-4 h-4" />
              Start Time *
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>

          {/* End Time */}
          <div className="space-y-3 p-3 rounded-lg border
            bg-orange-50 border-orange-200
            dark:bg-orange-900/30 dark:border-orange-800">

            <Label className="font-semibold flex items-center gap-2
              text-orange-700 dark:text-orange-300">
              <Clock className="w-4 h-4" />
              End Time
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={endDate}
                min={scheduledDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Duration (minutes) *</Label>
            <Input
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={allowAllStudents}
              onCheckedChange={(v) => setAllowAllStudents(Boolean(v))}
            />
            <Label>Allow all students</Label>
          </div>

          {!allowAllStudents && (
            <div className="space-y-2">
              <Label>Allowed Student Emails</Label>

              <div className="flex flex-wrap gap-2">
                {allowedStudentEmails.map(email => (
                  <span
                    key={email}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs
                      bg-blue-100 text-blue-800
                      dark:bg-blue-900/40 dark:text-blue-300">
                    {email}
                    <button
                      type="button"
                      onClick={() =>
                        setAllowedStudentEmails(prev => prev.filter(e => e !== email))
                      }
                      className="hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <Input
                placeholder="Add email or comma-separated emails"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
               onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();

                                            const raw = (e.target as HTMLInputElement).value.trim();
                                            if (!raw) return;

                                            const newEmails = raw
                                                .split(",")
                                                .map((v) => v.trim().toLowerCase())
                                                .filter((v) => v.length > 0);

                                            setAllowedStudentEmails((prev) => {
                                                const merged = new Set([...prev, ...newEmails]);
                                                return Array.from(merged);
                                            });

                                            (e.target as HTMLInputElement).value = "";
                                        }
                                    }}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              checked={enableFreeNavigation}
              onCheckedChange={(v) => setEnableFreeNavigation(Boolean(v))}
            />
            <Label>Enable sidebar navigation</Label>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={loading}>
          {loading ? "Creating…" : "Create Quiz"}
        </Button>
      </DialogFooter>

    </DialogContent>
  </Dialog>
)

};

export default CreateQuizModal;

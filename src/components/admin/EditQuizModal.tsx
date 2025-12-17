import { quizService } from "@/services/quizService";
import { userService } from "@/services/userService";
import { Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";

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
import { AlertCircle, Calendar, Clock, X } from "lucide-react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

import { QUIZ_STATUS } from "@/constants";

const EditQuizModal = ({
    open,
    onClose,
    quiz
}: {
    open: boolean;
    onClose: () => void;
    quiz: any;
}) => {

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [allowAllStudents, setAllowAllStudents] = useState(true);
    const [allowedStudentEmails, setAllowedStudentEmails] = useState<string[]>([]);
    const [newEmailInput, setNewEmailInput] = useState("");

    const [passingPercentage, setPassingPercentage] = useState<number>(40);

    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");

    const [durationMinutes, setDurationMinutes] = useState<number>(30);
    const [enableFreeNavigation, setEnableFreeNavigation] = useState(true);

    const [status, setStatus] = useState(QUIZ_STATUS.DRAFT);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const IST_OFFSET_MINUTES = 5 * 60 + 30;

    const timestampToIST = (ts: Timestamp) => {
        const date = new Date(ts.toMillis() + IST_OFFSET_MINUTES * 60 * 1000);

        const yyyy = date.getUTCFullYear();
        const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(date.getUTCDate()).padStart(2, "0");

        const hh = String(date.getUTCHours()).padStart(2, "0");
        const min = String(date.getUTCMinutes()).padStart(2, "0");

        return {
            date: `${yyyy}-${mm}-${dd}`,
            time: `${hh}:${min}`
        };
    };

    useEffect(() => {
        if (!quiz || !open) return;

        setTitle(quiz.title || "");
        setDescription(quiz.description || "");
        setAllowAllStudents(quiz.allowAllStudents ?? true);
        setPassingPercentage(quiz.passingPercentage ?? 40);
        setDurationMinutes(quiz.durationMinutes ?? 30);
        setEnableFreeNavigation(quiz.enableFreeNavigation ?? true);
        setStatus(quiz.status || QUIZ_STATUS.DRAFT);

        if (quiz.scheduledAt) {
            const d = timestampToIST(quiz.scheduledAt);
            setScheduledDate(d.date);
            setScheduledTime(d.time);
        }

        if (quiz.endAt) {
            const d = timestampToIST(quiz.endAt);
            setEndDate(d.date);
            setEndTime(d.time);
        }

        if (quiz.allowedStudentUids?.length > 0) {
            userService.getEmailsForUidList(quiz.allowedStudentUids).then((res) => {
                if (res.success) {
                    setAllowedStudentEmails(res.data.filter(Boolean));
                }
            });
        } else {
            setAllowedStudentEmails([]);
        }

    }, [quiz, open]);

    const buildTimestamp = (date: string, time: string) => {
        if (!date || !time) return null;

        const [year, month, day] = date.split("-").map(Number);
        const [hour, minute] = time.split(":").map(Number);

        // Treat input as IST, convert to UTC
        const istMillis = Date.UTC(year, month - 1, day, hour, minute);
        const utcMillis = istMillis - IST_OFFSET_MINUTES * 60 * 1000;

        return Timestamp.fromMillis(utcMillis);
    };

    const addEmailsFromInput = () => {
        if (!newEmailInput.trim()) return;

        const parts = newEmailInput
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

        setAllowedStudentEmails((prev) => {
            const merged = [...prev];
            parts.forEach((em) => {
                if (!merged.includes(em)) merged.push(em);
            });
            return merged;
        });

        setNewEmailInput("");
    };

    const removeEmail = (email: string) => {
        setAllowedStudentEmails((prev) => prev.filter((e) => e !== email));
    };

    const validateForm = () => {
        setError("");

        if (!title.trim()) return "Title is required.";
        if (!status) return "Status is required.";

        if (!scheduledDate || !scheduledTime)
            return "Both start date and time are required.";

        if (passingPercentage < 1 || passingPercentage > 100)
            return "Passing percentage must be 1–100.";
        if (durationMinutes <= 0)
            return "Duration must be greater than 0 minutes.";

        const scheduledAt = buildTimestamp(scheduledDate, scheduledTime);
        if (!scheduledAt) {
            return "Start date and time are required.";
        }

        let endAt: Timestamp | null = null;

        if (endDate && endTime) {
            endAt = buildTimestamp(endDate, endTime);
            if (!endAt) {
                return "Invalid end date/time.";
            }

            if (endAt.toMillis() <= scheduledAt.toMillis()) {
                return "End time must be after start time.";
            }
        }

        if (endAt) {
            const maximumAllowedDuration = Math.round((endAt.toMillis() - scheduledAt.toMillis()) / (1000 * 60));
            if (maximumAllowedDuration < durationMinutes) {
                return `Duration (${durationMinutes} minutes) doesn't match the time range between start and end (${maximumAllowedDuration} minutes).`;
            }
        }

        return null;
    };

    const handleSave = async () => {
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        let allowedStudentUids: string[] = [];

        if (!allowAllStudents) {
            const response = await userService.getUidListForEmails(
                allowedStudentEmails.join(",")
            );

            if (!response.success) {
                setLoading(false);
                setError("Failed to validate student emails.");
                return;
            }

            allowedStudentUids = response.data;
        }

        const scheduledAt = buildTimestamp(scheduledDate, scheduledTime);
        const endAt = buildTimestamp(endDate, endTime);

        if (!scheduledAt) {
            setLoading(false);
            setError("Invalid date/time configuration.");
            return;
        }

        const updated = {
            title,
            description,
            allowAllStudents: allowAllStudents || allowedStudentUids.length === 0,
            allowedStudentUids,
            passingPercentage,
            scheduledAt,
            endAt: endAt,
            durationMinutes,
            enableFreeNavigation,
            status
        };

        const result = await quizService.updateQuiz(quiz.id, updated);
        setLoading(false);

        if (!result.success) {
            setError(result.error.message || "Failed to update quiz.");
            return;
        }
        console.log("Quiz updated successfully:", updated, endDate, endTime);
        onClose();
    };

    const handleTimeChange = (type: 'start' | 'end' | 'duration', value: any) => {
        switch (type) {
            case 'start':
                if (value.date) setScheduledDate(value.date);
                if (value.time) setScheduledTime(value.time);
                break;
            case 'end':
                if (value.date) setEndDate(value.date);
                if (value.time) setEndTime(value.time);
                break;
            case 'duration':
                setDurationMinutes(value);
                break;
        }
    };

return (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent
      className="max-w-2xl w-[95%] rounded-xl max-h-[90vh] overflow-y-auto
      bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pink-500" />
          Edit Quiz
        </DialogTitle>
      </DialogHeader>

      {error && (
        <div
          className="flex items-center gap-2 text-sm p-3 rounded-lg
          text-red-600 bg-red-50
          dark:text-red-400 dark:bg-red-900/30"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Quiz Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
          </div>

          <div className="space-y-1">
            <Label>Status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
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

          <div className="space-y-1">
            <Label>Passing Percentage *</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={passingPercentage}
              onChange={(e) => setPassingPercentage(Number(e.target.value))}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">

          {/* Start Time */}
          <div
            className="space-y-3 p-3 rounded-lg border
            bg-blue-50 border-blue-200
            dark:bg-blue-900/30 dark:border-blue-800"
          >
            <Label className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Clock className="w-4 h-4" />
              Start Time *
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => handleTimeChange('start', { date: e.target.value })}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => handleTimeChange('start', { time: e.target.value })}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>

          {/* End Time */}
          <div
            className="space-y-3 p-3 rounded-lg border
            bg-orange-50 border-orange-200
            dark:bg-orange-900/30 dark:border-orange-800"
          >
            <Label className="font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Clock className="w-4 h-4" />
              End Time
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={endDate}
                min={scheduledDate}
                onChange={(e) => handleTimeChange('end', { date: e.target.value })}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => handleTimeChange('end', { time: e.target.value })}
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
              onChange={(e) => handleTimeChange('duration', Number(e.target.value))}
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
                      dark:bg-blue-900/40 dark:text-blue-300"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newEmailInput}
                  placeholder="Add email or comma-separated emails"
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addEmailsFromInput()
                    }
                  }}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
                <Button variant="outline" onClick={addEmailsFromInput}>
                  Add
                </Button>
              </div>
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
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

};

export default EditQuizModal;

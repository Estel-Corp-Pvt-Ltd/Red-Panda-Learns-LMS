"use client";

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
import { X, Calendar, Clock, AlertCircle } from "lucide-react";

import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
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

    useEffect(() => {
        if (!quiz || !open) return;

        setTitle(quiz.title || "");
        setDescription(quiz.description || "");
        setAllowAllStudents(quiz.allowAllStudents ?? true);
        setPassingPercentage(quiz.passingPercentage ?? 40);
        setDurationMinutes(quiz.durationMinutes ?? 30);
        setEnableFreeNavigation(quiz.enableFreeNavigation ?? true);
        setStatus(quiz.status || QUIZ_STATUS.DRAFT);

        // Set scheduled date/time
        if (quiz.scheduledAt) {
            const d = quiz.scheduledAt.toDate();
            setScheduledDate(d.toISOString().split("T")[0]);
            setScheduledTime(d.toTimeString().slice(0, 5));
        }

        // Set end date/time
        if (quiz.endAt) {
            const d = quiz.endAt.toDate();
            setEndDate(d.toISOString().split("T")[0]);
            setEndTime(d.toTimeString().slice(0, 5));
        } else if (quiz.scheduledAt && quiz.durationMinutes) {
            // Calculate end time if not explicitly set
            const startDate = quiz.scheduledAt.toDate();
            const endDate = new Date(startDate.getTime() + quiz.durationMinutes * 60000);
            setEndDate(endDate.toISOString().split("T")[0]);
            setEndTime(endDate.toTimeString().slice(0, 5));
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

    const getCombinedTimestamp = (date: string, time: string) => {
        if (!date || !time) return null;

        const [hours, minutes] = time.split(":").map(Number);
        const combined = new Date(date);
        combined.setHours(hours);
        combined.setMinutes(minutes);
        combined.setSeconds(0);

        return Timestamp.fromDate(combined);
    };

    const calculateEndDateTime = () => {
        if (!scheduledDate || !scheduledTime || !durationMinutes) return { date: "", time: "" };

        const startDateTime = getCombinedTimestamp(scheduledDate, scheduledTime);
        if (!startDateTime) return { date: "", time: "" };

        const startDate = startDateTime.toDate();
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

        const dateStr = endDate.toISOString().split('T')[0];
        const timeStr = endDate.toTimeString().slice(0, 5);

        return { date: dateStr, time: timeStr };
    };

    const autoFillEndDateTime = () => {
        const { date, time } = calculateEndDateTime();
        if (date && time) {
            setEndDate(date);
            setEndTime(time);
        }
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
        if (!title.trim()) return "Title is required.";
        if (!scheduledDate || !scheduledTime) return "Both start date and time are required.";
        if (!endDate || !endTime) return "Both end date and time are required.";
        if (passingPercentage < 1 || passingPercentage > 100) return "Passing percentage must be 1–100.";
        if (durationMinutes <= 0) return "Duration must be greater than 0 minutes.";

        const scheduledAt = getCombinedTimestamp(scheduledDate, scheduledTime);
        const endAt = getCombinedTimestamp(endDate, endTime);

        if (!scheduledAt || !endAt) return "Invalid date/time format.";
        if (endAt.toDate() <= scheduledAt.toDate()) return "End time must be after start time.";

        // Validate duration matches the time range
        const calculatedDuration = Math.round((endAt.toDate().getTime() - scheduledAt.toDate().getTime()) / (1000 * 60));
        if (calculatedDuration < durationMinutes) {
            return `Duration (${durationMinutes} minutes) doesn't match the time range between start and end (${calculatedDuration} minutes).`;
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

        const scheduledAt = getCombinedTimestamp(scheduledDate, scheduledTime);
        const endAt = getCombinedTimestamp(endDate, endTime);

        if (!scheduledAt || !endAt) {
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
            endAt,
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
                autoFillEndDateTime();
                break;
            case 'end':
                if (value.date) setEndDate(value.date);
                if (value.time) setEndTime(value.time);
                break;
            case 'duration':
                setDurationMinutes(value);
                autoFillEndDateTime();
                break;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl w-[95%] rounded-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Edit Quiz
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
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
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="status">Status *</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
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

                        <div className="space-y-1">
                            <Label htmlFor="passing">Passing Percentage *</Label>
                            <Input
                                id="passing"
                                type="number"
                                min="1"
                                max="100"
                                value={passingPercentage}
                                onChange={(e) => setPassingPercentage(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">

                        {/* Start Time Section */}
                        <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Label className="text-blue-700 font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Start Time *
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="scheduledDate" className="text-sm">Date</Label>
                                    <Input
                                        id="scheduledDate"
                                        type="date"
                                        value={scheduledDate}
                                        onChange={(e) => handleTimeChange('start', { date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="scheduledTime" className="text-sm">Time</Label>
                                    <Input
                                        id="scheduledTime"
                                        type="time"
                                        value={scheduledTime}
                                        onChange={(e) => handleTimeChange('start', { time: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* End Time Section */}
                        <div className="space-y-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <Label className="text-orange-700 font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                End Time *
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="endDate" className="text-sm">Date</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => handleTimeChange('end', { date: e.target.value })}
                                        min={scheduledDate}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="endTime" className="text-sm">Time</Label>
                                    <Input
                                        id="endTime"
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => handleTimeChange('end', { time: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="duration">Duration (minutes) *</Label>
                            <Input
                                id="duration"
                                type="number"
                                min="1"
                                value={durationMinutes}
                                onChange={(e) => handleTimeChange('duration', Number(e.target.value))}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="allowAll"
                                checked={allowAllStudents}
                                onCheckedChange={(v) => setAllowAllStudents(Boolean(v))}
                            />
                            <Label htmlFor="allowAll">Allow all students</Label>
                        </div>

                        {!allowAllStudents && (
                            <div className="space-y-2">
                                <Label>Allowed Student Emails</Label>

                                <div className="flex flex-wrap gap-2">
                                    {allowedStudentEmails.map((email) => (
                                        <span
                                            key={email}
                                            className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs"
                                        >
                                            {email}
                                            <button
                                                type="button"
                                                onClick={() => removeEmail(email)}
                                                className="text-blue-500 hover:text-blue-700"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add email or comma-separated emails"
                                        value={newEmailInput}
                                        onChange={(e) => setNewEmailInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === ",") {
                                                e.preventDefault();
                                                addEmailsFromInput();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addEmailsFromInput}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sidebarNav"
                                checked={enableFreeNavigation}
                                onCheckedChange={(v) => setEnableFreeNavigation(Boolean(v))}
                            />
                            <Label htmlFor="sidebarNav">Enable sidebar navigation</Label>
                        </div>

                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>

                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving…" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditQuizModal;

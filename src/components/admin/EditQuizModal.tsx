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
import { X } from "lucide-react";

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

    const [durationMinutes, setDurationMinutes] = useState<number>(30);
    const [enableSidebarNavigation, setEnableSidebarNavigation] = useState(true);

    const [status, setStatus] = useState(QUIZ_STATUS.DRAFT);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    /** --------------------------------------------
     *   Load quiz data on open
     * -------------------------------------------- */
    useEffect(() => {
        if (!quiz || !open) return;

        setTitle(quiz.title || "");
        setDescription(quiz.description || "");
        setAllowAllStudents(quiz.allowAllStudents ?? true);
        setPassingPercentage(quiz.passingPercentage ?? 40);
        setDurationMinutes(quiz.durationMinutes ?? 30);
        setEnableSidebarNavigation(quiz.enableSidebarNavigation ?? true);
        setStatus(quiz.status || QUIZ_STATUS.DRAFT);

        if (quiz.scheduledAt) {
            const d = quiz.scheduledAt.toDate();
            setScheduledDate(d.toISOString().split("T")[0]);
            setScheduledTime(d.toTimeString().slice(0, 5));
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


    /** Combine date + time → Timestamp */
    const getCombinedTimestamp = () => {
        if (!scheduledDate || !scheduledTime) return null;

        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const combined = new Date(scheduledDate);
        combined.setHours(hours);
        combined.setMinutes(minutes);
        combined.setSeconds(0);

        return Timestamp.fromDate(combined);
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


    /** --------------------------------------------
     *   Save changes
     * -------------------------------------------- */
    const handleSave = async () => {
        setError("");

        if (!title.trim()) return setError("Title is required.");
        if (!scheduledDate || !scheduledTime)
            return setError("Both date and time are required.");
        if (passingPercentage < 1 || passingPercentage > 100)
            return setError("Passing percentage must be 1–100.");
        if (durationMinutes <= 0)
            return setError("Duration must be greater than 0 minutes.");

        const ts = getCombinedTimestamp();
        if (!ts) return setError("Invalid date/time.");

        setLoading(true);

        let allowedStudentUids: string[] = [];

        if (!allowAllStudents) {
            const response = await userService.getUidListForEmails(
                allowedStudentEmails.join(",")
            );

            if (!response.success) {
                setLoading(false);
                return setError(response.error.message);
            }

            allowedStudentUids = response.data;
        }

        const updated = {
            title,
            description,
            allowAllStudents: allowAllStudents || allowedStudentUids.length === 0,
            allowedStudentUids,
            passingPercentage,
            scheduledAt: ts,
            durationMinutes,
            enableSidebarNavigation,
            status
        };

        const result = await quizService.updateQuiz(quiz.id, updated);
        setLoading(false);

        if (!result.success) {
            setError(result.error.message || "Failed to update quiz.");
            return;
        }

        onClose();
    };


    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl w-[95%] rounded-xl">
                <DialogHeader>
                    <DialogTitle>Edit Quiz</DialogTitle>
                </DialogHeader>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

                    {/* LEFT */}
                    <div className="space-y-4">
                        <div>
                            <Label>Quiz Title</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Status</Label>
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

                        <div>
                            <Label>Passing Percentage</Label>
                            <Input
                                type="number"
                                value={passingPercentage}
                                onChange={(e) => setPassingPercentage(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="space-y-4">

                        <div>
                            <Label>Quiz Date</Label>
                            <Input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Quiz Time</Label>
                            <Input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Duration (minutes)</Label>
                            <Input
                                type="number"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={allowAllStudents}
                                onCheckedChange={(v) => setAllowAllStudents(Boolean(v))}
                            />
                            <Label>Allow all students</Label>
                        </div>

                        {!allowAllStudents && (
                            <div className="space-y-2">
                                <Label>Allowed Students</Label>

                                <div className="flex flex-wrap gap-2">
                                    {allowedStudentEmails.map((email) => (
                                        <span
                                            key={email}
                                            className="px-2 py-1 bg-gray-200 rounded-full flex items-center gap-1 text-sm"
                                        >
                                            {email}
                                            <X
                                                className="h-3 w-3 cursor-pointer"
                                                onClick={() => removeEmail(email)}
                                            />
                                        </span>
                                    ))}
                                </div>

                                <Input
                                    placeholder="Add email(s)…"
                                    value={newEmailInput}
                                    onChange={(e) => setNewEmailInput(e.target.value)}
                                    onBlur={addEmailsFromInput}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === ",") {
                                            e.preventDefault();
                                            addEmailsFromInput();
                                        }
                                    }}
                                />
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={enableSidebarNavigation}
                                onCheckedChange={(v) => setEnableSidebarNavigation(Boolean(v))}
                            />
                            <Label>Enable sidebar navigation</Label>
                        </div>

                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>

                    <Button disabled={loading} onClick={handleSave}>
                        {loading ? "Saving…" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditQuizModal;

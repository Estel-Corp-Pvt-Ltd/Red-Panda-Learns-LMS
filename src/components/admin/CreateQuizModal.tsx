"use client";

import { quizService } from "@/services/quizService";
import { Timestamp } from "firebase/firestore";
import { useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { userService } from "@/services/userService";

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

    // 🔥 NEW — separate date + time states
    const [scheduledDate, setScheduledDate] = useState(""); // yyyy-mm-dd
    const [scheduledTime, setScheduledTime] = useState(""); // hh:mm

    const [durationMinutes, setDurationMinutes] = useState<number>(30);
    const [enableSidebarNavigation, setEnableSidebarNavigation] = useState(true);
    const [isVisible, setIsVisible] = useState(true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    /** ------------------------------
     *  Combine Date + Time -> Timestamp
     *  ------------------------------ */
    const getCombinedTimestamp = () => {
        if (!scheduledDate || !scheduledTime) return null;

        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const combined = new Date(scheduledDate);
        combined.setHours(hours);
        combined.setMinutes(minutes);
        combined.setSeconds(0);

        return Timestamp.fromDate(combined);
    };


    const handleCreate = async () => {
        setError("");

        if (!title.trim()) return setError("Title is required.");
        if (!courseId.trim()) return setError("Course ID is required.");
        if (!scheduledDate || !scheduledTime)
            return setError("Both date and time are required.");
        if (passingPercentage < 1 || passingPercentage > 100)
            return setError("Passing percentage must be 1–100.");
        if (durationMinutes <= 0)
            return setError("Duration must be greater than 0 minutes.");

        const ts = getCombinedTimestamp();
        if (!ts) return setError("Invalid scheduled date/time.");

        setLoading(true);

        const uidListResponse = await userService.getUidListForEmails(allowedStudentEmails.join(","));
        let allowedStudentUids: string[];
        if (uidListResponse) {
            allowedStudentUids = uidListResponse.data;
        }

        const quizData = {
            title,
            courseId,
            description,
            allowAllStudents,
            allowedStudentUids,
            questions: [],
            passingPercentage,
            scheduledAt: ts,
            durationMinutes,
            enableSidebarNavigation,
            isVisible
        };

        const result = await quizService.createQuiz(createdBy, quizData);

        setLoading(false);

        if (!result.success) {
            setError(result.error.message || "Failed to create quiz.");
            return;
        }

        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl w-[95%] rounded-xl">
                <DialogClose className="absolute right-4 top-4 opacity-70 hover:opacity-100">
                    <X className="h-5 w-5" />
                </DialogClose>

                <DialogHeader>
                    <DialogTitle>Create Quiz</DialogTitle>
                </DialogHeader>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

                    {/* LEFT COLUMN */}
                    <div className="space-y-4">
                        {/* Title */}
                        <div className="space-y-1">
                            <Label htmlFor="title">Quiz Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter quiz title"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description"
                            />
                        </div>

                        {/* Passing Percentage */}
                        <div className="space-y-1">
                            <Label htmlFor="passing">Passing Percentage</Label>
                            <Input
                                id="passing"
                                type="number"
                                value={passingPercentage}
                                onChange={(e) => setPassingPercentage(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">

                        {/* 🔥 NEW — Separate date */}
                        <div className="space-y-1">
                            <Label htmlFor="scheduledDate">Exam Date</Label>
                            <Input
                                id="scheduledDate"
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                            />
                        </div>

                        {/* 🔥 NEW — Separate time */}
                        <div className="space-y-1">
                            <Label htmlFor="scheduledTime">Exam Time</Label>
                            <Input
                                id="scheduledTime"
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                            />
                        </div>

                        {/* Duration */}
                        <div className="space-y-1">
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                            />
                        </div>

                        {/* Allow all students */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="allowAll"
                                checked={allowAllStudents}
                                onCheckedChange={(v) => setAllowAllStudents(Boolean(v))}
                            />
                            <Label htmlFor="allowAll">Allow all students</Label>
                        </div>

                        {!allowAllStudents && (
                            <div className="space-y-1">
                                <Label htmlFor="emails">Allowed Student Emails</Label>
                                <Textarea
                                    id="emails"
                                    placeholder="Comma-separated Emails"
                                    value={allowedStudentEmails.join(",")}
                                    onChange={(e) =>
                                        setAllowedStudentEmails(
                                            e.target.value.split(",").map((v) => v.trim())
                                        )
                                    }
                                />
                            </div>
                        )}

                        {/* Sidebar navigation */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sidebarNav"
                                checked={enableSidebarNavigation}
                                onCheckedChange={(v) =>
                                    setEnableSidebarNavigation(Boolean(v))
                                }
                            />
                            <Label htmlFor="sidebarNav">Enable sidebar navigation</Label>
                        </div>

                        {/* Visibility */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isVisible"
                                checked={isVisible}
                                onCheckedChange={(v) => setIsVisible(Boolean(v))}
                            />
                            <Label htmlFor="isVisible">Quiz visible to students</Label>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>

                    <Button onClick={handleCreate} disabled={loading}>
                        {loading ? "Creating…" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateQuizModal;

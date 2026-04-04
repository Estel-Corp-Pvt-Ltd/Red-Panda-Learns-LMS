import { quizService } from "@/services/quizService";
import { Timestamp } from "firebase/firestore";
import { useState } from "react";


import { userService } from "@/services/userService";

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog"; // Assuming shadcn structure
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  X, Calendar, Clock, Users, BookOpen, AlertCircle, LayoutDashboard 
} from "lucide-react";
import { QuizStatus } from "@/types/general";
import { QUIZ_STATUS } from "@/constants";
// Assuming these types exist in your project

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
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-gray-950">
        
        {/* MODAL HEADER & CLOSE BUTTON */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <BookOpen className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              Create New Quiz
            </DialogTitle>
          </DialogHeader>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-8 w-8 rounded-full hover:bg-primary dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* --- LEFT COLUMN: GENERAL INFO --- */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
                  General Information
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Quiz Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Advanced Mathematics Final"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this quiz about?"
                      className="resize-none min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="passing">Passing % <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          id="passing"
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
                      <Label>Status <span className="text-red-500">*</span></Label>
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
                </div>
              </div>

              <div className="pt-4 border-t dark:border-gray-800">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                   <Checkbox
                    id="nav-check"
                    checked={enableFreeNavigation}
                    onCheckedChange={(v) => setEnableFreeNavigation(Boolean(v))}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="nav-check" className="font-medium cursor-pointer flex items-center gap-2">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Enable Sidebar Navigation
                    </Label>
                  
                  </div>
                </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN: SCHEDULING & AUDIENCE --- */}
            <div className="space-y-6">
              
              {/* Scheduling Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Scheduling
                </h3>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4 bg-white dark:bg-gray-900">
                  {/* Start */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 font-semibold uppercase">Start Date & Time <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* End */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 font-semibold uppercase">End Date & Time</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={endDate}
                        min={scheduledDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      Duration (Minutes) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      placeholder="e.g. 60"
                    />
                  </div>
                </div>
              </div>

              {/* Audience Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" /> Access Control
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="all-students"
                      checked={allowAllStudents}
                      onCheckedChange={(v) => setAllowAllStudents(Boolean(v))}
                    />
                    <Label htmlFor="all-students" className="cursor-pointer">Open to all students</Label>
                  </div>

                  {!allowAllStudents && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Label className="text-xs">Allowed Emails</Label>
                      
                      <div className="min-h-[80px] p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
                        {allowedStudentEmails.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {allowedStudentEmails.map(email => (
                              <span
                                key={email}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                  bg-blue-100 text-blue-700 border border-blue-200
                                  dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                              >
                                {email}
                                <button
                                  type="button"
                                  onClick={() => setAllowedStudentEmails((prev: any) => prev.filter((e: any) => e !== email))}
                                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                                  aria-label={`Remove ${email}`}
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <Input
                          placeholder="Type email and press Enter..."
                          className="bg-transparent border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-gray-400"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const raw = (e.target as HTMLInputElement).value.trim();
                              if (!raw) return;

                              const newEmails = raw
                                .split(",")
                                .map((v) => v.trim().toLowerCase())
                                .filter((v) => v.length > 0 && v.includes("@")); // Basic validation

                              setAllowedStudentEmails((prev: any) => {
                                const merged = new Set([...prev, ...newEmails]);
                                return Array.from(merged);
                              });
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 text-right">Press <kbd className="font-sans border rounded px-1">Enter</kbd> to add</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t p-6 bg-white dark:bg-gray-950 z-10 flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="w-full sm:w-auto bg-primary hover:bg-accent text-white">
            {loading ? (
              <span className="flex items-center gap-2">Creating...</span>
            ) : (
              "Create Quiz"
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );

};

export default CreateQuizModal;

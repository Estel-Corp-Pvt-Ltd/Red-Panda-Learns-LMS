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
import { AlertCircle, Calendar, Clock, LayoutDashboard, Save, Settings2, Users, X } from "lucide-react";

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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-gray-950 border-0 shadow-2xl">
        
        {/* HEADER */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b px-6 py-4 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Settings2 className="w-5 h-5" />
              </div>
              Edit Quiz
            </DialogTitle>
          </DialogHeader>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full hover:bg-accent hover:text-accent-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* --- LEFT COLUMN --- */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                  Quiz Details
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quiz Title <span className="text-red-500">*</span></Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter quiz title"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional description..."
                      className="resize-none min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                      <Label>Status <span className="text-red-500">*</span></Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as any)}>
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

                    <div className="space-y-2">
                      <Label>Passing % <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={passingPercentage}
                          onChange={(e) => setPassingPercentage(Number(e.target.value))}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Card */}
              <div className="pt-4 border-t">
                 <div className="flex items-start gap-3 p-3 rounded-lg border bg-accent/20">
                    <Checkbox
                      id="edit-nav-check"
                      checked={enableFreeNavigation}
                      onCheckedChange={(v) => setEnableFreeNavigation(Boolean(v))}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="edit-nav-check" className="font-medium cursor-pointer flex items-center gap-2">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Sidebar Navigation
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Allow students to navigate freely between questions via the sidebar.
                      </p>
                    </div>
                  </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN --- */}
            <div className="space-y-6">
              
              {/* Scheduling */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Scheduling
                </h3>

                <div className="rounded-xl border p-4 space-y-4 bg-card shadow-sm">
                  {/* Start Time */}
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-muted-foreground uppercase">Start Date & Time <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => handleTimeChange('start', { date: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => handleTimeChange('start', { time: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-muted-foreground uppercase">End Date & Time</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={endDate}
                        min={scheduledDate}
                        onChange={(e) => handleTimeChange('end', { date: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => handleTimeChange('end', { time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Duration (Minutes) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={durationMinutes}
                      onChange={(e) => handleTimeChange('duration', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Access Control */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" /> Participants
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit-all-students"
                      checked={allowAllStudents}
                      onCheckedChange={(v) => setAllowAllStudents(Boolean(v))}
                    />
                    <Label htmlFor="edit-all-students">Allow all students</Label>
                  </div>

                  {!allowAllStudents && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                       <Label className="text-xs">Whitelist Emails</Label>
                      
                      <div className="min-h-[90px] p-3 rounded-lg border border-dashed bg-accent/10 space-y-3">
                        {allowedStudentEmails.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {allowedStudentEmails.map((email: string) => (
                              <span
                                key={email}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                              >
                                {email}
                                <button
                                  type="button"
                                  onClick={() => removeEmail(email)}
                                  className="ml-1 hover:text-red-500 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Input
                            value={newEmailInput}
                            placeholder="Add email..."
                            onChange={(e) => setNewEmailInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                addEmailsFromInput();
                              }
                            }}
                            className="bg-transparent shadow-none border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50"
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={addEmailsFromInput}
                            disabled={!newEmailInput}
                            className="h-8 text-xs hover:bg-primary hover:text-primary-foreground"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="sticky bottom-0 border-t p-6 bg-white dark:bg-gray-950 z-20">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md min-w-[120px]"
          >
            {loading ? (
               "Saving..."
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Changes
              </span>
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )

};

export default EditQuizModal;

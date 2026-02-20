import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LESSON_TYPE } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { fileService } from "@/services/fileService";
import { lessonService } from "@/services/lessonService";
import { Lesson } from "@/types/lesson";
import { logError } from "@/utils/logger";
import {
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import MarkdownEditor from "../markdownEditor/MarkdownEditorComponent";
import VideoPlayer from "../VideoPlayer";

type CreateLessonModalProps = {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onLessonCreated?: (lesson: Lesson, shouldAutoSave?: boolean) => void;
};

export const CreateLessonModal = ({
  courseId,
  isOpen,
  onClose,
  onLessonCreated,
}: CreateLessonModalProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lesson, setLesson] = useState({
    title: "",
    type: LESSON_TYPE.SLIDE_DECK as Lesson["type"],
    description: "",
    embedUrl: "",
    duration: { hours: 0, minutes: 0 },
    karmaBoostExpiresAfter: { hours: 0, minutes: 0 },
    durationAddedtoLearningProgress: false,
  });

  // Add scroll management
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const colorMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  const handleFieldChange = (field: string, value: any) => {
    if (field === "duration-hours") {
      setLesson((prev) => ({
        ...prev,
        duration: { ...prev.duration, hours: value },
      }));
    } else if (field === "duration-minutes") {
      setLesson((prev) => ({
        ...prev,
        duration: { ...prev.duration, minutes: value },
      }));
    } else if (field === "karmaBoost-hours") {
      setLesson((prev) => ({
        ...prev,
        karmaBoostExpiresAfter: {
          ...prev.karmaBoostExpiresAfter,
          hours: value,
        },
      }));
    } else if (field === "karmaBoost-minutes") {
      setLesson((prev) => ({
        ...prev,
        karmaBoostExpiresAfter: {
          ...prev.karmaBoostExpiresAfter,
          minutes: value,
        },
      }));
    } else {
      setLesson((prev) => ({ ...prev, [field]: value }));
    }
  };

  // ... (Keep existing fetchVideoDuration and handlePdfUpload functions) ...
  const fetchVideoDuration = async (url: string) => {
    // [Keep existing implementation]
    try {
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        // ... (existing logic)
      } else if (url.includes("vimeo.com")) {
        // ... (existing logic)
      }
    } catch (error) {
      console.error("Error fetching video duration", error);
    }
  };

  const handlePdfUpload = async (file: File) => {
    // [Keep existing implementation]
    if (!file) return;
    setUploading(true);
    try {
      const fileUrl = await fileService.uploadAttachment(`/courses/${courseId}/lessons`, file);
      if (fileUrl.success) {
        setLesson({ ...lesson, embedUrl: fileUrl.data });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setLesson({
      title: "",
      type: LESSON_TYPE.SLIDE_DECK,
      description: "",
      embedUrl: "",
      duration: { hours: 0, minutes: 0 },
      karmaBoostExpiresAfter: { hours: 0, minutes: 0 },
      durationAddedtoLearningProgress: false,
    });
  };

  const handleSave = async () => {
    try {
      if (!lesson.title.trim()) {
        toast({ title: "Lesson title is required", variant: "destructive" });
        return;
      }

      setSaving(true);

      const newLesson = await lessonService.createLesson({ ...lesson, courseId });
      toast({ title: "Lesson created successfully!" });
      onLessonCreated?.(newLesson);
      resetForm();
      onClose();
    } catch (err) {
      logError("Error creating lesson:", err);
      toast({ title: "Failed to create lesson", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] sm:max-w-6xl bg-card text-card-foreground overflow-y-auto max-h-[90vh] p-0 gap-0">
        <div className="px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Lesson</DialogTitle>
            <DialogDescription>
              Configure the details for your new course content.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
            {/* Left Column: Title & Description */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base">Lesson Title</Label>
                <Input
                  placeholder="e.g. Introduction to Advanced Mathematics"
                  value={lesson.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  className="h-10 text-base dark:bg-neutral-800/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Description</Label>
                <div
                  data-color-mode={colorMode}
                  className="border rounded-lg dark:border-neutral-800"
                >
                  <MarkdownEditor
                    value={lesson.description}
                    onChange={(value) => handleFieldChange("description", value || "")}
                    height={200}
                    uploadPath="/courses/lessons/attachments"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Settings */}
            <div className="space-y-6">
              <div className="p-4 rounded-xl border bg-card dark:bg-neutral-900/20">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Lesson Type</Label>
                    <Select
                      value={lesson.type}
                      onValueChange={(val) => handleFieldChange("type", val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LESSON_TYPE).map(([key, val]) => (
                          <SelectItem key={key} value={val}>
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic Fields based on Type */}
                  {lesson.type === LESSON_TYPE.PDF ? (
                    <div className="space-y-2">
                      <Label>PDF File</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition cursor-pointer relative">
                        <Input
                          type="file"
                          accept="application/pdf"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handlePdfUpload(e.target.files![0])}
                        />
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {uploading
                              ? "Uploading..."
                              : lesson.embedUrl
                                ? "File Attached"
                                : "Click to Upload PDF"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    lesson.type !== LESSON_TYPE.TEXT && (
                      <div className="space-y-2">
                        <Label>Resource URL</Label>
                        <Input
                          placeholder="https://..."
                          value={lesson.embedUrl}
                          onChange={(e) => handleFieldChange("embedUrl", e.target.value)}
                          onBlur={() => fetchVideoDuration(lesson.embedUrl)}
                        />
                      </div>
                    )
                  )}

                  <div className="pt-4 border-t space-y-4">
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type="number"
                            min="0"
                            value={lesson.duration.hours}
                            onChange={(e) =>
                              handleFieldChange("duration-hours", parseInt(e.target.value) || 0)
                            }
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                            hrs
                          </span>
                        </div>
                        <div className="flex-1 relative">
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={lesson.duration.minutes}
                            onChange={(e) =>
                              handleFieldChange(
                                "duration-minutes",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                            min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Karma Validity</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type="number"
                            min="0"
                            value={lesson.karmaBoostExpiresAfter.hours}
                            onChange={(e) =>
                              handleFieldChange(
                                "karmaBoost-hours",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                            hrs
                          </span>
                        </div>
                        <div className="flex-1 relative">
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={lesson.karmaBoostExpiresAfter.minutes}
                            onChange={(e) =>
                              handleFieldChange(
                                "karmaBoost-minutes",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                            min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-muted/10">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
            {saving ? <>Saving...</> : <>Save Lesson</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

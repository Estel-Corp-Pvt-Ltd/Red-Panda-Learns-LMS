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
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import MarkdownEditor from "../markdownEditor/MarkdownEditorComponent";

type CreateLessonModalProps = {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onLessonCreated?: (lesson: Lesson) => void;
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
  });

  // Add scroll management
  useEffect(() => {
    if (isOpen) {
      // When modal opens, store the current scroll position
      document.body.style.overflow = 'hidden';
    } else {
      // When modal closes, restore scrolling
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const colorMode =
    typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  const handleFieldChange = (field: string, value: any) => {
    if (field === "duration-hours") {
      setLesson(prev => ({ ...prev, duration: { hours: value, minutes: prev.duration.minutes } }));
    } else if (field === "duration-minutes") {
      setLesson(prev => ({ ...prev, duration: { hours: prev.duration.hours, minutes: value } }));
    } else {
      setLesson({ ...lesson, [field]: value });
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      if (file.type !== "application/pdf") {
        toast({ title: "Please upload a valid PDF file", variant: "destructive" });
        setUploading(false);
        return;
      }
      const fileUrl = await fileService.uploadAttachment(`/courses/${courseId}/lessons`, file);
      if (!fileUrl.success) {
        toast({ title: "Failed to upload PDF", variant: "destructive" });
        setUploading(false);
        return;
      }
      setLesson({ ...lesson, embedUrl: fileUrl.data });
    } catch (error) {
      toast({ title: "Failed to upload PDF", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const resetForm = () => {
    setLesson({
      title: "",
      type: LESSON_TYPE.SLIDE_DECK,
      description: "",
      embedUrl: "",
      duration: { hours: 0, minutes: 0 },
    });
  };

  const handleSave = async () => {
    try {
      if (!lesson.title.trim()) {
        toast({ title: "Lesson title is required", variant: "destructive" });
        return;
      }
      if (!lesson.description.trim() && !lesson.embedUrl.trim()) {
        toast({ title: "Fill description or embedUrl.", variant: "destructive" });
        return;
      }
      if (lesson.duration.hours < 0 || lesson.duration.minutes < 0) {
        toast({ title: "Hours and minutes cannot be negative", variant: "destructive" });
        return;
      }
      if (lesson.type === LESSON_TYPE.PDF && !lesson.embedUrl.trim()) {
        toast({ title: "Please upload a PDF file.", variant: "destructive" });
        return;
      }

      setSaving(true);
      const newLesson = await lessonService.createLesson({ ...lesson, courseId }); // Pass courseId appropriately
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
      <DialogContent className="w-[90%] sm:max-w-5xl bg-card text-card-foreground overflow-y-scroll max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create Lesson</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add a new lesson for your course.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="pt-2">
            {/* Two-column layout with weighted widths */}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">

              {/* Left Column - Title + Description */}
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <Label>Lesson Title</Label>
                  <Input
                    placeholder="e.g. Introduction to Algebra"
                    value={lesson.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    className="dark:bg-neutral-800 dark:border-neutral-700"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label>Description</Label>
                  <div
                    data-color-mode={colorMode}
                    className="border rounded-lg dark:border-neutral-700"
                  >
                    <MarkdownEditor
                      value={lesson.description}
                      onChange={(value) =>
                        handleFieldChange("description", value || "")
                      }
                      height={250}
                      uploadPath="/courses/lessons/attachments"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Type, Embed URL, Duration */}
              <div className="space-y-5">
                {/* Lesson Type */}
                <div className="space-y-1">
                  <Label>Lesson Type</Label>
                  <Select
                    value={lesson.type}
                    onValueChange={(val) => handleFieldChange("type", val)}
                  >
                    <SelectTrigger className="dark:bg-neutral-800 dark:border-neutral-700">
                      <SelectValue placeholder="Select type" />
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
                {lesson.type === LESSON_TYPE.PDF ? (
                  <div className="space-y-1">
                    <Label>PDF Resource *</Label>
                    <label
                      htmlFor="pdf-upload"
                      className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg cursor-pointer w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : lesson.embedUrl
                        ? `File Uploaded`
                        : "No PDF uploaded yet."}
                    </label>
                    <Input
                      id="pdf-upload"
                      type="file"
                      accept="application/pdf"
                      placeholder="Upload PDF resource"
                      onChange={(e) => handlePdfUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Embed URL</Label>
                    <Input
                      placeholder="Enter embed URL or resource link"
                      value={lesson.embedUrl}
                      onChange={(e) => handleFieldChange("embedUrl", e.target.value)}
                      className="dark:bg-neutral-800 dark:border-neutral-700"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Duration (Hours and Minutes)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={lesson.duration.hours}
                      onChange={(e) =>
                        handleFieldChange("duration-hours", parseInt(e.target.value))
                      }
                      className="dark:bg-neutral-800 dark:border-neutral-700"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={lesson.duration.minutes}
                      onChange={(e) =>
                        handleFieldChange("duration-minutes", parseInt(e.target.value))
                      }
                      className="dark:bg-neutral-800 dark:border-neutral-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 mt-8 border-t pt-4 dark:border-neutral-700">
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Lesson"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

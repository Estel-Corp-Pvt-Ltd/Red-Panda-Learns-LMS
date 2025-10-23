import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LESSON_SCOPE, LESSON_TYPE } from "@/constants";
import { toast } from "sonner";
import { lessonService } from "@/services/lessonService";
import { Lesson } from "@/types/lesson";
import MDEditor from "@uiw/react-md-editor";

type CreateLessonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLessonCreated?: (lesson: Lesson) => void;
};

export const CreateLessonModal = ({
  isOpen,
  onClose,
  onLessonCreated,
}: CreateLessonModalProps) => {
  const [saving, setSaving] = useState(false);
  const [lesson, setLesson] = useState({
    title: "",
    type: LESSON_TYPE.SLIDE_DECK,
    description: "",
    embedUrl: "",
    durationSeconds: 0,
    scope: LESSON_SCOPE.APP,
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
    const exclusiveFields = ["embedUrl", "assignmentID", "quizID"];
    if (exclusiveFields.includes(field)) {
      const cleared = exclusiveFields.reduce(
        (acc, f) => ({ ...acc, [f]: "" }),
        {}
      );
      setLesson({ ...lesson, ...cleared, [field]: value });
    } else {
      setLesson({ ...lesson, [field]: value });
    }
  };

  const resetForm = () => {
    setLesson({
      title: "",
      type: LESSON_TYPE.SLIDE_DECK,
      description: "",
      embedUrl: "",
      durationSeconds: 0,
      scope: LESSON_SCOPE.APP,
    });
  };

  const handleSave = async () => {
    try {
      if (!lesson.title.trim()) {
        toast.error("Lesson title is required");
        return;
      }
      if (!lesson.embedUrl.trim()) {
        toast.error("Embed URL is required");
        return;
      }

      setSaving(true);
      const newLesson = await lessonService.createLesson(lesson);
      toast.success("Lesson created successfully!");

      onLessonCreated?.(newLesson);
      resetForm();
      onClose(); // Call onClose after everything else
    } catch (err) {
      console.error("Error creating lesson:", err);
      toast.error("Failed to create lesson");
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
      <DialogContent className="sm:max-w-5xl bg-card text-card-foreground overflow-y-scroll max-h-screen">
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
                    <MDEditor
                      value={lesson.description}
                      onChange={(value) =>
                        handleFieldChange("description", value || "")
                      }
                      height={450}
                      preview="live"
                      className="!bg-transparent dark:!bg-neutral-900"
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

                {/* Embed URL */}
                <div className="space-y-1">
                  <Label>Embed URL</Label>
                  <Input
                    placeholder="Enter embed URL or resource link"
                    value={lesson.embedUrl}
                    onChange={(e) => handleFieldChange("embedUrl", e.target.value)}
                    className="dark:bg-neutral-800 dark:border-neutral-700"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <Label>Duration (seconds)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 300"
                    value={lesson.durationSeconds || 0}
                    onChange={(e) =>
                      handleFieldChange("durationSeconds", parseInt(e.target.value))
                    }
                    className="dark:bg-neutral-800 dark:border-neutral-700"
                  />
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

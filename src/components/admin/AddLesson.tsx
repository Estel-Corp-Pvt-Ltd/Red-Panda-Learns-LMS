import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      if (!lesson.description.trim()) {
        toast.error("Lesson description is required");
        return;
      }
      if (!lesson.embedUrl.trim()) {
        toast.error("Embed URL is required");
        return;
      }
      if (lesson.durationSeconds <= 0) {
        toast.error("Duration must be greater than 0");
        return;
      }

      setSaving(true);
      const newLesson = await lessonService.createLesson(lesson);
      toast.success("Lesson created successfully!");

      onLessonCreated?.(newLesson);
      resetForm();
      onClose();
    } catch (err) {
      console.error("Error creating lesson:", err);
      toast.error("Failed to create lesson");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Create Lesson</DialogTitle>
          <DialogDescription>
            Add a new lesson for your course.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-none shadow-none">
          <CardContent className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1">
              <Label>Lesson Title</Label>
              <Input
                placeholder="e.g. Introduction to Algebra"
                value={lesson.title}
                onChange={(e) =>
                  handleFieldChange("title", e.target.value)
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this lesson covers..."
                value={lesson.description}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <Label>Lesson Type</Label>
              <Select
                value={lesson.type}
                onValueChange={(val) => handleFieldChange("type", val)}
              >
                <SelectTrigger>
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
                onChange={(e) =>
                  handleFieldChange("embedUrl", e.target.value)
                }
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
                  handleFieldChange(
                    "durationSeconds",
                    parseInt(e.target.value)
                  )
                }
              />
            </div>
          </CardContent>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 mt-4 px-6 pb-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Lesson"}
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { lessonService } from "@/services/lessonService";
import { Lesson } from "@/types/lesson";
import { logError } from "@/utils/logger";
import MDEditor from "@uiw/react-md-editor";
import { serverTimestamp, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";

interface EditLessonModalProps {
  courseId: string;
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onLessonUpdated?: (lesson: Lesson) => void;
}

export const EditLessonModal = ({
  courseId,
  lessonId,
  isOpen,
  onClose,
  onLessonUpdated,
}: EditLessonModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  // Detect dark/light mode for MDEditor
  const colorMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";


 
  // Load lesson data when modal opens
  useEffect(() => {
    const fetchLesson = async () => {
      if (!isOpen || !lessonId) return;

      setLoading(true);
      try {
        const data = await lessonService.getLessonById(lessonId);
        if (!data) {
          toast({
            title: "Lesson not found",
            description: "The lesson you're trying to edit doesn't exist.",
            variant: "destructive",
          });
          onClose();
          return;
        }
        setLesson(data);
      } catch (error) {
        console.error("Error loading lesson:", error);
        toast({
          title: "Failed to load lesson",
          description: "Please try again later.",
          variant: "destructive",
        });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [isOpen, lessonId, onClose, toast]);

  const handleFieldChange = (field: string, value: any) => {
    if (field === "duration-hours") {
      setLesson((prev) => ({
        ...prev,
        duration: {
          hours: parseInt(value) || 0,
          minutes: prev.duration?.minutes || 0,
        },
      }));
    } else if (field === "duration-minutes") {
      setLesson((prev) => ({
        ...prev,
        duration: {
          hours: prev.duration?.hours || 0,
          minutes: parseInt(value) || 0,
        },
      }));
    } else {
      setLesson((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleUpdateLesson = async () => {
    if (!lesson.title?.trim()) {
      toast({
        title: "Lesson title is required",
        variant: "destructive",
      });
      return;
    }
    if (!lesson.description?.trim() && !lesson.embedUrl?.trim()) {
      toast({
        title: "Description or embed URL required",
        description: "Please provide either a description or an embed URL.",
        variant: "destructive",
      });
      return;
    }
    if (!lesson.type) {
      toast({
        title: "Lesson type is required",
        variant: "destructive",
      });
      return;
    }
    if (
      (lesson.duration?.hours || 0) < 0 ||
      (lesson.duration?.minutes || 0) < 0
    ) {
      toast({
        title: "Invalid duration",
        description: "Hours and minutes cannot be negative.",
        variant: "destructive",
      });
      return;
    }

   setUpdating(true);
   try {
   
     const result = await lessonService.updateLesson(lessonId, {
       ...lesson,
       courseId: courseId,
     });
  
     if (!result.success) {
       toast({
         title: "Failed to update lesson",
         description: "Please try again later.",
         variant: "destructive",
       });
       return;
     }

     toast({
       title: "Lesson updated successfully!",
     });

     onLessonUpdated?.({
       id: lessonId,
       courseId,
       title: lesson.title || "",
       type: lesson.type || LESSON_TYPE.SLIDE_DECK,
       description: lesson.description || "",
       embedUrl: lesson.embedUrl || "",
       duration: lesson.duration || { hours: 0, minutes: 0 },
       createdAt: lesson!.createdAt,
       updatedAt: serverTimestamp(), // you can also fetch it again if you prefer
     });

     onClose();
   } catch (error) {
     console.error("Error updating lesson:", error);
     toast({
       title: "Error updating lesson",
       description: "Something went wrong.",
       variant: "destructive",
     });
   } finally {
     setUpdating(false);
   }

  };

  const handleClose = () => {
    setLesson({
      ...lesson,
      courseId: courseId,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Lesson</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading lesson...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="lesson-title">Lesson Title *</Label>
                  <Input
                    id="lesson-title"
                    placeholder="e.g. Introduction to Algebra"
                    value={lesson.title || ""}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <div
                    data-color-mode={colorMode}
                    className="border rounded-lg"
                  >
                    <MDEditor
                      value={lesson.description || ""}
                      onChange={(value) =>
                        handleFieldChange("description", value || "")
                      }
                      height={300}
                      preview="live"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* Lesson Type */}
                <div className="space-y-2">
                  <Label htmlFor="lesson-type">Lesson Type *</Label>
                  <Select
                    value={lesson.type}
                    onValueChange={(val) => handleFieldChange("type", val)}
                  >
                    <SelectTrigger id="lesson-type" className="w-full">
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
                <div className="space-y-2">
                  <Label htmlFor="embed-url">Embed URL</Label>
                  <Input
                    id="embed-url"
                    placeholder="Enter embed URL for the lesson content"
                    value={lesson.embedUrl || ""}
                    onChange={(e) =>
                      handleFieldChange("embedUrl", e.target.value)
                    }
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label
                        htmlFor="duration-hours"
                        className="text-sm font-normal"
                      >
                        Hours
                      </Label>
                      <Input
                        id="duration-hours"
                        type="number"
                        min="0"
                        max="23"
                        step="1"
                        value={lesson.duration?.hours || 0}
                        onChange={(e) =>
                          handleFieldChange("duration-hours", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="duration-minutes"
                        className="text-sm font-normal"
                      >
                        Minutes
                      </Label>
                      <Input
                        id="duration-minutes"
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        value={lesson.duration?.minutes || 0}
                        onChange={(e) =>
                          handleFieldChange("duration-minutes", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total: {lesson.duration?.hours || 0}h{" "}
                    {lesson.duration?.minutes || 0}m
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateLesson}
                disabled={updating || !lesson.title?.trim()}
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  "Update Lesson"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

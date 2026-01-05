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
import VideoPlayer from "../VideoPlayer";

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
    } else if (field === "embedUrl") {
      setLesson({ ...lesson, [field]: value });

      // Fetch video duration for VIDEO_LECTURE
      if (lesson.type === LESSON_TYPE.VIDEO_LECTURE && value) {
        fetchVideoDuration(value);
      }
    } else {
      setLesson({ ...lesson, [field]: value });
    }
  };

  const fetchVideoDuration = async (url: string) => {
    try {
      // YouTube video
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = "";

        if (url.includes("youtube.com/watch")) {
          const urlParams = new URLSearchParams(new URL(url).search);
          videoId = urlParams.get("v") || "";
        } else if (url.includes("youtube.com/embed/")) {
          videoId = url.split("embed/")[1]?.split("?")[0] || "";
        } else if (url.includes("youtu.be/")) {
          videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
        }

        if (videoId) {
          // Try using YouTube Data API v3 (requires API key in environment variable)
          const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

          if (apiKey) {
            try {
              const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`
              );

              if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                  const duration = data.items[0].contentDetails.duration;
                  // Parse ISO 8601 duration format (PT#H#M#S)
                  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                  if (match) {
                    const hours = parseInt(match[1] || "0");
                    const minutes = parseInt(match[2] || "0");
                    const seconds = parseInt(match[3] || "0");

                    // Round up seconds to minutes
                    const totalMinutes = minutes + Math.ceil(seconds / 60);
                    const finalHours = hours + Math.floor(totalMinutes / 60);
                    const finalMinutes = totalMinutes % 60;

                    setLesson(prev => ({
                      ...prev,
                      duration: { hours: finalHours, minutes: finalMinutes }
                    }));

                    toast({
                      title: "Duration detected",
                      description: `Video duration: ${finalHours}h ${finalMinutes}m`
                    });
                    return;
                  }
                }
              }
            } catch (apiError) {
              console.error("YouTube API error:", apiError);
            }
          } else {
            console.warn("YouTube API key not configured. Set VITE_YOUTUBE_API_KEY in .env file");
          }
        }
      } else if (url.includes("vimeo.com")) { // Vimeo video
        let videoId = "";

        if (url.includes("vimeo.com/video/")) {
          videoId = url.split("video/")[1]?.split("?")[0] || "";
        } else if (url.includes("player.vimeo.com/video/")) {
          videoId = url.split("video/")[1]?.split("?")[0] || "";
        } else {
          const matches = url.match(/vimeo\.com\/(\d+)/);
          videoId = matches ? matches[1] : "";
        }

        if (videoId) {
          // Use Vimeo oEmbed API (no API key required)
          const response = await fetch(
            `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.duration) {
              const hours = Math.floor(data.duration / 3600);
              const minutes = Math.floor((data.duration % 3600) / 60);

              setLesson(prev => ({
                ...prev,
                duration: { hours, minutes }
              }));

              toast({
                title: "Duration detected",
                description: `Video duration: ${hours}h ${minutes}m`
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching video duration:", error);
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
      if (lesson.type === LESSON_TYPE.VIDEO_LECTURE && !lesson.embedUrl.trim()) {
        toast({ title: "Please enter a video embed URL.", variant: "destructive" });
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

                {lesson.type === LESSON_TYPE.TEXT ? (<></>) : lesson.type === LESSON_TYPE.PDF ? (
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
                    <Label>
                      {lesson.type === LESSON_TYPE.VIDEO_LECTURE
                        ? "Video Embed URL (YouTube/Vimeo) *"
                        : "Embed URL"}
                    </Label>
                    <Input
                      placeholder="Enter embed URL or resource link"
                      value={lesson.embedUrl}
                      onChange={(e) => handleFieldChange("embedUrl", e.target.value)}
                      className="dark:bg-neutral-800 dark:border-neutral-700"
                    />
                    {lesson.type === LESSON_TYPE.VIDEO_LECTURE && lesson.embedUrl && (
                      <div className="mt-3 border rounded-lg overflow-hidden dark:border-neutral-700">
                        <VideoPlayer
                          url={lesson.embedUrl}
                        />
                        {(lesson.duration.hours > 0 || lesson.duration.minutes > 0) && (
                          <div className="p-2 bg-muted text-sm">
                            <span className="font-medium">Duration:</span> {lesson.duration.hours}h {lesson.duration.minutes}m
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Duration (Hours and Minutes)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Hours"
                      value={lesson.duration.hours}
                      onChange={(e) =>
                        handleFieldChange("duration-hours", parseInt(e.target.value) || 0)
                      }
                      className="dark:bg-neutral-800 dark:border-neutral-700"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Minutes"
                      value={lesson.duration.minutes}
                      onChange={(e) =>
                        handleFieldChange("duration-minutes", parseInt(e.target.value) || 0)
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
    </Dialog >
  );
};

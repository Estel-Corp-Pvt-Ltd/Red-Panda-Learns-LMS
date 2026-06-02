import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ATTACHMENT_TYPE, LESSON_TYPE } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { fileService } from "@/services/fileService";
import { lessonService } from "@/services/lessonService";
import { Lesson /* , LessonAttachment */ } from "@/types/lesson";
import { logError } from "@/utils/logger";
import { serverTimestamp } from "firebase/firestore";
import { FileText, Upload, Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import MarkdownEditor from "../markdownEditor/MarkdownEditorComponent";
import { ContentLockForm } from "./ContentLockForm";
import { LEARNING_CONTENT } from "@/constants";
import { ContentLock } from "@/types/content-lock";
import { contentLockService } from "@/services/contentLockService";

interface EditLessonModalProps {
  courseId: string;
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onLessonUpdated: (lesson: Lesson) => void;
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
  const [uploading, setUploading] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  // const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [activeTab, setActiveTab] = useState("lesson");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lock, setLock] = useState<ContentLock | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const colorMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

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

  useEffect(() => {
    const fetchLessonData = async () => {
      if (!isOpen || !lessonId) return;

      setLoading(true);
      try {
        // const [lessonData, attachmentsData] = await Promise.all([
        //   lessonService.getLessonById(lessonId),
        //   lessonService.getAttachmentsByLessonId(lessonId),
        // ]);
        // setAttachments(attachmentsData || []);
        const lessonData = await lessonService.getLessonById(lessonId);

        if (!lessonData) {
          toast({
            title: "Lesson not found",
            variant: "destructive",
          });
          onClose();
          return;
        }
        setLesson(lessonData);
      } catch (error) {
        logError("Error loading lesson:", error);
        toast({
          title: "Failed to load lesson",
          variant: "destructive",
        });
        onClose();
        return;
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // const handleUploadAttachment = async () => { /* attachment upload — disabled */ };
  // const handleRemoveAttachment = async (attachmentId: string) => { /* attachment remove — disabled */ };

  const handleUpdateLesson = async () => {
    if (!lesson?.title?.trim()) {
      toast({
        title: "Lesson title is required",
        variant: "destructive",
      });
      return;
    }
    if ((lesson.duration?.hours || 0) < 0 || (lesson.duration?.minutes || 0) < 0) {
      toast({
        title: "Invalid duration",
        description: "Hours and minutes cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    if (
      (lesson.karmaBoostExpiresAfter?.hours || 0) < 0 ||
      (lesson.karmaBoostExpiresAfter?.minutes || 0) < 0
    ) {
      toast({
        title: "Invalid karmaBoostExpiresAfter",
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
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Lesson updated successfully!",
      });

      onLessonUpdated({
        ...lesson!,
        id: lessonId,
        courseId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logError("Error updating lesson:", error);
      toast({
        title: "Error updating lesson",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = (next) => {
    setLesson({
      ...lesson,
      courseId: courseId,
    });
    if (!next) onClose();
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
  };

  const getFileIcon = (type: string) => {
    const icons = {
      [ATTACHMENT_TYPE.VIDEO]: <FileText className="h-4 w-4 text-blue-500" />,
      [ATTACHMENT_TYPE.AUDIO]: <FileText className="h-4 w-4 text-purple-500" />,
      [ATTACHMENT_TYPE.IMAGE]: <FileText className="h-4 w-4 text-green-500" />,
      [ATTACHMENT_TYPE.DOCUMENT]: <FileText className="h-4 w-4" />,
    };
    return icons[type as keyof typeof icons] || <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const refetchLocks = async () => {
    if (!lessonId) return;

    try {
      setLockLoading(true);
      const res = await contentLockService.getLocksByContentId(lessonId);

      if (res.success) {
        // Assuming only ONE lock per content
        setLock(res.data.length > 0 ? res.data[0] : null);
      }
    } catch (err) {
      console.error("Failed to fetch content lock", err);
    } finally {
      setLockLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !lessonId) return;

    refetchLocks();
  }, [isOpen, lessonId]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Lesson</DialogTitle>
        </DialogHeader>

        {!lesson || loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading lesson...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="lesson">Lesson Details</TabsTrigger>
                {/* Attachments tab — disabled
                <TabsTrigger value="attachments">
                  Attachments
                </TabsTrigger>
                */}
              </TabsList>

              {/* Lesson Details Tab */}
              <TabsContent value="lesson" className="space-y-6 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="lesson-title">Lesson Title *</Label>
                      <Input
                        id="lesson-title"
                        placeholder="e.g. Introduction to Algebra"
                        value={lesson?.title || ""}
                        onChange={(e) => handleFieldChange("title", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <div data-color-mode={colorMode} className="border rounded-lg">
                        <MarkdownEditor
                          value={lesson?.description || ""}
                          onChange={(value) => handleFieldChange("description", value || "")}
                          height={300}
                          uploadPath="/courses/lessons/attachments"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="lesson-type">Lesson Type *</Label>
                      <Select
                        value={lesson?.type}
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
                    {lesson?.type === LESSON_TYPE.PDF ? (
                      <div className="space-y-2">
                        <Label>PDF Resource *</Label>
                        <label
                          htmlFor="pdf-upload"
                          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg cursor-pointer w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading
                            ? "Uploading..."
                            : lesson.embedUrl
                              ? `File Uploaded`
                              : "No PDF uploaded yet."}
                        </label>
                        <Input
                          id="pdf-upload"
                          type="file"
                          placeholder="Upload PDF resource"
                          onChange={(e) => handlePdfUpload(e.target.files?.[0]!)}
                          disabled={uploading}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="embed-url">Embed URL</Label>
                        <Input
                          id="embed-url"
                          placeholder="Enter embed URL for the lesson content"
                          value={lesson?.embedUrl || ""}
                          onChange={(e) => handleFieldChange("embedUrl", e.target.value)}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Duration *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="duration-hours" className="text-sm font-normal">
                            Hours
                          </Label>
                          <Input
                            id="duration-hours"
                            type="number"
                            min="0"
                            value={lesson?.duration?.hours || 0}
                            onChange={(e) => handleFieldChange("duration-hours", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="duration-minutes" className="text-sm font-normal">
                            Minutes
                          </Label>
                          <Input
                            id="duration-minutes"
                            type="number"
                            min="0"
                            value={lesson?.duration?.minutes || 0}
                            onChange={(e) => handleFieldChange("duration-minutes", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Karma Expires At *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="karmaBoost-hours" className="text-sm font-normal">
                            Hours
                          </Label>
                          <Input
                            id="karmaBoost-hours"
                            type="number"
                            min="0"
                            value={lesson?.karmaBoostExpiresAfter?.hours || 0}
                            onChange={(e) => handleFieldChange("karmaBoost-hours", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="karmaBoost-minutes" className="text-sm font-normal">
                            Minutes
                          </Label>
                          <Input
                            id="karmaBoost-minutes"
                            type="number"
                            min="0"
                            value={lesson?.karmaBoostExpiresAfter?.minutes || 0}
                            onChange={(e) =>
                              handleFieldChange("karmaBoost-minutes", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <ContentLockForm
                      contentType={LEARNING_CONTENT.ASSIGNMENT}
                      contentId={lessonId}
                      existingLock={lock} // optional
                      onSaved={() => refetchLocks()}
                      onDeleted={() => refetchLocks()}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Attachments Tab — disabled
              <TabsContent value="attachments" className="space-y-6 mt-4">
              </TabsContent>
              */}
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} disabled={updating}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLesson} disabled={updating || !lesson?.title?.trim()}>
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

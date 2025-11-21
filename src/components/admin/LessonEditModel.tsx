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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ATTACHMENT_TYPE, LESSON_TYPE } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { fileService } from "@/services/fileService";
import { lessonService } from "@/services/lessonService";
import { Lesson, LessonAttachment } from "@/types/lesson";
import { logError } from "@/utils/logger";
import MDEditor from "@uiw/react-md-editor";
import { serverTimestamp } from "firebase/firestore";
import { FileText, Upload, Download, Trash2 } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [activeTab, setActiveTab] = useState("lesson");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const colorMode =
    typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  useEffect(() => {
    const fetchLessonData = async () => {
      if (!isOpen || !lessonId) return;

      setLoading(true);
      try {
        const [lessonData, attachmentsData] = await Promise.all([
          lessonService.getLessonById(lessonId),
          lessonService.getAttachmentsByLessonId(lessonId)
        ]);

        if (!lessonData) {
          toast({
            title: "Lesson not found",
            variant: "destructive",
          });
          onClose();
          return;
        }
        setLesson(lessonData);
        setAttachments(attachmentsData || []);
      } catch (error) {
        logError("Error loading lesson:", error);
        toast({
          title: "Failed to load lesson",
          variant: "destructive",
        });
        onClose();
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

  const handleUploadAttachment = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileResult = await fileService.uploadAttachment(`/lessons/${lessonId}/attachments`, selectedFile);
      if (!fileResult.success || !fileResult.data) {
        throw new Error("File upload failed");
      }
      const attachment = await lessonService.createLessonAttachment({
        lessonId,
        name: selectedFile.name,
        url: fileResult.data,
        type: ATTACHMENT_TYPE.DOCUMENT,
        size: selectedFile.size,
      });

      setAttachments(prev => [...prev, attachment]);
      setSelectedFile(null);

      // Clear file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast({
        title: "File uploaded successfully!",
      });
    } catch (error) {
      logError("Error uploading file:", error);
      toast({
        title: "Upload failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      await lessonService.deleteLessonAttachment(attachmentId);
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
      toast({
        title: "Attachment removed",
      });
    } catch (error) {
      logError("Error removing attachment:", error);
      toast({
        title: "Failed to remove attachment",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLesson = async () => {
    if (!lesson?.title?.trim()) {
      toast({
        title: "Lesson title is required",
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
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Lesson updated successfully!",
      });

      onLessonUpdated?.({
        ...lesson!,
        id: lessonId,
        courseId,
        updatedAt: serverTimestamp(),
      });

      onClose();
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

  const handleClose = () => {
    setLesson({
      ...lesson,
      courseId: courseId,
    });
    onClose();
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lesson">Lesson Details</TabsTrigger>
                <TabsTrigger value="attachments">
                  Attachments {attachments.length > 0 && `(${attachments.length})`}
                </TabsTrigger>
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
                      <div
                        data-color-mode={colorMode}
                        className="border rounded-lg"
                      >
                        <MDEditor
                          value={lesson?.description || ""}
                          onChange={(value) =>
                            handleFieldChange("description", value || "")
                          }
                          height={300}
                          preview="live"
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

                    <div className="space-y-2">
                      <Label htmlFor="embed-url">Embed URL</Label>
                      <Input
                        id="embed-url"
                        placeholder="Enter embed URL for the lesson content"
                        value={lesson?.embedUrl || ""}
                        onChange={(e) =>
                          handleFieldChange("embedUrl", e.target.value)
                        }
                      />
                    </div>

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
                            onChange={(e) =>
                              handleFieldChange("duration-hours", e.target.value)
                            }
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
                            onChange={(e) =>
                              handleFieldChange("duration-minutes", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Attachments Tab */}
              <TabsContent value="attachments" className="space-y-6 mt-4">
                {/* File Upload */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="text-lg font-medium">Upload File</h3>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="file-upload">Select File</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        onChange={handleFileSelect}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={handleUploadAttachment}
                      disabled={!selectedFile || uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                {/* Attachments List */}
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Lesson Attachments ({attachments.length})
                  </h3>

                  {attachments.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-muted-foreground">No attachments</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(attachment.type)}
                            <div>
                              <h4 className="font-medium text-sm">{attachment.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {attachment.type} • {formatFileSize(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAttachment(attachment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

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
                disabled={updating || !lesson?.title?.trim()}
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

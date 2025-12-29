import React, { useState, useEffect } from "react";
import { WhereFilterOp } from "firebase/firestore";
import { Loader2, Send, Globe, BookOpen, Mail, Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { courseService } from "@/services/courseService";
import { createAnnouncementApi } from "@/services/createAnnouncementApi";
import { COURSE_STATUS } from "@/constants";
import { Course } from "@/types/course";

interface AnnouncementForm {
  title: string;
  body: string;
}

type AnnouncementType = "GLOBAL" | "COURSE";

interface AddAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Modal for creating announcements.
 * Supports:
 * - Global announcements (visible to all students)
 * - Course-specific announcements (visible to enrolled students)
 * Optional email notifications can be sent after publishing.
 */
const AddAnnouncementModal: React.FC<AddAnnouncementModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  // Main form state
  const [form, setForm] = useState<AnnouncementForm>({
    title: "",
    body: "",
  });

  // UI / workflow state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcementType, setAnnouncementType] =
    useState<AnnouncementType>("GLOBAL");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendMail, setSendMail] = useState(false);

  /**
   * Load courses when:
   * - Modal is open
   * - Announcement type is COURSE
   * - Courses not loaded yet
   */
  useEffect(() => {
    if (open && announcementType === "COURSE" && courses.length === 0) {
      loadCourses();
    }
  }, [open, announcementType, courses.length]);

  /**
   * Reset form when modal closes.
   */
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  /**
   * Load published courses to show in the course selector.
   */
  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const filters: { field: keyof Course; op: WhereFilterOp; value: any }[] =
        [{ field: "status", op: "==", value: COURSE_STATUS.PUBLISHED }];

      const result = await courseService.getCourses(filters, {
        limit: 300,
        orderBy: { field: "title", direction: "asc" },
        cursor: null,
        pageDirection: "next",
      });

      if (result.success && result.data) {
        setCourses(result.data.data);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  /**
   * Handle text input (title/body) changes.
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handle announcement type selection (GLOBAL or COURSE).
   */
  const handleAnnouncementTypeChange = (value: AnnouncementType) => {
    setAnnouncementType(value);
    if (value === "GLOBAL") {
      setSelectedCourseId("");
    }
  };

  /**
   * Handle course selection for COURSE announcement type.
   */
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  /**
   * Reset modal state to initial values.
   */
  const resetForm = () => {
    setForm({
      title: "",
      body: "",
    });
    setAnnouncementType("GLOBAL");
    setSelectedCourseId("");
    setSendMail(false);
  };

  /**
   * Validate form and open confirmation dialog before final submission.
   */
  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter an announcement title.",
        variant: "destructive",
      });
      return;
    }

    if (!form.body.trim()) {
      toast({
        title: "Body required",
        description: "Please enter the announcement content.",
        variant: "destructive",
      });
      return;
    }

    if (announcementType === "COURSE" && !selectedCourseId) {
      toast({
        title: "Course required",
        description: "Please select a course for this announcement.",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  /**
   * Extract announcement ID from API response (if available).
   */
  const extractAnnouncementId = (result: any): string | undefined => {
    if (result?.data?.announcementId) return result.data.announcementId;
    return undefined;
  };

  /**
   * Final confirmation handler:
   * - Creates the announcement (global or course-specific)
   * - Optionally triggers sending email notifications
   */
  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    // Capture the sendMail state at the time of confirmation
    const shouldSendMail = sendMail;

    try {
      const idToken = await authService.getToken();
      let announcementId: string | undefined;

      // Create announcement (GLOBAL or COURSE)
      if (announcementType === "GLOBAL") {
        const result = await createAnnouncementApi.createGlobalAnnouncement(
          {
            title: form.title,
            body: form.body,
          },
          idToken
        );

        announcementId = extractAnnouncementId(result);

        toast({
          title: "Success",
          description: "Global announcement created successfully!",
        });
      } else {
        const result =
          await createAnnouncementApi.createCourseManualAnnouncement(
            {
              title: form.title,
              body: form.body,
              courseId: selectedCourseId,
            },
            idToken
          );

        announcementId = extractAnnouncementId(result);

        const selectedCourse = courses.find((c) => c.id === selectedCourseId);
        toast({
          title: "Success",
          description: `Announcement created for "${
            selectedCourse?.title || "course"
          }" successfully!`,
        });
      }

      // Optionally send email notifications if:
      // - User opted in
      // - We successfully obtained an announcement ID
      if (shouldSendMail && announcementId) {
        try {
          await createAnnouncementApi.sendAnnouncementMail(
            { announcementId },
            idToken
          );

          toast({
            title: "Emails Sent",
            description:
              announcementType === "GLOBAL"
                ? "Email notifications sent to all students."
                : "Email notifications sent to enrolled students.",
          });
        } catch {
          toast({
            title: "Email Warning",
            description:
              "Announcement created but failed to send email notifications.",
            variant: "destructive",
          });
        }
      } else if (shouldSendMail && !announcementId) {
        // Edge case: announcement created but no ID returned
        toast({
          title: "Email Warning",
          description:
            "Announcement created but could not send emails - announcement ID not found.",
          variant: "destructive",
        });
      }

      // Close modal and notify parent on success
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: "Error",
        description: "Failed to create announcement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Helper to get the selected course's display name.
   */
  const getSelectedCourseName = () => {
    const course = courses.find((c) => c.id === selectedCourseId);
    return course?.title || "";
  };

  return (
    <>
      {/* Main Create Announcement Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Create Announcement
            </DialogTitle>
            <DialogDescription>
              Create an announcement for all students or for a specific course.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitClick} className="space-y-6">
            {/* Announcement Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="announcementType">Announcement Type</Label>
              <Select
                value={announcementType}
                onValueChange={handleAnnouncementTypeChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="announcementType" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Global Announcement
                    </div>
                  </SelectItem>
                  <SelectItem value="COURSE">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Course Announcement
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {announcementType === "GLOBAL"
                  ? "This announcement will be visible to all students across all courses."
                  : "This announcement will only be visible to students enrolled in the selected course."}
              </p>
            </div>

            {/* Course Selection (only for COURSE type) */}
            {announcementType === "COURSE" && (
              <div className="space-y-2">
                <Label htmlFor="course">
                  Select Course <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedCourseId}
                  onValueChange={handleCourseChange}
                  disabled={isSubmitting || loadingCourses}
                >
                  <SelectTrigger id="course" className="w-full">
                    <SelectValue
                      placeholder={
                        loadingCourses
                          ? "Loading courses..."
                          : "Select a course"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCourses ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : courses.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No published courses available
                      </div>
                    ) : (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter announcement title..."
                value={form.title}
                onChange={handleInputChange}
                disabled={isSubmitting}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.title.length}/200
              </p>
            </div>

            {/* Body Textarea */}
            <div className="space-y-2">
              <Label htmlFor="body">
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Write your announcement here..."
                value={form.body}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={6}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.body.length}/2000
              </p>
            </div>

            {/* Email Notification Checkbox */}
            <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border">
              <Checkbox
                id="sendMail"
                checked={sendMail}
                onCheckedChange={(checked) => setSendMail(checked === true)}
                disabled={isSubmitting}
              />
              <div className="flex items-center gap-2 flex-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label
                  htmlFor="sendMail"
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  Send email notification to{" "}
                  {announcementType === "GLOBAL"
                    ? "all students"
                    : "enrolled students"}
                </Label>
              </div>
            </div>

            {/* Email Notice (shown only when email is enabled) */}
            {sendMail && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Mail className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    Email Notification Enabled
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                    Publishing this announcement will automatically send an
                    email to{" "}
                    {announcementType === "GLOBAL"
                      ? "all registered students"
                      : "all students enrolled in the selected course"}
                    . Please review your content carefully before publishing.
                  </p>
                </div>
              </div>
            )}

            {/* Live Preview */}
            {(form.title || form.body) && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Preview
                  </p>
                  {announcementType === "COURSE" && selectedCourseId && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {getSelectedCourseName()}
                    </span>
                  )}
                  {announcementType === "GLOBAL" && (
                    <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                      Global
                    </span>
                  )}
                  {sendMail && (
                    <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-lg">
                  {form.title || "Untitled"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {form.body || "No content"}
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !form.title.trim() ||
                  !form.body.trim() ||
                  (announcementType === "COURSE" && !selectedCourseId)
                }
                className="flex-1 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publish Announcement
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog (before final publish) */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Confirm Announcement
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to publish a{" "}
                  <span className="font-medium">
                    {announcementType === "GLOBAL"
                      ? "global"
                      : "course-specific"}
                  </span>{" "}
                  announcement.
                </p>
                {announcementType === "COURSE" && selectedCourseId && (
                  <p>
                    Course:{" "}
                    <span className="font-medium">
                      {getSelectedCourseName()}
                    </span>
                  </p>
                )}

                {/* Email confirmation info */}
                {sendMail ? (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2">
                    <p className="text-amber-800 dark:text-amber-400 text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email notifications will be sent
                    </p>
                    <p className="text-amber-700 dark:text-amber-500 text-sm mt-1">
                      An email notification will be sent to{" "}
                      {announcementType === "GLOBAL"
                        ? "all registered students"
                        : "all students enrolled in this course"}
                      . This action cannot be undone.
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted border rounded-md p-3 mt-2">
                    <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      No email notifications
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      The announcement will be published without sending email
                      notifications.
                    </p>
                  </div>
                )}

                <p className="text-sm mt-2">
                  Please make sure you have reviewed the announcement content
                  before proceeding.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="bg-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Publishing...
                </>
              ) : sendMail ? (
                "Yes, Publish & Send Emails"
              ) : (
                "Yes, Publish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddAnnouncementModal;

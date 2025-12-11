import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Megaphone, Send, Globe, BookOpen, Mail } from "lucide-react";
import React, { useState, useEffect } from "react";
import { ANNOUNCEMENT_STATUS, COURSE_STATUS } from "@/constants";
import { createAnnouncementApi } from "@/services/createAnnouncementApi";
import { Course } from "@/types/course";
import { WhereFilterOp } from "firebase/firestore";

interface AnnouncementForm {
  title: string;
  body: string;
}

type AnnouncementType = "GLOBAL" | "COURSE";

const AdminCreateAnnouncement: React.FC = () => {
  const [form, setForm] = useState<AnnouncementForm>({
    title: "",
    body: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>("GLOBAL");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Load courses when component mounts or when announcement type changes to "COURSE"
  useEffect(() => {
    if (announcementType === "COURSE" && courses.length === 0) {
      loadCourses();
    }
  }, [announcementType]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const filters: { field: keyof Course; op: WhereFilterOp; value: any }[] = [
        { field: "status", op: "==", value: COURSE_STATUS.PUBLISHED },
      ];

      const result = await courseService.getCourses(filters, {
        limit: 100,
        orderBy: { field: "title", direction: "asc" },
        cursor: null,
        pageDirection: "next",
      });

      if (result.success && result.data) {
        setCourses(result.data.data);
      }
    } catch (error) {
      console.error("Failed to load courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAnnouncementTypeChange = (value: AnnouncementType) => {
    setAnnouncementType(value);
    // Reset selected course when switching types
    if (value === "GLOBAL") {
      setSelectedCourseId("");
    }
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const resetForm = () => {
    setForm({
      title: "",
      body: "",
    });
    setAnnouncementType("GLOBAL");
    setSelectedCourseId("");
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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

    // Validate course selection for course-specific announcements
    if (announcementType === "COURSE" && !selectedCourseId) {
      toast({
        title: "Course required",
        description: "Please select a course for this announcement.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      const idToken = await authService.getToken();

      if (announcementType === "GLOBAL") {
        // Create global announcement
        await createAnnouncementApi.createGlobalAnnouncement(
          {
            title: form.title,
            body: form.body,
          },
          idToken
        );
        console.log("✅ Global announcement created successfully");
        toast({
          title: "Success",
          description: "Global announcement created and emails sent successfully!",
        });
      } else {
        // Create course-specific announcement
        await createAnnouncementApi.createCourseManualAnnouncement(
          {
            title: form.title,
            body: form.body,
            courseId: selectedCourseId,
          },
          idToken
        );
        const selectedCourse = courses.find((c) => c.id === selectedCourseId);
        console.log("✅ Course announcement created successfully");
        toast({
          title: "Success",
          description: `Announcement created for "${selectedCourse?.title || "course"}" and emails sent successfully!`,
        });
      }

      // Reset form after successful submission
      resetForm();
    } catch (announcementError) {
      console.error("Failed to create announcement:", announcementError);
      toast({
        title: "Error",
        description: "Failed to create announcement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedCourseName = () => {
    const course = courses.find((c) => c.id === selectedCourseId);
    return course?.title || "";
  };

  return (
    <AdminLayout>
      <Card className="max-w-2xl mx-auto mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <CardTitle>Create Announcement</CardTitle>
          </div>
          <CardDescription>
            Create an announcement for all students or for a specific course.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmitClick} className="space-y-6">
            {/* Announcement Type */}
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

            {/* Course Selection (only show when course type is selected) */}
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
                        loadingCourses ? "Loading courses..." : "Select a course"
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

            {/* Title */}
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

            {/* Body */}
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

            {/* Email Notice */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Mail className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  Email Notification
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                  Publishing this announcement will automatically send an email to{" "}
                  {announcementType === "GLOBAL"
                    ? "all registered students"
                    : "all students enrolled in the selected course"}
                  . Please review your content carefully before publishing.
                </p>
              </div>
            </div>

            {/* Preview */}
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
                </div>
                <h3 className="font-semibold text-lg">
                  {form.title || "Untitled"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {form.body || "No content"}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1"
              >
                Clear
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
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-600" />
              Confirm Announcement
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to publish a{" "}
                <span className="font-medium">
                  {announcementType === "GLOBAL" ? "global" : "course-specific"}
                </span>{" "}
                announcement.
              </p>
              {announcementType === "COURSE" && selectedCourseId && (
                <p>
                  Course:{" "}
                  <span className="font-medium">{getSelectedCourseName()}</span>
                </p>
              )}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2">
                <p className="text-amber-800 dark:text-amber-400 text-sm font-medium">
                  ⚠️ This action will send emails
                </p>
                <p className="text-amber-700 dark:text-amber-500 text-sm mt-1">
                  An email notification will be sent to{" "}
                  {announcementType === "GLOBAL"
                    ? "all registered students"
                    : "all students enrolled in this course"}
                  . This action cannot be undone.
                </p>
              </div>
              <p className="text-sm mt-2">
                Please make sure you have reviewed the announcement content before
                proceeding.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
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
              ) : (
                "Yes, Publish & Send Emails"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminCreateAnnouncement;
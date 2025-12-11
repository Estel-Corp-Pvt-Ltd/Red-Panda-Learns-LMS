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
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { courseService } from "@/services/courseService";
import { Loader2, Megaphone, Send, Globe, BookOpen } from "lucide-react";
import React, { useState, useEffect } from "react";
import { AnnouncementStatus } from "@/types/general";
import { ANNOUNCEMENT_STATUS, COURSE_STATUS } from "@/constants";
import { createAnnouncementApi } from "@/services/createAnnouncementApi";
import { Course } from "@/types/course";
import { WhereFilterOp } from "firebase/firestore";

interface AnnouncementForm {
  title: string;
  body: string;
  status: AnnouncementStatus;
}

type AnnouncementType = "global" | "course";

const AdminCreateAnnouncement: React.FC = () => {
  const [form, setForm] = useState<AnnouncementForm>({
    title: "",
    body: "",
    status: ANNOUNCEMENT_STATUS.PUBLISHED,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>("global");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Load courses when component mounts or when announcement type changes to "course"
  useEffect(() => {
    if (announcementType === "course" && courses.length === 0) {
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
        limit: 100, // Load more courses for selection
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

  const handleStatusChange = (value: AnnouncementStatus) => {
    setForm((prev) => ({ ...prev, status: value }));
  };

  const handleAnnouncementTypeChange = (value: AnnouncementType) => {
    setAnnouncementType(value);
    // Reset selected course when switching types
    if (value === "global") {
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
      status: ANNOUNCEMENT_STATUS.PUBLISHED,
    });
    setAnnouncementType("global");
    setSelectedCourseId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    if (announcementType === "course" && !selectedCourseId) {
      toast({
        title: "Course required",
        description: "Please select a course for this announcement.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await authService.getToken();

      if (announcementType === "global") {
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
          description: "Global announcement created successfully!",
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
          description: `Announcement created for "${selectedCourse?.title || "course"}" successfully!`,
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
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Global Announcement
                    </div>
                  </SelectItem>
                  <SelectItem value="course">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Course Announcement
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {announcementType === "global"
                  ? "This announcement will be visible to all students across all courses."
                  : "This announcement will only be visible to students enrolled in the selected course."}
              </p>
            </div>

            {/* Course Selection (only show when course type is selected) */}
            {announcementType === "course" && (
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={handleStatusChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANNOUNCEMENT_STATUS.PUBLISHED}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Published
                    </div>
                  </SelectItem>
                  <SelectItem value={ANNOUNCEMENT_STATUS.DRAFT}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      Draft
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {form.status === ANNOUNCEMENT_STATUS.PUBLISHED
                  ? "This announcement will be visible immediately."
                  : "This announcement will be saved but not visible to students."}
              </p>
            </div>

            {/* Preview */}
            {(form.title || form.body) && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Preview
                  </p>
                  {announcementType === "course" && selectedCourseId && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {getSelectedCourseName()}
                    </span>
                  )}
                  {announcementType === "global" && (
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
                  (announcementType === "course" && !selectedCourseId)
                }
                className="flex-1 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {form.status === ANNOUNCEMENT_STATUS.PUBLISHED
                      ? "Publish"
                      : "Save Draft"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminCreateAnnouncement;
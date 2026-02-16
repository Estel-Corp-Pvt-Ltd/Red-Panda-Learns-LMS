// src/pages/instructor/InstructorDashboard.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Edit, Eye, Loader2, MessageSquare, PlusCircle, Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courseService";
import { Course } from "@/types/course";
import { COURSE_STATUS, CURRENCY } from "@/constants";
import { formatDate } from "@/utils/date-time";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

type COURSE_STATUS_TYPE = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: CURRENCY.INR,
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: COURSE_STATUS_TYPE) => {
    switch (status) {
      case COURSE_STATUS.PUBLISHED:
        return "default";
      case COURSE_STATUS.DRAFT:
        return "secondary";
      case COURSE_STATUS.ARCHIVED:
        return "outline";
      default:
        return "outline";
    }
  };

  const loadInstructorCourses = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const result = await courseService.getCourseByInstructor(user.id);

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to fetch your courses",
          variant: "destructive",
        });
        return;
      }

      setCourses(result.data || []);
    } catch (error) {
      console.error("Error loading instructor courses:", error);
      toast({
        title: "Error",
        description: "An error occurred while loading your courses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    try {
      const result = await courseService.deleteCourse(courseId);
      if (result.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        toast({
          title: "Course Deleted",
          description: `"${courseTitle}" has been deleted.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete course. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the course.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadInstructorCourses();
  }, [user?.id]);

  // Initial loading state
  if (isLoading && courses.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading your courses...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Instructor Dashboard</CardTitle>
              <CardDescription>View and manage the courses you&apos;ve created.</CardDescription>
            </div>
            <Button
              variant="pill"
              size="sm"
              onClick={() => navigate("/instructor/create-course")}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Create Course
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                You haven&apos;t created any courses yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first course.
              </p>
              <div className="mt-4">
                <Button
                  variant="pill"
                  size="sm"
                  onClick={() => navigate("/instructor/create-course")}
                  className="inline-flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Course
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                You have created {courses.length} course{courses.length > 1 ? "s" : ""}.
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(course.status as COURSE_STATUS_TYPE)}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(course.salePrice || course.regularPrice || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(course.updatedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/instructor/edit-course/${course.id}`)}
                            title="Edit course"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/courses/${course.slug}`)}
                            title="View course"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {course.isForumEnabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/courses/${course.slug}/forum`)}
                              title="View forum"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete course"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Course</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{course.title}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCourse(course.id, course.title)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorDashboard;

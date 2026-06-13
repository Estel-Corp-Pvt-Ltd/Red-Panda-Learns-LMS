import TeacherLayout from "@/components/TeacherLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { teacherService, TeacherCourseRef } from "@/services/teacherService";
import { BookOpen, Loader2, BarChart3, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

/**
 * Teacher's own enrolled courses. This is the set of courses the teacher is
 * allowed to inspect student data for — it drives gating across the dashboard.
 */
const TeacherMyCourses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<TeacherCourseRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await teacherService.getMyCourses();
      if (result.success && result.data) {
        setCourses(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to load your courses",
          variant: "destructive",
        });
      }
      setLoading(false);
    };
    load();
  }, [toast]);

  return (
    <TeacherLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Courses you are enrolled in. You can view student progress and manage
            content only for these courses.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">You are not enrolled in any courses</p>
              <p className="text-sm text-muted-foreground">
                Ask an admin to enroll you in the courses you teach to access
                student data and content controls.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.courseId} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span className="line-clamp-2">{course.courseName}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => navigate(`/teacher/courses?courseId=${course.courseId}`)}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Student Progress
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      navigate(`/teacher/content-management?courseId=${course.courseId}`)
                    }
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Manage Content
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherMyCourses;

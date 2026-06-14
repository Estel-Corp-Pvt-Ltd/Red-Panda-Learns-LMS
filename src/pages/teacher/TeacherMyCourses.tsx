import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, GraduationCap, Users } from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { enrollmentService } from "@/services/enrollmentService";
import { courseService } from "@/services/courseService";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";

export default function TeacherMyCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await enrollmentService.getUserEnrollments(user.id);
        const userEnrollments = result.success ? result.data : [];
        setEnrollments(userEnrollments);

        const courseDetails = await Promise.all(
          userEnrollments.map((e) => courseService.getCourseById(e.courseId))
        );
        setCourses(courseDetails.filter(Boolean) as Course[]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const getEnrollment = (courseId: string) =>
    enrollments.find((e) => e.courseId === courseId);

  return (
    <TeacherLayout>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Courses you are personally enrolled in. You can view student progress
          only for these courses.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/80">
              <CardContent className="p-5">
                <LoadingSkeleton variant="text" lines={4} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="bg-card/60 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">
              You are not enrolled in any courses yet.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Ask an admin to enroll you so you can manage student progress for
              those courses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const enrollment = getEnrollment(course.id);
            return (
              <Card
                key={course.id}
                className="bg-card/80 border-border/40 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Thumbnail */}
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-32 object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-32 bg-primary/5 rounded-xl flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-primary/40" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-1.5">
                    <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {course.topics?.length ?? 0} topics
                    </span>
                    {enrollment?.enrollmentDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Enrolled{" "}
                        {new Date(
                          (enrollment.enrollmentDate as any)?.seconds
                            ? (enrollment.enrollmentDate as any).seconds * 1000
                            : enrollment.enrollmentDate
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/teacher/courses?courseId=${course.id}`}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Student Progress
                    </Link>
                    <Link
                      to={`/teacher/content-management?courseId=${course.id}`}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg bg-muted/60 text-foreground hover:bg-muted transition-colors"
                    >
                      Manage Locks
                    </Link>
                  </div>

                  {enrollment && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-green-600 border-green-500/30 bg-green-500/10 w-fit"
                    >
                      Enrolled
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </TeacherLayout>
  );
}

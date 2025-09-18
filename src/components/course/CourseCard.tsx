
import { Play } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { Course } from "@/types/course";

type CourseCardProps = {
  course: Course;
  className?: string;
  variant?: 'default' | 'featured' | 'compact';
};

export function CourseCard({ course, className, variant = 'default' }: CourseCardProps) {
  const { user } = useAuth();
  const { isEnrolled } = useEnrollment();
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';
  const courseId = (course as any)?.id || course?.id?.toString();
  const userIsEnrolled = user && courseId ? isEnrolled(courseId) : false;

  return (
    <Card className={cn(
      "group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10",
      "hover:-translate-y-1 cursor-pointer border-0 bg-gradient-card",
      isFeatured && "ring-2 ring-primary/20 shadow-glow",
      className
    )}>
      <Link to={`/course/${courseId}`} className="block">
        {/* Thumbnail */}
        <div className={cn(
          "relative overflow-hidden bg-muted",
          isCompact ? "aspect-[16/9]" : "aspect-[16/10]"
        )}>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-primary/90 backdrop-blur-sm rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="h-6 w-6 text-primary-foreground fill-current" />
            </div>
          </div>

          {/* Status badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {userIsEnrolled && (
              <Badge variant="secondary" className="bg-success text-success-foreground">
                Enrolled
              </Badge>
            )}
            {isFeatured && (
              <Badge className="bg-gradient-primary text-primary-foreground">
                Featured
              </Badge>
            )}
          </div>
        </div>

        <CardContent className={cn("p-4", isCompact && "p-3")}>
          <div className="space-y-2">
            <h3 className={cn(
              "font-semibold leading-tight text-foreground group-hover:text-primary transition-colors",
              isCompact ? "text-sm" : "text-lg",
              "line-clamp-2"
            )}>
              {course.title}
            </h3>

            {!isCompact && course.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {course.description}
              </p>
            )}

            <div className="flex items-center text-xs text-muted-foreground">
              <span>by {course.authorName}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className={cn("px-4 pb-4 pt-0", isCompact && "px-3 pb-3")}>
          <div className="w-full space-y-3">
            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                {/* {course.total_lessons > 0 && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>{course.total_lessons} lessons</span>
                  </div>
                )}
                {course.total_students > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{course.total_students}</span>
                  </div>
                )}
                {course.course_duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{course.course_duration}</span>
                  </div>
                )} */}
              </div>

              {course.salePrice && (
                <div className="font-semibold text-primary">
                  ₹{course.salePrice}
                </div>
              )}
            </div>

            {/* Action button */}
            {!isCompact && (
              <Button
                variant="outline"
                size="sm"
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
              >
                {userIsEnrolled ? 'Continue Learning' : 'View Course'}
              </Button>
            )}
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
};

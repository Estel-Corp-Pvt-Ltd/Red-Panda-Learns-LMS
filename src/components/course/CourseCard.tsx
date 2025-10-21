import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CART_ACTION } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/course";
import { getCourseStructureCounts } from "@/utils/course";
import { parseDuration } from "@/utils/date-time";
import { BookOpen, Clock, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

type CourseCardProps = {
  course: Course;
  className?: string;
  variant?: "default" | "featured" | "compact";
};

const CourseCard = ({ course, className, variant = "default" }: CourseCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { cart, cartDispatch } = useCart();
  const { isEnrolled } = useEnrollment();

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  const courseId = String(course?.id);
  const userIsEnrolled = user && isEnrolled(courseId);
  const isAddedToCart = cart.some((item) => item.courseId === courseId);

  const handleCart = () => {
    if (userIsEnrolled) {
      navigate(`/course/${courseId}`);
      return;
    }
    if (isAddedToCart) {
      navigate("/cart");
      return;
    }

    cartDispatch({
      type: CART_ACTION.ADD,
      item: { courseId },
    });

    toast({
      title: "Course added",
      description: `${course.title} has been added to your cart.`,
    });
  };

  const { lessonCount } = getCourseStructureCounts(course);
  const { hours, minutes } = parseDuration(course.durationSeconds);

  return (
    <Card
      className={cn(
        "group overflow-hidden cursor-pointer border-0 bg-gradient-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10",
        isFeatured && "ring-2 ring-primary/20 shadow-glow",
        className
      )}
    >

      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          isCompact ? "aspect-[16/9]" : "aspect-[16/10]"
        )}
      >
        {course.thumbnail && (
          <img
            src={course.thumbnail}
            alt={`${course.title} thumbnail`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-primary/90 backdrop-blur-sm rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          {userIsEnrolled && (
            <Badge variant="secondary" className="bg-primary text-white">
              Enrolled
            </Badge>
          )}
          {isFeatured && (
            <Badge className="bg-gradient-primary text-primary-foreground">Featured</Badge>
          )}
        </div>
      </div>

      <CardContent className={cn("p-4 space-y-2", isCompact && "p-3 space-y-1")}>
        <h3
          className={cn(
            "font-semibold leading-tight text-foreground transition-colors group-hover:text-primary line-clamp-2",
            isCompact ? "text-sm" : "text-lg"
          )}
        >
          {course.title}
        </h3>

        {!isCompact && course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
        )}

        {
          course.instructorName &&
          <p className="text-xs text-muted-foreground">by {course.instructorName}</p>
        }
      </CardContent>

      <CardFooter className={cn("px-4 pb-4 pt-0", isCompact && "px-3 pb-3")}>
        <div className="w-full space-y-3">

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{lessonCount} lessons</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{hours} hrs</span>
                <span>{minutes} min</span>
              </div>
            </div>

            {course.salePrice && (
              <div className="font-semibold text-primary">
                ₹{course.salePrice}
              </div>
            )}
          </div>

          {userIsEnrolled ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
              onClick={() => navigate(`/course/${courseId}`)}
            >
              Continue Learning
            </Button>
          ) : (
            <div className="flex justify-between items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCart}
                className="flex-1 transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
              >
                {isAddedToCart ? "Go to Cart" : "Add to Cart"}
              </Button>
              <Link to={`/course/${courseId}`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                >
                  View Course
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;

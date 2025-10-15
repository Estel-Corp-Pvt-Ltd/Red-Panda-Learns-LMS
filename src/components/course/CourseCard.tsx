import { Play, BookOpen, Users, Clock } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { CART_ACTION } from "@/constants";
import type { Course } from "@/types/course";

type CourseCardProps = {
  course: Course;
  className?: string;
  variant?: "default" | "featured" | "compact";
};

export function CourseCard({ course, className, variant = "default" }: CourseCardProps) {
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

  /** Handles adding course to cart or navigating if already in cart */
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

  return (
    <Card
      className={cn(
        "group overflow-hidden cursor-pointer border-0 bg-gradient-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10",
        isFeatured && "ring-2 ring-primary/20 shadow-glow",
        className
      )}
    >
      {/* --- Thumbnail --- */}
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          isCompact ? "aspect-[16/9]" : "aspect-[16/10]"
        )}
      >
        {/* Background image */}
        {course.thumbnail && (
          <img
            src={course.thumbnail}
            alt={`${course.title} thumbnail`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-primary/90 backdrop-blur-sm rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {userIsEnrolled && (
            <Badge variant="secondary" className="bg-success text-success-foreground">
              Enrolled
            </Badge>
          )}
          {isFeatured && (
            <Badge className="bg-gradient-primary text-primary-foreground">Featured</Badge>
          )}
        </div>
      </div>

      {/* --- Content --- */}
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

        <p className="text-xs text-muted-foreground">by {course.authorName}</p>
      </CardContent>

      {/* --- Footer --- */}
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
          {/* Actions */}
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
}

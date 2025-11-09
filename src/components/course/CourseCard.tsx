import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CURRENCY, CART_ACTION, USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/course";
import { getCourseStructureCounts } from "@/utils/course";
import { BookOpen, Clock, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

type CourseCardProps = {
  course: Course;
  className?: string;
  variant?: "default" | "featured" | "compact";
};

const CourseCard = ({
  course,
  className,
  variant = "default",
}: CourseCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { cart, cartDispatch } = useCart();
  const { isEnrolled } = useEnrollment();

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  const courseId = String(course?.id);
  const courseUrl = `/courses/${course.slug ? course.slug : course.id}`;
  const userIsEnrolled = user && isEnrolled(courseId);
  const isAddedToCart = cart.some((item) => item.refId === courseId);

  const handleCart = () => {
    if (userIsEnrolled) {
      navigate(courseUrl);
      return;
    }
    if (isAddedToCart) {
      navigate("/cart");
      return;
    }
    cartDispatch({ type: CART_ACTION.ADD, item: { type: "COURSE", refId: courseId } });
    toast({
      title: "Course added",
      description: `${course.title} has been added to your cart.`,
    });
  };

  const { lessonCount } = getCourseStructureCounts(course);

  // Pricing helpers
  const regularPrice =
    typeof course.regularPrice === "number" ? course.regularPrice : 0;
  const hasSale = typeof course.salePrice === "number";
  const salePrice = hasSale ? (course.salePrice as number) : regularPrice;
  const isFree = salePrice === 0;
  const showSlash = hasSale; // show slash if salePrice is present

  const formatINR = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: CURRENCY.INR,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <Card
      role="link"
      tabIndex={0}
      className={cn(
        "group overflow-hidden cursor-pointer border-0 bg-gradient-card transition-shadow duration-300 hover:shadow-lg hover:bg-gray-100/50 hover:scale-[1.01]",
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
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-primary/90 backdrop-blur-sm rounded-full p-4">
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
            <Badge className="bg-gradient-primary text-primary-foreground">
              Featured
            </Badge>
          )}
        </div>
      </div>

      <CardContent
        className={cn("p-4 space-y-2", isCompact && "p-3 space-y-1")}
      >
        <h3
          className={cn(
            "font-semibold leading-tight text-foreground transition-colors group-hover:text-primary line-clamp-1",
            isCompact ? "text-sm" : "text-lg"
          )}
        >
          {course.title}
        </h3>

        {!isCompact && (
          <div className="text-sm text-muted-foreground line-clamp-2 h-10" dangerouslySetInnerHTML={{ __html: course.description.replace(/<[^>]+>/g, '') }}>
            {/* {course.description.replace(/<[^>]+>/g, '')} */}
          </div>
        )}
        {course.instructorName && (
          <p className="text-xs text-muted-foreground">
            by {course.instructorName}
          </p>
        )}
      </CardContent>

      <CardFooter className={cn("pb-4 pt-0", isCompact && "px-3 pb-3")}>
        <div className="w-full space-y-3">
          <div className="flex flex-nowrap items-center justify-between gap-y-2 text-xs text-muted-foreground">
            <div className="flex flex-nowrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <BookOpen className="h-3 w-3 flex-shrink-0" />
                <span>{lessonCount} lessons</span>
              </div>
              {course.duration && (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>
                    {course.duration.hours} hrs {course.duration.minutes} min
                  </span>
                </div>
              )}
            </div>

            {/* Slash pricing */}
            <div className="flex flex-col items-baseline whitespace-nowrap">
              {showSlash && (
                <span className="line-through text-[10px] text-muted-foreground">
                  {formatINR(regularPrice)}
                </span>
              )}
              <span className="font-semibold text-base text-primary">
                {isFree ? "FREE" : formatINR(salePrice)}
              </span>
            </div>
          </div>
          {user?.role === USER_ROLE.ADMIN ? (
            <div className="flex justify-between">
              <Link to={courseUrl}><Button>View Course</Button></Link>
              <Link to={`/admin/edit-course/${course.id}`}><Button>Edit Course</Button></Link>
            </div>
          ) : (<>
            {userIsEnrolled ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(courseUrl);
                }}
              >
                Continue Learning
              </Button>
            ) : (
              <div className="flex justify-between items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCart();
                  }}
                  className="flex-1 transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary"
                >
                  {isAddedToCart ? "Go to Cart" : "Add to Cart"}
                </Button>
                <Link
                  to={courseUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  >
                    View Course
                  </Button>
                </Link>
              </div>
            )}
          </>)}
        </div>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;

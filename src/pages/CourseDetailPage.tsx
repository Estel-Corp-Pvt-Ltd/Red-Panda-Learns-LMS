import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  CART_ACTION,
  CURRENCY,
  ENROLLED_PROGRAM_TYPE,
  ORDER_STATUS,
} from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import { useCourseQuery } from "@/hooks/useCaching";
import { cn } from "@/lib/utils";
import { enrollmentService } from "@/services/enrollmentService";
import { lessonService } from "@/services/lessonService";
import { orderService } from "@/services/orderService";
import { Topic } from "@/types/course";
import { Duration } from "@/types/general";
import { getCourseStructureCounts } from "@/utils/course";
import { formatDate } from "@/utils/date-time";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Info,
  Lock,
  Play,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { cart, cartDispatch } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnrolled } = useEnrollment();
  const { toast } = useToast();
  const [userIsEnrolled, setUserIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const isAddedToCart = cart.some((item) => item.type === "COURSE" && item.refId === courseId);
  const [lessonDescriptions, setLessonDescriptions] = useState<Record<string, string>>({});
  const [courseDuration, setCourseDuration] = useState<Duration>({ hours: 0, minutes: 0 });

  const {
    data: course,
    isLoading: courseLoading,
    isError: courseError,
    error: courseErrorData,
    refetch: refetchCourse,
  } = useCourseQuery(courseId!);

  const isLoading = courseLoading;
  const isError = courseError;

  const formatINR = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: CURRENCY.INR,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  // Check if user already enrolled (keep "after" behavior)
  useEffect(() => {
    const checkEnrollment = async () => {
      setEnrollmentLoading(true);

      if (user && courseId) {
        const enrolled = isEnrolled(courseId);
        setUserIsEnrolled(enrolled);
      }

      setEnrollmentLoading(false);
    };

    checkEnrollment();


  }, [user, courseId, isEnrolled]);

  // Fetch lesson descriptions separately
  useEffect(() => {
    const fetchLessonDescriptions = async () => {
      if (!courseId) return;

      const result = await lessonService.getLessonDetailsByCourseId(courseId);
      if (result.success) {
        setLessonDescriptions(result.data.descriptions);
        setCourseDuration(result.data.totalDuration);
      } else {
        toast({
          title: "Lesson descriptions unavailable",
          description: `Could not fetch lesson descriptions`,
        });
      }
    };

    fetchLessonDescriptions();
  }, [courseId]);


  const handleAddToCart = async () => {
    if (!user) {
      navigate("/auth/login", {
        state: {
          from: `/course/${courseId}`,
          message: "Please login to enroll in this course.",
        },
      });
      return;
    }

    if (userIsEnrolled) {
      if (course.topics && course.topics.length > 0) {
        const firstTopic = course.topics[0];
        navigate(`/course/${courseId}/lesson/${firstTopic.items[0].id}`);
      }
    }

    if (!course) return;
    cartDispatch({
      type: CART_ACTION.ADD,
      item: { type: "COURSE", refId: courseId },
    });
    toast({
      title: "Course Added",
      description: `${course.title} has been added to your cart.`,
    });
  };

  const handleCheckout = async () => {
    if (course.salePrice === 0) {
      // Enroll Directly
      const enrollmentResult = await enrollmentService.enrollUserInFreeCourse(
        user.id,
        courseId,
        lessonCount
      );

      const orderCreationResult = await orderService.createOrderForFreeCourse({
        userId: user.id,
        items: [
          {
            itemId: courseId,
            itemType: ENROLLED_PROGRAM_TYPE.COURSE,
            name: course.title,
            amount: 0,
            originalAmount: course.regularPrice,
          },
        ],
        status: ORDER_STATUS.COMPLETED,
        amount: 0,
        currency: CURRENCY.INR,
        billingAddress: null,
      });

      if (enrollmentResult.success && orderCreationResult.success) {
        toast({
          title: "Enrollment Successful!",
          description: "If you don't see the course, reload the page.",
        });
      } else {
        toast({
          title: "Enrollment Successful!",
          description: "If you don't see the course, reload the page.",
        });
      }
      navigate(`/course/${courseId}`);
      return;
    }
    navigate(`/checkout/${courseId}`);
  };

  const handleContinueLearning = () => {
    if (!course) return;

    // Get first lesson based on course structure
    let firstLessonId: string | null = null;

    if (course.cohorts && course.cohorts.length > 0) {
      const firstCohort = course.cohorts[0];
      if (firstCohort.topics && firstCohort.topics.length > 0) {
        const firstTopic = firstCohort.topics[0];
        if (firstTopic.items && firstTopic.items.length > 0) {
          firstLessonId = firstTopic.items[0].id;
        }
      }
    } else if (course.topics && course.topics.length > 0) {
      const firstTopic = course.topics[0];
      if (firstTopic.items && firstTopic.items.length > 0) {
        firstLessonId = firstTopic.items[0].id;
      }
    }

    if (firstLessonId) {
      navigate(`/course/${courseId}/lesson/${firstLessonId}`);
    } else {
      toast({
        title: "No content available",
        description: `This course has no lessons available yet.`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <LoadingSkeleton variant="text" lines={1} className="w-32 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <LoadingSkeleton variant="video" />
              <LoadingSkeleton variant="text" lines={3} />
            </div>
            <div className="space-y-4">
              <LoadingSkeleton variant="card" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <ErrorState
            error={courseErrorData as Error}
            onRetry={() => {
              refetchCourse();
            }}
            className="my-12"
          />
        </main>
      </div>
    );
  }

  const { topicCount, lessonCount } = getCourseStructureCounts(course);

  const renderTopic = (topic: Topic) => {
    const { id, title, items = [] } = topic;
    const hasItems = items.length > 0;

    return (
      <Collapsible key={id}>
        <CollapsibleTrigger
          className={cn(
            "group flex w-full items-center justify-between gap-3 my-2 p-3 rounded-lg text-muted-foreground hover:no-underline transition-colors border-muted border-2 hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <ChevronRight
              className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-90"
              aria-hidden="true"
            />
            <h4 className="text-[0.9rem] font-medium truncate">{title}</h4>
          </div>
          <span className="text-sm opacity-80">{items.length} lessons</span>
        </CollapsibleTrigger>

        <CollapsibleContent className="pl-7">
          {hasItems ? (
            items.map(({ id: lessonId, title: lessonTitle, type }) => (
              <Link
                key={lessonId}
                to={`/course/${courseId}/lesson/${lessonId}`}
                className="block p-3 rounded-lg border border-transparent transition-colors hover:bg-muted/50 hover:border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-muted rounded-full text-xs">
                    {type === "LESSON" ? (
                      <BookOpen className="text-red-500" size={14} />
                    ) : (
                      <Lock className="text-primary" size={14} />
                    )}
                  </div>
                  <p className="flex-1 min-w-0 text-[0.9rem] font-medium text-foreground truncate">
                    {lessonTitle}
                  </p>
                  <div className="relative group">
                    <Info className="text-muted-foreground hover:text-foreground cursor-pointer" size={16} />
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-popover text-popover-foreground p-1.5 text-sm rounded-md z-10 break-words border-l-2 border-b-2 border-primary/40 shadow-[2px_-2px_8px_rgba(0,0,0,0.15)]">
                      <p className="whitespace-pre-wrap leading-snug">
                        {lessonDescriptions[lessonId] || "No description available."}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              No lessons available.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const hasInstructor = !!course?.instructorName?.trim();
  const instructorInitial = course?.instructorName?.trim()?.[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link
            to="/courses"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            All Courses
          </Link>
          <span>/</span>
          <span className="text-foreground">{course.title}</span>
        </div>

        {/* Course header (title + meta) – full width */}
        <div className="space-y-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              {course.title}
            </h1>
          </div>

          {/* Course Meta */}
          <div className="flex flex-wrap items-center gap-4">
            {hasInstructor && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {/* <AvatarImage src={course.instructorAvatar} alt={course.instructorName} /> */}
                  <AvatarFallback className="bg-accent text-background">
                    {instructorInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {course.instructorName}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {(lessonCount as number) > 0 && (
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{lessonCount as number} lessons</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Thumbnail + About */}
          <div className="space-y-6">
            {/* Thumbnail */}
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                  {course.thumbnail ? (
                    <>
                      <img
                        src={course.thumbnail}
                        alt={`${course.title} thumbnail`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
                      <Play className="h-12 w-12 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* About This Course */}
            {course.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About This Course</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Continue/Enroll + Curriculum (+ Details) */}
          <div className="space-y-6">
            {/* Continue Learning / Enroll */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2 whitespace-nowrap text-3xl">
                    {course.regularPrice && course.salePrice && course.salePrice !== 0 ? (
                      <span className="line-through text-muted-foreground">
                        {formatINR(course.regularPrice)}
                      </span>
                    ) : (<span></span>)}
                    <span className="font-semibold text-primary">
                      {course.salePrice === 0 ? "FREE" : formatINR(course.salePrice)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {enrollmentLoading ? (
                      <Button className="w-full" size="lg" disabled>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Loading...
                        </div>
                      </Button>
                    ) : userIsEnrolled ? (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleContinueLearning}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Continue Learning
                      </Button>
                    ) : (
                      <>
                        {isAddedToCart ? (
                          <Link to="/cart">
                            <Button className="w-full">Go to Cart</Button>
                          </Link>
                        ) : (
                          <Button
                            className="w-full"
                            size="lg"
                            onClick={handleAddToCart}
                          >
                            Add to Cart
                          </Button>
                        )}
                        <Button className="w-full" onClick={handleCheckout}>
                          Go To Checkout
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Curriculum */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Course Curriculum
                </CardTitle>
                <div className="text-sm text-muted-foreground flex justify-between mt-2">
                  <p>
                    {topicCount} topics • {lessonCount} lessons
                  </p>
                  <span className="text-sm text-muted-foreground ml-4">
                    {course.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{courseDuration.hours} hrs</span>
                        <span>{courseDuration.minutes} min</span>
                      </div>
                    )}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {course.topics.length === 0 && course.cohorts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No curriculum available yet.</p>
                  </div>
                )}
                {course.topics.map((topic) => renderTopic(topic))}
                {course.cohorts?.map((cohort, cohortIndex) => (
                  <div key={`cohort-${cohortIndex}`} className="mt-6">
                    <h3 className="text-2xl font-semibold mb-2">
                      {cohort.title || `Cohort ${cohortIndex + 1}`}
                    </h3>
                    {cohort.topics?.map((topic) => renderTopic(topic))}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Course Details (optional) */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Course Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lessons</span>
                    <span className="font-medium">{lessonCount as number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">
                      {formatDate(course.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

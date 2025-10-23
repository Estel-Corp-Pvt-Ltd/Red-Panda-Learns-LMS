import { Header } from "@/components/Header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { CART_ACTION } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import {
  useCourseQuery,
} from "@/hooks/useCaching";
import { cn } from "@/lib/utils";
import { Topic } from "@/types/course";
import { formatDate } from "@/utils/date-time";
import { getCourseStructureCounts } from "@/utils/course"; // Import with alias
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Lock,
  Play,
  Share2,
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
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [userIsEnrolled, setUserIsEnrolled] = useState(false);

  const isAddedToCart = cart.some((item) => item.courseId === courseId);

  const {
    data: course,
    isLoading: courseLoading,
    isError: courseError,
    error: courseErrorData,
    refetch: refetchCourse,
  } = useCourseQuery(courseId!);

  const isLoading = courseLoading;
  const isError = courseError;

  // Get course structure counts using the utility function
  const courseCounts = course ? getCourseStructureCounts(course) : { cohortCount: 0, topicCount: 0, lessonCount: 0 };

  // Check if user already enrolled
  useEffect(() => {
    if (user && courseId) {
      if (isEnrolled(courseId)) {
        setUserIsEnrolled(true);
      } else {
        setUserIsEnrolled(false);
      }
    }
  }, [user, courseId, isEnrolled]);

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
      handleContinueLearning();
      return;
    }

    if (!course) return;
    cartDispatch({
      type: CART_ACTION.ADD,
      item: { courseId },
    });
    toast({
      title: "Course Added",
      description: `${course.title} has been added to your cart.`,
    });
  };

  const handleCheckout = async () => {
    navigate(`/checkout/${courseId}`);
  };

  const handleContinueLearning = () => {
    if (!course) return;

    // Get first lesson based on course structure
    let firstLessonId: string | null = null;

    if (course.cohorts && course.cohorts.length > 0) {
      // Course has cohorts structure
      const firstCohort = course.cohorts[0];
      if (firstCohort.topics && firstCohort.topics.length > 0) {
        const firstTopic = firstCohort.topics[0];
        if (firstTopic.items && firstTopic.items.length > 0) {
          firstLessonId = firstTopic.items[0].id;
        }
      }
    } else if (course.topics && course.topics.length > 0) {
      // Course has direct topics structure
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
        variant: "destructive"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Header */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                  {course.title}
                </h1>
              </div>

              {/* Course Meta */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src=""
                      alt={course?.instructorName}
                    />
                    <AvatarFallback className="bg-accent text-background">
                      {course?.instructorName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {course?.instructorName}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {courseCounts.lessonCount > 0 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{courseCounts.lessonCount} lessons</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Course Description */}
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

            {/* Course Curriculum */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Course Curriculum
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {courseCounts.cohortCount > 0 && `${courseCounts.cohortCount} cohorts • `}
                  {courseCounts.topicCount} topics • {courseCounts.lessonCount} lessons
                </p>
              </CardHeader>
              <CardContent>
                {(courseCounts.topicCount > 0) ? (
                  <Accordion
                    type="multiple"
                    value={expandedTopics}
                    onValueChange={setExpandedTopics}
                  >
                    {/* Render based on course structure */}
                    {course.cohorts && course.cohorts.length > 0 ? (
                      // Course has cohorts
                      course.cohorts.map((cohort, cohortIndex) => (
                        <div key={`cohort-${cohortIndex}`} className="mt-6">
                          {cohort.title && (
                            <h3 className="text-lg font-semibold mb-2">
                              {cohort.title}
                            </h3>
                          )}
                          {cohort.topics?.map((topic, topicIndex) => (
                            <TopicAccordion
                              key={`cohort-topic-${topic.id}`}
                              courseId={courseId!}
                              topic={topic}
                              index={topicIndex}
                              topicId={`cohort-${cohortIndex}-topic-${topic.id}`}
                              isEnrolled={userIsEnrolled}
                            />
                          ))}
                        </div>
                      ))
                    ) : (
                      // Course has direct topics
                      course.topics?.map((topic, index) => (
                        <TopicAccordion
                          key={`course-topic-${topic.id}`}
                          courseId={courseId!}
                          topic={topic}
                          index={index}
                          topicId={topic.id.toString()}
                          isEnrolled={userIsEnrolled}
                        />
                      ))
                    )}
                  </Accordion>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No curriculum available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Preview/Enroll Card */}
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {/* Price and actions */}
                <div className="space-y-4">
                  {course.salePrice && (
                    <div className="text-2xl font-bold text-foreground">
                      ₹{course.salePrice}
                    </div>
                  )}

                  <div className="space-y-2">
                    {userIsEnrolled ? (
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

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Course Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lessons</span>
                    <span className="font-medium">
                      {courseCounts.lessonCount}
                    </span>
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

// Topic Accordion Component (remains the same)
function TopicAccordion({
  topic,
  courseId,
  index,
  topicId,
  isEnrolled,
}: {
  topic: Topic;
  courseId: string;
  index: number;
  topicId: string;
  isEnrolled: boolean;
}) {
  const lessons = topic.items;

  return (
    <AccordionItem value={topicId}>
      <AccordionTrigger className="text-left hover:no-underline">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg text-sm font-medium text-primary">
            {index + 1}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground">
              {topic.title}
            </h4>
            <p className="text-sm text-muted-foreground">
              {lessons?.length || 0} lessons
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="ml-11 space-y-2">
          {lessons && lessons.length > 0 ? (
            lessons.map((lesson, lessonIndex) => {
              const lessonUrl = `/course/${courseId}/lesson/${lesson.id}`;

              return (
                <Link
                  key={lesson.id}
                  to={isEnrolled ? lessonUrl : "#"}
                  className={cn(
                    "block p-3 rounded-lg border border-transparent transition-colors hover:bg-muted/50 hover:border-border"
                  )}
                  onClick={(e) => {
                    if (!isEnrolled) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isEnrolled ? (
                      <div className="flex items-center justify-center w-6 h-6 bg-muted rounded-full text-xs">
                        {lessonIndex + 1}
                      </div>
                    ) : (
                      <Lock size={15} className="text-primary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {lesson.title || (lesson as any).title}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No lessons available for this topic.
            </p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
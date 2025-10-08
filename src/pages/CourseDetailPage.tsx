import { useCallback, useState,useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  BookOpen,
  Share2,
  Bookmark,
} from "lucide-react";
import { formatDate } from "@/utils/date-time";
import { Header } from "@/components/Header";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useCourseQuery,
} from "@/hooks/useCaching";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { cn } from "@/lib/utils";
import { Topic } from "@/types/course";
import { ENROLLED_PROGRAM_TYPE } from "@/constants";
import { enrollmentService } from "@/services/dummyEnrollmentService";
export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnrolled } = useEnrollment();
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [lessonCountByTopic, setLessonCountByTopic] = useState<{ [key: string]: number }>({});
  const [userIsEnrolled, setUserIsEnrolled] = useState(false);
  const handleLessonCount = useCallback(
    (topicId: string, count: number) =>
      setLessonCountByTopic((prev) => {
        // no update needed – prevents redundant renders
        if (prev[topicId] === count) return prev;
        return { ...prev, [topicId]: count };
      }),
    []
  );

  const {
    data: course,
    isLoading: courseLoading,
    isError: courseError,
    error: courseErrorData,
    refetch: refetchCourse,
  } = useCourseQuery(courseId!);

  const isLoading = courseLoading;
  const isError = courseError;

 
 useEffect(() => {
  const checkEnrollment = async () => {
    if (user && courseId) {
      const enrolled = await enrollmentService.isUserEnrolled(user.id, courseId);
      console.log("is user enrolled wala log", enrolled);
      setUserIsEnrolled(enrolled)
    }
  };

  checkEnrollment();
}, [user, courseId]);


  const handleEnrollClick = async () => {
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
    navigate(`/checkout/${courseId}`);
  };

  const handleContinueLearning = () => {
    // Find first lesson to navigate to
    if (course.topics && course.topics.length > 0) {
      const firstTopic = course.topics[0];
      const firstTopicId = firstTopic.id;
      // console.log("CourseDetailPage - Continue Learning:", {
      //   courseId,
      //   firstTopicId,
      //   navigationUrl: `/course/${courseId}/topic/${firstTopicId}/lesson/1`,
      // });
      console.log("clicked continue")
      navigate(`/course/${courseId}/lesson/${firstTopic.items[0].id}`);
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

  const progressPercentage = 0; // This would come from user progress data

  const totalLessons = Object.values(lessonCountByTopic).reduce(
    (sum: number, count: any) => sum + (Number(count) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link
            to="/"
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
                      alt={course?.authorName}
                    />
                    <AvatarFallback className="bg-accent text-background">
                      {course?.authorName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {course?.authorName}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {(totalLessons as number) > 0 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{totalLessons as number} lessons</span>
                    </div>
                  )}
                  {/* {course.total_students > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.total_students} students</span>
                    </div>
                  )}
                  {course.course_duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.course_duration}</span>
                    </div>
                  )} */}
                </div>
              </div>

              {/* Progress (if enrolled) */}
              {/* {userIsEnrolled && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Your Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {progressPercentage}% complete
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </CardContent>
                </Card>
              )} */}
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
                  {course.topics?.length || 0} topics • {totalLessons as number}{" "}
                  lessons
                </p>
              </CardHeader>
              <CardContent>
                {course.topics && course.topics.length > 0 ? (
                  <Accordion
                    type="multiple"
                    value={expandedTopics}
                    onValueChange={setExpandedTopics}
                  >
                    {course.topics.map((topic, index) => (
                      <TopicAccordion
                        key={topic.id || topic.id}
                        courseId={courseId!}
                        topic={topic}
                        index={index}
                        topicId={topic.id.toString()}
                        isEnrolled={true}
                      />
                    ))}
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
                {/* Course thumbnail */}
                {/* <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.post_title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
                      <Play className="h-12 w-12 text-primary-foreground" />
                    </div>
                  )}
                </div> */}

                {/* Price and actions */}
                <div className="space-y-4">
                  {course.salePrice && (
                    <div className="text-2xl font-bold text-foreground">
                      ₹{course.salePrice}
                    </div>
                  )}

                  <div className="space-y-2">
                    {
                      userIsEnrolled
                        ? (
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
                            <Button
                              className="w-full"
                              size="lg"
                              onClick={handleEnrollClick}
                            >
                              Enroll Now
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
                      {totalLessons as number}
                    </span>
                  </div>
                  {/* <div className="flex justify-between">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-medium">{course.total_students}</span>
                  </div> */}
                  {/* {course.course_duration && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">
                        {course.course_duration}
                      </span>
                    </div>
                  )} */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">
                      <span className="font-medium">
  {formatDate(course.updatedAt)}
</span>
                      
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

// Topic Accordion Component
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

  // Debug logging for lesson URLs
  // useEffect(() => {
  //   if (lessons && lessons.length > 0) {
  //     console.log("TopicAccordion - Lesson URLs:", {
  //       courseId,
  //       topicId,
  //       sampleLessonUrl: `/course/${courseId}/topic/${topicId}/lesson/${
  //         lessons[0].ID || lessons[0].id
  //       }`,
  //       isEnrolled,
  //       lessonsCount: lessons.length,
  //     });
  //   }
  // }, [lessons, courseId, topicId, isEnrolled]);

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
              const lessonUrl = `/course/${courseId}/lesson/${lesson.id
                }`;

              return (
                <Link
                  key={lesson.id}
                  to={isEnrolled ? lessonUrl : "#"}
                  className={cn(
                    "block p-3 rounded-lg border border-transparent transition-colors",
                    isEnrolled
                      ? "hover:bg-muted/50 hover:border-border"
                      : "cursor-not-allowed opacity-60"
                  )}
                  onClick={(e) => {
                    if (!isEnrolled) {
                      e.preventDefault();
                      console.log("Lesson click blocked - user not enrolled");
                    } else {
                      console.log("Navigating to lesson:", lessonUrl);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-muted rounded-full text-xs">
                      {lessonIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {lesson.title || (lesson as any).title}
                      </p>
                      {/* {lesson.duration && (
                        <p className="text-xs text-muted-foreground">
                          {lesson.lesson_duration}
                        </p>
                      )} */}
                    </div>
                    {/* {lesson.is_preview && (
                      <Badge variant="secondary" className="text-xs">
                        Preview
                      </Badge>
                    )} */}
                    {/* {!isEnrolled && !lesson.is_preview && (
                      <Badge variant="outline" className="text-xs">
                        Locked
                      </Badge>
                    )} */}
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
};

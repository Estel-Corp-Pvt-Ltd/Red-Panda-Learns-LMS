import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  CheckCircle,
  FileText,
  Video,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CourseNavigator } from "@/components/layout/CourseNavigator";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import {
  useCourseQuery,
} from "@/hooks/useCaching";
import { useAuth } from '@/contexts/AuthContext';
import { Lesson } from "@/types/lesson";
import { lessonService } from "@/services/lessonService";
import { LEARNING_UNIT, LESSON_TYPE } from "@/constants";
import LmsVideoPlayer from "@/components/LMSVideoPlayer";
import { toast } from "@/hooks/use-toast";

export default function LessonDetailPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(
    null
  );

  const { data: course, isLoading: courseLoading } = useCourseQuery(courseId!);

  const isLoading = courseLoading;


  useEffect(() => {
    if (!isLoading) {
      console.log("Courses are loading", course)
    }
  }, [isLoading]);

  const loadLessons = async () => {
    if (!course) return;

    // Collect course-level lessons
    const courseLessonIds =
      course.topics?.flatMap(topic => topic.items.map(item => item.id)) || [];

    // Collect cohort-level lessons
    const cohortLessonIds =
      course.cohorts?.flatMap(cohort =>
        cohort.topics?.flatMap(topic => topic.items.map(item => item.id)) || []
      ) || [];

    // Combine both
    const allLessonIds = [...courseLessonIds, ...cohortLessonIds];

    if (allLessonIds.length === 0) {
      setLessons([]);
      return;
    }

    // Fetch lesson details
    const allLessons = await lessonService.getLessonsByIds(allLessonIds);

    // Update state
    setLessons(allLessons);

  };

  useEffect(() => {
    if (course)
      loadLessons();
    return () => setLessons([]);
  }, [course]);

  useEffect(() => {
    if (lessons.length && lessonId && !selectedLesson) {
      setSelectedLesson(lessons.find(lesson => lesson.id === lessonId));
    }
  }, [lessons]);

  // Handle lesson selection from sidebar
  const handleLessonSelect = (lessonId: string | null) => {
    setSelectedLesson(lessons.find(lesson => lesson.id === lessonId));
  };

  // Mark lesson as completed
  const markLessonComplete = async () => {
    if (!user || !courseId || !lessonId) return;
    try {
      toast({
        title: "Error",
        description: "This functionality has not been implemented yet",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex">
          <div className="hidden lg:block">
            <div className="w-80 h-screen bg-card/50 p-4">
              <LoadingSkeleton variant="text" lines={8} />
            </div>
          </div>
          <main className="flex-1 p-6">
            <LoadingSkeleton variant="video" className="mb-6" />
            <LoadingSkeleton variant="text" lines={5} />
          </main>
        </div>
      </div>
    );
  }

  if (!selectedLesson) {
    return (
      <div className="min-h-screen bg-background">
        <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex">
          <div className="hidden lg:block">
            <CourseNavigator
              course={course}
              currentLesson={undefined}
              className="h-screen"
              onLessonClick={(item) => {
                if (item.type === LEARNING_UNIT.LESSON) {
                  handleLessonSelect(lessonId);
                }
              }}
            />
          </div>
          <main className="flex-1 max-w-none">
            <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">
                  Select a lesson to start learning
                </h1>
                <p className="text-muted-foreground">
                  Choose a lesson from the sidebar to view its content.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const hasVideo = selectedLesson.type === LESSON_TYPE.VIDEO_LECTURE;

  const getLessonContent = () => {
    let container = <></>;
    switch (selectedLesson.type) {
      case LESSON_TYPE.SLIDE_DECK:
        container = <iframe
          src={selectedLesson.embedUrl}
          className="w-full h-[80vh] border-0 rounded-xl shadow"
          allowFullScreen
        ></iframe>;
        break;
      case LESSON_TYPE.VIDEO_LECTURE:
        container =
          <LmsVideoPlayer url={selectedLesson.embedUrl} />
        break;
      default: break;
    }
    return container;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <CourseNavigator
            course={course}
            currentLesson={selectedLesson}
            className="h-screen"
            onLessonClick={(item) => {
              if (item.type === LEARNING_UNIT.LESSON) {
                handleLessonSelect(item.id);
              }
            }}
          />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <div className="h-full">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold">Course Content </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                </Button>
              </div>
              <CourseNavigator
                course={course}
                currentLesson={selectedLesson}
                className="h-screen"
                onLessonClick={(item) => {
                  if (item.type === LEARNING_UNIT.LESSON) {
                    handleLessonSelect(lessonId);
                  }
                }}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="w-full">
          <div className="mx-auto p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:text-primary transition-colors">
                Courses
              </Link>
              <span>/</span>
              <Link
                to={`/course/${courseId}`}
                className="hover:text-primary transition-colors"
              >
                {course?.title || "Course"}
              </Link>
              <span>/</span>
            </div>

            {/* Lesson Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">
                    {selectedLesson.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {hasVideo ? (
                        <>
                          <Video className="h-4 w-4" />
                          <span>Video Lesson</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          <span>{selectedLesson.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={markLessonComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              </div>
            </div>

            {/* Lesson Content */}
            {(selectedLesson.description ||
              (selectedLesson as any).content) && (
                <div className="w-full mb-8">
                  <div className="w-full my-8">
                    {getLessonContent()}
                  </div>

                  <div
                    className="prose prose-sm max-w-none dark:prose-invert leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html:
                        selectedLesson.description
                    }}
                  />

                  {/* Progress indicator */}
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Lesson Progress</span>
                        <span className="text-sm text-muted-foreground">
                          0% complete
                        </span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </CardContent>
                  </Card>
                </div>
              )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              {/* <div>
                {prevLesson ? (
                  <Button
                    variant="outline"
                    onClick={() => handleLessonSelect(prevLesson)}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous Lesson
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/course/${courseId}`)}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Course
                  </Button>
                )}
              </div> */}

              {/* <div>
                {nextLesson ? (
                  <Button
                    onClick={() => handleLessonSelect(nextLesson)}
                    className="flex items-center gap-2"
                  >
                    Next Lesson
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/course/${courseId}`)}
                    className="flex items-center gap-2"
                  >
                    Course Overview
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div> */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

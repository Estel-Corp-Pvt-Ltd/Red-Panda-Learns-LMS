import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { CourseNavigator } from "@/components/layout/CourseNavigator";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCourseQuery } from "@/hooks/useCaching";
import { useAuth } from "@/contexts/AuthContext";
import { LEARNING_UNIT } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { TopicItem } from "@/types/course";
import AssignmentView from "../components/course/AssignmentView";
import { LessonView } from "@/components/lesson/LessonView";

export default function LessonDetailPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TopicItem | null>(null);

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useCourseQuery(courseId!);

  // Set document title to include course and current item
  useEffect(() => {
    if (!course?.title) return;

    const prefix = selectedItem
      ? `${
          selectedItem.type === LEARNING_UNIT.ASSIGNMENT
            ? "Assignment"
            : "Lesson"
        }: ${selectedItem.title}`
      : "Course";

    const prev = document.title;
    document.title = `${prefix} | ${course.title}`;

    return () => {
      document.title = prev;
    };
  }, [course?.title, selectedItem?.title, selectedItem?.type]);

  // Find and set the lesson/assignment from URL params when course loads
  useEffect(() => {
    if (!course || !lessonId) return;

    let foundItem: TopicItem | null = null;

    // Check direct topics
    if (course.topics && course.topics.length > 0) {
      for (const topic of course.topics) {
        if (topic.items) {
          const item = topic.items.find((it) => it.id === lessonId);
          if (item) {
            foundItem = item;
            break;
          }
        }
      }
    }

    // If not found, check cohorts
    if (!foundItem && course.cohorts && course.cohorts.length > 0) {
      for (const cohort of course.cohorts) {
        if (cohort.topics) {
          for (const topic of cohort.topics) {
            if (topic.items) {
              const item = topic.items.find((it) => it.id === lessonId);
              if (item) {
                foundItem = item;
                break;
              }
            }
          }
        }
        if (foundItem) break;
      }
    }

    if (foundItem) {
      setSelectedItem(foundItem);
    } else {
      console.error(
        `Lesson/Assignment with id ${lessonId} not found in course ${courseId}`
      );
      toast({
        title: "Content not found",
        description: "The requested lesson or assignment could not be found.",
        variant: "destructive",
      });
    }
  }, [course, lessonId, courseId]);

  const handleItemSelect = (item: TopicItem) => {
    if (
      item.type === LEARNING_UNIT.LESSON ||
      item.type === LEARNING_UNIT.ASSIGNMENT
    ) {
      setSelectedItem(item);
      setSidebarOpen(false);
      // Update URL when selecting a different item
      window.history.pushState(
        null,
        "",
        `/course/${courseId}/lesson/${item.id}`
      );
    }
  };

  const handleMarkComplete = async () => {
    if (!user || !courseId || !selectedItem) return;

    try {
      toast({
        title: "Success",
        description: `${
          selectedItem.type === "LESSON" ? "Lesson" : "Assignment"
        } marked as completed!`,
      });
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        title: "Error",
        description: "Failed to mark as complete",
        variant: "destructive",
      });
    }
  };

  // Loading State
  if (courseLoading) {
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
            <LoadingSkeleton variant="text" lines={1} className="w-64 mb-3" />
            <LoadingSkeleton variant="video" className="mb-6" />
            <LoadingSkeleton variant="text" lines={5} />
          </main>
        </div>
      </div>
    );
  }

  // Error State
  if (courseError || !course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The course you're looking for doesn't exist or you don't have
              access.
            </p>
            <Button asChild>
              <Link to="/courses">Back to Courses</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if lessonId is provided but item not found
  if (lessonId && !selectedItem && !courseLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex">
          <div className="hidden lg:block">
            <CourseNavigator
              course={course}
              currentLesson={selectedItem}
              className="h-screen sticky top-0"
              onLessonClick={handleItemSelect}
            />
          </div>
          <main className="flex-1 max-w-4xl mx-auto p-4 lg:p-6">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
                <p className="text-muted-foreground mb-4">
                  The lesson or assignment you're looking for doesn't exist.
                </p>
                <Button asChild>
                  <Link to={`/course/${courseId}`}>Back to Course</Link>
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />

      {/* Top info bar: Course (bigger) + Lesson (smaller) */}
      <div className="border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {/* Course title bigger */}
            <h1 className="truncate text-lg md:text-xl font-semibold leading-tight">
              {course.title}
            </h1>
            {/* Lesson title smaller */}
            {selectedItem && (
              <p className="truncate text-xs md:text-sm text-muted-foreground leading-tight">
                {selectedItem.title}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open course outline"
          >
            Open Outline
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <CourseNavigator
            course={course}
            currentLesson={selectedItem}
            className="h-screen sticky top-0"
            onLessonClick={handleItemSelect}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-scroll">
          {!selectedItem ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  Select content to start learning
                </h2>
                <p className="text-muted-foreground">
                  Choose a lesson or assignment from the sidebar to begin.
                </p>
              </div>
            </div>
          ) : selectedItem.type === "ASSIGNMENT" ? (
            <AssignmentView
              assignmentId={selectedItem.id}
              onComplete={handleMarkComplete}
            />
          ) : (
            <LessonView
              lessonId={selectedItem.id}
              onComplete={handleMarkComplete}
            />
          )}
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div className="min-w-0">
                {/* Course bigger in sheet header too */}
                <h2 className="truncate text-base md:text-lg font-semibold">
                  {course.title}
                </h2>
                {selectedItem && (
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedItem.title}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <CourseNavigator
                course={course}
                currentLesson={selectedItem}
                onLessonClick={handleItemSelect}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

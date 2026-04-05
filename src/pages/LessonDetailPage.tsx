// src/pages/LessonDetailPage.tsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { Edit2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

import { Header } from "@/components/Header";
import { CourseNavigator } from "@/components/layout/CourseNavigator";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LockBadge } from "@/components/lock-badge";
import { LessonContent } from "@/components/LessonContent";

import { useCourseQuery } from "@/hooks/useCaching";
import { useContentLock } from "@/utils/is-content-locked";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";

import { learningProgressService } from "@/services/learningProgressService";
import { LearningProgress } from "@/types/learning-progress";
import { TopicItem } from "@/types/course";
import { LEARNING_UNIT, USER_ROLE } from "@/constants";
import { toast } from "@/hooks/use-toast";

export default function LessonDetailPage() {
  const { param, lessonId } = useParams<{ param: string; lessonId: string }>();
  const { user } = useAuth();
  const { isEnrolled } = useEnrollment();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TopicItem | null>(null);
  const [courseId, setCourseId] = useState("");
  const [userProgress, setUserProgress] = useState<LearningProgress | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const { data: course, isLoading: courseLoading, error: courseError } = useCourseQuery(param!);
  const { lock: contentLock, isLocked: isContentLocked, isLoading: lockLoading, timeRemaining } = useContentLock(selectedItem?.id);

  const isAdmin = user?.role === USER_ROLE.ADMIN;
  const isCourseInstructor = user?.role === USER_ROLE.INSTRUCTOR && course?.instructorId === user?.id;

  // Set courseId when course loads
  useEffect(() => {
    if (!param || courseLoading || !course) return;
    setCourseId(course.id);
  }, [param, courseLoading, course?.id]);

  // Check enrollment for non-admin users (instructors can access their own courses)
  useEffect(() => {
    if (!courseId || !user || courseLoading || isAdmin || isCourseInstructor) return;

    if (!isEnrolled(courseId)) {
      toast({
        title: "Access Denied",
        description: "You are not enrolled in this course.",
        variant: "destructive",
      });
      navigate(`/courses/${param}`);
    }
  }, [courseId, user, courseLoading, isEnrolled, isAdmin, isCourseInstructor, navigate, param]);

  // Set document title
  useEffect(() => {
    if (!course?.title) return;

    const prefix = selectedItem
      ? `${selectedItem.type === LEARNING_UNIT.ASSIGNMENT ? "Assignment" : "Lesson"}: ${selectedItem.title}`
      : "Course";

    const prev = document.title;
    document.title = `${prefix} | ${course.title}`;

    return () => {
      document.title = prev;
    };
  }, [course?.title, selectedItem?.title, selectedItem?.type]);

  // Save recently watched course for Dynamic Island header
  useEffect(() => {
    if (!course?.title || !param) return;
    try {
      localStorage.setItem(
        "redpanda_recent_course",
        JSON.stringify({ name: course.title, path: `/courses/${param}` })
      );
    } catch {}
  }, [course?.title, param]);

  // Find and set lesson from URL
  useEffect(() => {
    if (!course || !lessonId) return;

    let foundItem: TopicItem | null = null;

    for (const topic of course.topics ?? []) {
      const item = topic.items?.find((it) => it.id === lessonId);
      if (item) {
        foundItem = item;
        break;
      }
    }

    if (foundItem) {
      setSelectedItem(foundItem);
      if (user?.id && courseId) {
        learningProgressService.updateCurrentLesson(user.id, courseId, foundItem.id);
      }
    } else {
      console.error(`Lesson/Assignment with id ${lessonId} not found`);
      toast({
        title: "Content not found",
        description: "The requested lesson or assignment could not be found.",
        variant: "destructive",
      });
    }
  }, [course, lessonId]);

  // Fetch user progress
  useEffect(() => {
    if (!user?.id || !courseId) return;

    const fetchProgress = async () => {
      const result = await learningProgressService.getUserCourseProgress(user.id, courseId);
      if (result.success) {
        setUserProgress(result.data[0] ?? null);
      }
    };

    fetchProgress();
  }, [user?.id, courseId]);

  // Update lessonCompleted state
  useEffect(() => {
    if (!selectedItem || !userProgress?.lessonHistory) {
      setLessonCompleted(false);
      return;
    }

    const { lessonHistory } = userProgress;

    if (Array.isArray(lessonHistory)) {
      setLessonCompleted(lessonHistory.includes(selectedItem.id));
    } else {
      setLessonCompleted(!!lessonHistory[selectedItem.id]?.markedAsComplete);
    }
  }, [selectedItem?.id, userProgress]);

  const handleItemSelect = (item: TopicItem) => {
    if (item.type === LEARNING_UNIT.LESSON || item.type === LEARNING_UNIT.ASSIGNMENT) {
      setSelectedItem(item);
      setSidebarOpen(false);
      navigate(`/courses/${param}/lesson/${item.id}`, { replace: true });
    }
  };

  const handleComplete = async (isCompleted: boolean) => {
    if (!user || !courseId || !selectedItem) return;

    // const result = await learningProgressService.completeLesson(
    //   courseId,
    //   selectedItem.id,
    //   selectedItem.type,
    //   isCompleted
    // );
    console.warn("completeLesson cloud function is disabled");

    if (true) {
      const now = Timestamp.now();
      setUserProgress((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          lessonHistory: {
            ...(typeof prev.lessonHistory === "object" && !Array.isArray(prev.lessonHistory)
              ? prev.lessonHistory
              : {}),
            [selectedItem.id]: {
              timeSpent: 0,
              markedAsComplete: isCompleted,
              completedAt: now,
              type: selectedItem.type,
            },
          },
        };
      });

      setLessonCompleted(isCompleted);

      toast({
        title: isCompleted ? "Completed!" : "Incomplete",
        description: `${selectedItem.type === "LESSON" ? "Lesson" : "Assignment"} ${
          isCompleted ? "marked as complete." : "is not marked as complete."
        }`,
      });
    }
  };

  const getNextItem = (): TopicItem | null => {
    if (!course || !selectedItem) return null;

    const allItems = course.topics?.flatMap((t) => t.items ?? []) ?? [];
    const currentIndex = allItems.findIndex((item) => item.id === selectedItem.id);

    return currentIndex !== -1 && currentIndex < allItems.length - 1
      ? allItems[currentIndex + 1]
      : null;
  };

  const handleNavigateToNext = () => {
    const nextItem = getNextItem();
    if (nextItem) {
      setSelectedItem(nextItem);
      navigate(`/courses/${param}/lesson/${nextItem.id}`, { replace: true });
    } else {
      toast({
        title: "Course Complete!",
        description: "You've reached the end of this course.",
      });
    }
  };

  // Loading State
  if (courseLoading || lockLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex">
          <div className="hidden lg:block w-80 h-screen bg-card/50 p-4">
            <LoadingSkeleton variant="text" lines={8} />
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
              The course you're looking for doesn't exist or you don't have access.
            </p>
            <Button asChild>
              <Link to="/courses">Back to Courses</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Content Not Found State
  if (lessonId && !selectedItem) {
    return (
      <div className="min-h-screen bg-background">
        <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex">
          <div className="hidden lg:block">
            <CourseNavigator
              course={course}
              currentLesson={selectedItem}
              lessonHistory={userProgress?.lessonHistory ?? []}
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
                  <Link to={`/courses/${course.slug || course.id}`}>Back to Course</Link>
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />

      {/* Top info bar — claymorphic breadcrumb strip */}
      <div className="shrink-0 border-b border-border/40">
        <div className="mx-4 lg:mx-6 my-2 rounded-2xl bg-card/60 backdrop-blur-md border border-border/30 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)] px-4 py-2.5 flex items-center justify-between gap-3">
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink asChild>
                  <Link to={isAdmin ? "/admin" : "/dashboard"}>Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:inline-flex" />
              <BreadcrumbItem className="max-w-[200px]">
                <BreadcrumbLink asChild>
                  <Link to={`/courses/${param}`} className="truncate block">
                    {course.title}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {selectedItem && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="max-w-[250px]">
                    <BreadcrumbPage className="truncate flex items-center gap-1.5 font-medium">
                      {selectedItem.title}
                      {isAdmin && isContentLocked && <LockBadge />}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && selectedItem && (
              <Link to={`/admin/edit-course/${course.id}?itemId=${selectedItem.id}`}>
                <Button variant="outline" size="sm" className="rounded-xl shadow-sm">
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden rounded-xl"
              onClick={() => setSidebarOpen(true)}
            >
              Open Outline
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — claymorphic panel */}
        <aside className="hidden lg:flex w-80 flex-col shrink-0 border-r border-border/30 bg-gradient-to-b from-card/70 to-card/40 backdrop-blur-md">
          <CourseNavigator
            course={course}
            currentLesson={selectedItem}
            lessonHistory={userProgress?.lessonHistory ?? []}
            onLessonClick={handleItemSelect}
          />
        </aside>

        {/* Main Content — claymorphic card container */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-muted/20 dark:bg-muted/10">
          <div className="p-4 lg:p-6">
            <div className="rounded-3xl bg-card/80 backdrop-blur-sm border border-border/30 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.15)] p-4 lg:p-6">
              <LessonContent
                selectedItem={selectedItem}
                courseName={course.title}
                isAdmin={isAdmin}
                isContentLocked={isContentLocked}
                contentLock={contentLock}
                timeRemaining={timeRemaining}
                lessonCompleted={lessonCompleted}
                onComplete={handleComplete}
                onNavigateToNext={handleNavigateToNext}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80 border-r-0">
          <div className="h-full flex flex-col bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-xl">
            <div className="p-4 border-b border-border/30 shrink-0">
              <h2 className="text-base md:text-lg font-semibold">{course.title}</h2>
              {selectedItem && (
                <p className="text-xs text-muted-foreground mt-0.5">{selectedItem.title}</p>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <CourseNavigator
                course={course}
                currentLesson={selectedItem}
                lessonHistory={userProgress?.lessonHistory ?? []}
                onLessonClick={handleItemSelect}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
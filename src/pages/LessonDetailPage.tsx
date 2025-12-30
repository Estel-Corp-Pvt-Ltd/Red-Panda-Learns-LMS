import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { CourseNavigator } from "@/components/layout/CourseNavigator";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCourseQuery } from "@/hooks/useCaching";
import { useAuth } from "@/contexts/AuthContext";
import { LEARNING_UNIT, USER_ROLE } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { TopicItem } from "@/types/course";
import AssignmentView from "../components/course/AssignmentView";
import { LessonView } from "@/components/lesson/LessonView";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useNavigate } from "react-router-dom";
import { learningProgressService } from "@/services/learningProgressService";
import { LearningProgress } from "@/types/learning-progress";
import { serverTimestamp } from "firebase/firestore";
import { Edit2 } from "lucide-react";

export default function LessonDetailPage() {
  const { param, lessonId } = useParams<{
    param: string;
    lessonId: string;
  }>();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TopicItem | null>(null);
  const [courseId, setCourseId] = useState("");
  const { isEnrolled } = useEnrollment();
  const navigate = useNavigate();
  const { data: course, isLoading: courseLoading, error: courseError } = useCourseQuery(param!);

  const [userProgress, setUserProgress] = useState<LearningProgress | null>(null);
  useEffect(() => {
    if (!param || courseLoading || !course) return;
    setCourseId(course.id);
  }, [param, courseLoading, course?.id]);

  useEffect(() => {
    if (!courseId || !user || courseLoading) return;
    if (user?.role === USER_ROLE.ADMIN) return;

    // If not enrolled, redirect back to admin course page
    if (!isEnrolled(courseId)) {
      toast({
        title: "Access Denied",
        description: "You are not enrolled in this course.",
        variant: "destructive",
      });

      // Small delay for the toast to appear before redirect
      navigate(`/courses/${param}`);
    }
  }, [courseId, user, courseLoading, isEnrolled]);

  // Set document title to include course and current item
  useEffect(() => {
    if (!course?.title) return;

    const prefix = selectedItem
      ? `${selectedItem.type === LEARNING_UNIT.ASSIGNMENT ? "Assignment" : "Lesson"}: ${selectedItem.title
      }`
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

    if (foundItem) {
      setSelectedItem(foundItem);
    } else {
      console.error(`Lesson/Assignment with id ${lessonId} not found in course ${courseId}`);
      toast({
        title: "Content not found",
        description: "The requested lesson or assignment could not be found.",
        variant: "destructive",
      });
    }
  }, [course, lessonId, courseId]);

  const handleItemSelect = (item: TopicItem) => {
    if (item.type === LEARNING_UNIT.LESSON || item.type === LEARNING_UNIT.ASSIGNMENT) {
      setSelectedItem(item);
      setSidebarOpen(false);
    }
  };

  const fetchUserProgress = async (userId: string, courseId: string) => {
    const result = await learningProgressService.getUserCourseProgress(userId, courseId);
    if (result.success) {
      // assuming 0 or 1 doc per (user, course)
      setUserProgress(result.data[0] ?? null);
    } else {
      console.error("Failed to fetch progress:", result.error);
    }
  };

  useEffect(() => {
    if (user?.id && courseId) {
      fetchUserProgress(user.id, courseId);
    }
  }, [user?.id, courseId]);

  // Make sure selectedItem might be null:
  const [lessonCompleted, setLessonCompleted] = useState(false);

  useEffect(() => {
    if (!selectedItem || !userProgress) {
      setLessonCompleted(false);
      return;
    }
    const lessonHistory = userProgress.lessonHistory;
    setLessonCompleted(
      Array.isArray(lessonHistory)
        ? lessonHistory.includes(selectedItem.id)
        : !!lessonHistory[selectedItem.id]?.markedAsComplete &&
        (lessonHistory[selectedItem.id]?.type
          ? lessonHistory[selectedItem.id].type === selectedItem.type
          : true)
    );
  }, [selectedItem?.id, userProgress?.lessonHistory]);

  const onModalClose = async (isCompleted: boolean) => {
    if (!user || !courseId || !selectedItem) return;

    if (!isCompleted) {
      const result = await learningProgressService.completeLesson(
        courseId,
        selectedItem.id,
        selectedItem.type,
        isCompleted
      );
      if (result.success) {
        setUserProgress((prev) =>
          prev
            ? {
              ...prev,
              lessonHistory: {
                ...prev.lessonHistory,
                [selectedItem.id]: {
                  timeSpent: 0,
                  markedAsComplete: false,
                  completedAt: serverTimestamp(),
                  type: selectedItem.type,
                },
              },
            }
            : prev
        );

        toast({
          title: "Incomplete",
          description: `${selectedItem.type === "LESSON" ? "Lesson" : "Assignment"
            } is not marked as complete.`,
          variant: "default",
        });
      }
      return;
    }

    const result = await learningProgressService.completeLesson(
      courseId,
      selectedItem.id,
      selectedItem.type,
      isCompleted
    );
    if (result.success) {
      setUserProgress((prev) =>
        prev
          ? {
            ...prev,
            lessonHistory: {
              ...prev.lessonHistory,
              [selectedItem.id]: {
                timeSpent: 0,
                markedAsComplete: true,
                completedAt: serverTimestamp(),
                type: selectedItem.type,
              },
            },
          }
          : prev
      );

      toast({
        title: "Success",
        description: `${selectedItem.type === "LESSON" ? "Lesson" : "Assignment"
          } marked as completed!`,
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
                  <Link to={`/courses/${course.slug ? course.slug : course.id}`}>
                    Back to Course
                  </Link>
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

      {/* Top info bar: Course (bigger) + Lesson (smaller) */}
      <div className="border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <Link to={`/${user.role === USER_ROLE.ADMIN ? "admin" : "dashboard"}`}>
              <Button>Back to Dashboard</Button>
            </Link>
            <div className="min-w-0">
              {/* Course title bigger */}
              <h1 className="text-lg md:text-xl font-semibold leading-tight">{course.title}</h1>
              {/* Lesson title smaller */}
              {selectedItem && (
                <p className="truncate text-xs md:text-sm text-muted-foreground leading-tight">
                  {selectedItem.title}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit button - Admin only */}
            {user.role === USER_ROLE.ADMIN && selectedItem && (
              <Link to={`/admin/edit-course/${course.id}?itemId=${selectedItem.id}`}>
                <Button variant="outline" size="sm">
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
            )}

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
      </div>

      <div className="flex flex-1 min-h-0">
        {" "}
        {/* KEY: min-h-0 allows flex child to shrink */}
        {/* Fixed Sidebar */}
        <aside className="hidden lg:flex w-80 flex-col border-r bg-card/50 backdrop-blur-sm shrink-0">
          <CourseNavigator
            course={course}
            currentLesson={selectedItem}
            lessonHistory={userProgress?.lessonHistory ?? []}
            onLessonClick={handleItemSelect}
          />
        </aside>
        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6">
          {!selectedItem ? (
            <div className="flex items-center justify-center min-h-[80vh]">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Select content to start learning</h2>
                <p className="text-muted-foreground">
                  Choose a lesson or assignment from the sidebar to begin.
                </p>
              </div>
            </div>
          ) : selectedItem.type === "ASSIGNMENT" ? (
            <AssignmentView assignmentId={selectedItem.id} onComplete={onModalClose} />
          ) : (
            <LessonView
              lessonId={selectedItem.id}
              courseName={course.title}
              onComplete={onModalClose}
              completed={lessonCompleted}
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
                <h2 className="text-base md:text-lg font-semibold">{course.title}</h2>
                {selectedItem && (
                  <p className="text-xs text-muted-foreground">{selectedItem.title}</p>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {" "}
              {/* KEY: min-h-0 here too */}
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

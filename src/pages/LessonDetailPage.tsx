import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { CourseNavigator } from "@/components/layout/CourseNavigator";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCourseQuery } from "@/hooks/useCaching";
import { useAuth } from '@/contexts/AuthContext';
import { LEARNING_UNIT } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { TopicItem } from "@/types/course";
import AssignmentView from "../components/course/AssignmentView";
import { LessonView } from "@/components/lesson/LessonView";

export default function LessonDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TopicItem | null>(null);

  const { data: course, isLoading: courseLoading, error: courseError } = useCourseQuery(courseId!);

  const handleItemSelect = (item: TopicItem) => {
    if (item.type === LEARNING_UNIT.LESSON || item.type === LEARNING_UNIT.ASSIGNMENT) {
      setSelectedItem(item);
      setSidebarOpen(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!user || !courseId || !selectedItem) return;

    try {
      toast({
        title: "Success",
        description: `${selectedItem.type === "LESSON" ? "Lesson" : "Assignment"} marked as completed!`,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
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

  return (
    <div className="min-h-screen bg-background">
      <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
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
        <main className="flex-1 max-w-4xl mx-auto p-4 lg:p-6">
          {!selectedItem ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">
                  Select content to start learning
                </h1>
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
              <h2 className="font-semibold">Course Content</h2>
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

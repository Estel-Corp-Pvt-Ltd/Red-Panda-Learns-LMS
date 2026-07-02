import { TopicItem } from "@/types/course";
import { ContentLock } from "@/types/content-lock";
import { ContentLockedView } from "@/components/ContentLockedView";
// import AssignmentView from "@/components/course/AssignmentView";
import { LessonView } from "@/components/lesson/LessonView";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { FieldValue, Timestamp } from "firebase/firestore";

interface LessonContentProps {
  selectedItem: TopicItem | null;
  courseName: string;
  isAdmin: boolean;
  isLockLoading: boolean;
  isContentLocked: boolean;
  contentLock: ContentLock | null;
  timeRemaining: number | null;
  lessonCompleted: boolean;
  onComplete: (isCompleted: boolean) => Promise<void>;
  onNavigateToNext: () => void;
}

export function LessonContent({
  selectedItem,
  courseName,
  isAdmin,
  isLockLoading,
  isContentLocked,
  contentLock,
  timeRemaining,
  lessonCompleted,
  onComplete,
  onNavigateToNext,
}: LessonContentProps) {
  // No item selected
  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center rounded-2xl bg-card/60 border border-border/30 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] p-10 max-w-md">
          <h2 className="text-2xl font-bold mb-2">Select content to start learning</h2>
          <p className="text-muted-foreground">
            Choose a lesson from the sidebar to begin.
          </p>
        </div>
      </div>
    );
  }

  // Localized loading while this lesson's lock state resolves. Keeps the page
  // shell + CourseNavigator mounted (they live in LessonDetailPage) and avoids
  // flashing content before we know whether it's locked.
  if (isLockLoading) {
    return (
      <div className="w-full">
        <LoadingSkeleton variant="text" lines={1} className="w-64 mb-3" />
        <LoadingSkeleton variant="video" className="mb-6" />
        <LoadingSkeleton variant="text" lines={5} />
      </div>
    );
  }

  // Locked for non-admin users
  if (isContentLocked && contentLock && !isAdmin) {
    return <ContentLockedView lock={contentLock} timeRemaining={timeRemaining} />;
  }

  // Admin view with lock info or regular content
  const showAdminLockPanel = isAdmin && isContentLocked && contentLock;

  return (
    <div className={showAdminLockPanel ? "flex flex-col lg:flex-row gap-4" : ""}>
      <div className={showAdminLockPanel ? "flex-1" : "w-full"}>
        {/* Assignment branch temporarily disabled
        {selectedItem.type === "ASSIGNMENT" ? (
          <AssignmentView
            key={selectedItem.id}
            assignmentId={selectedItem.id}
            onComplete={onComplete}
            onNavigateToNext={onNavigateToNext}
          />
        ) : ( */}
          <LessonView
            lessonId={selectedItem.id}
            courseName={courseName}
            onComplete={onComplete}
            completed={lessonCompleted}
            onNavigateToNext={onNavigateToNext}
          />
        {/* )} */}
      </div>

      {showAdminLockPanel && (
        <ContentLockedView lock={contentLock} timeRemaining={timeRemaining} isAdminView />
      )}
    </div>
  );
}
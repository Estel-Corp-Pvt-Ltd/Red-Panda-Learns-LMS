import { TopicItem } from "@/types/course";
import { ContentLock } from "@/types/content-lock";
import { ContentLockedView } from "@/components/ContentLockedView";
import AssignmentView from "@/components/course/AssignmentView";
import { LessonView } from "@/components/lesson/LessonView";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

interface LessonContentProps {
  selectedItem: TopicItem | null;
  courseName: string;
  isAdmin: boolean;
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
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Select content to start learning</h2>
          <p className="text-muted-foreground">
            Choose a lesson or assignment from the sidebar to begin.
          </p>
        </div>
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
        {selectedItem.type === "ASSIGNMENT" ? (
          <AssignmentView
            key={selectedItem.id}
            assignmentId={selectedItem.id}
            onComplete={onComplete}
            onNavigateToNext={onNavigateToNext}
          />
        ) : (
          <LessonView
            lessonId={selectedItem.id}
            courseName={courseName}
            onComplete={onComplete}
            completed={lessonCompleted}
            onNavigateToNext={onNavigateToNext}
          />
        )}
      </div>

      {showAdminLockPanel && (
        <ContentLockedView lock={contentLock} timeRemaining={timeRemaining} isAdminView />
      )}
    </div>
  );
}
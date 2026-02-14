import {
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragMoveEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  ChevronRight,
  Edit2,
  Eye,
  FolderClosed,
  FolderOpen,
  GripVertical,
  NotebookPen,
  NotepadText,
  Plus,
  Save,
  Trash2,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LEARNING_UNIT } from "@/constants";
import { LessonImportModal } from "@/components/admin/LessonImportModal";
import { EditLessonModal } from "@/components/admin/LessonEditModel";
import AssignmentModal from "@/components/AssignmentModal";
import EditAssignmentModal from "./EditAssignmentModal";
import { CreateLessonModal } from "@/components/lesson/AddLesson";
import type { Lesson } from "@/types/lesson";
import type { Assignment } from "@/types/assignment";
import { LearningUnit } from "@/types/general";
import { Course, Topic } from "@/types/course";
import { useEffect, useMemo, useRef, useState } from "react";
import { courseService } from "@/services/courseService";
import { useToast } from "@/hooks/use-toast";
import { useLoadingOverlay } from "@/contexts/LoadingOverlayContext";
import { LearningContentType } from "@/types/lesson";
import ConfirmDialog from "../ConfirmDialog";
import { ContentLockForm } from "./ContentLockForm";
import { contentLockService } from "@/services/contentLockService";
import { ContentLock } from "@/types/content-lock";
import { log } from "@/utils/logger";

// ─── Types ──────────────────────────────────────────────────────────────────

type DraggableItem = {
  id: string;
  title: string;
  type: LearningUnit;
  depth: number;
  parentId: string | null;
  originalData?: Topic;
  refId?: string;
};

// ─── Type Predicates ────────────────────────────────────────────────────────

const isTopic = (item: DraggableItem) => item.type === LEARNING_UNIT.TOPIC;

const isChild = (item: DraggableItem) =>
  item.type === LEARNING_UNIT.LESSON || item.type === LEARNING_UNIT.ASSIGNMENT;

// ─── Drag & Drop Helpers ────────────────────────────────────────────────────
//
// The curriculum is a flat array where topics sit at depth=0 (parentId=null)
// and their lessons/assignments sit at depth=1 (parentId=topicId).
// The array position determines the visual ordering.

/**
 * Finds the index right after the last child of a topic.
 * Scans forward from `startIdx` until it hits another topic or the end.
 */
function findEndOfTopicChildren(
  list: DraggableItem[],
  topicId: string,
  startIdx: number
): number {
  let end = startIdx;
  for (let i = startIdx; i < list.length; i++) {
    if (list[i].parentId === topicId) {
      end = i + 1;
    } else if (isTopic(list[i])) {
      break;
    }
  }
  return end;
}

/**
 * Moves a topic and all its children to a new position.
 *
 * Direction-aware:
 *  - Dragging UP   → inserts BEFORE the target topic
 *  - Dragging DOWN → inserts AFTER the target topic and all its children
 *
 * Returns the new list, or null if the move is invalid.
 */
function moveTopic(
  list: DraggableItem[],
  draggedId: string,
  idxActive: number,
  idxOver: number,
  overItem: DraggableItem
): DraggableItem[] | null {
  const draggedItem = list[idxActive];
  const children = list.filter((item) => item.parentId === draggedId);
  const itemsToMove = [draggedItem, ...children];

  // If dropped on a child, resolve to its parent topic
  const targetTopicId = isChild(overItem) ? overItem.parentId : overItem.id;

  // Remove dragged items, then find the target in the remaining list
  const remaining = list.filter((item) => !itemsToMove.includes(item));
  const targetIdx = remaining.findIndex((i) => i.id === targetTopicId);
  if (targetIdx === -1) return null;

  const isDraggingUp = idxActive > idxOver;
  const insertIdx = isDraggingUp
    ? targetIdx
    : findEndOfTopicChildren(remaining, targetTopicId!, targetIdx + 1);

  const result = [
    ...remaining.slice(0, insertIdx),
    ...itemsToMove,
    ...remaining.slice(insertIdx),
  ];

  // Normalize depths for the moved items
  return result.map((item) => {
    if (item.id === draggedId) return { ...item, parentId: null, depth: 0 };
    if (item.parentId === draggedId) return { ...item, depth: 1 };
    return item;
  });
}

/**
 * Moves a child (lesson or assignment) to a new position.
 * Supports reordering within a topic and cross-topic moves.
 *
 * When dropped on a topic header → appends as the topic's last child
 * When dropped on another child  → uses arrayMove for precise positioning
 *
 * Returns the new list, or null if the move is invalid.
 */
function moveChild(
  list: DraggableItem[],
  draggedId: string,
  idxActive: number,
  idxOver: number,
  overItem: DraggableItem
): DraggableItem[] | null {
  const activeItem = list[idxActive];
  const newParentId = isTopic(overItem) ? overItem.id : overItem.parentId;

  if (!newParentId || newParentId === draggedId) return null;

  let reordered: DraggableItem[];

  if (isTopic(overItem)) {
    // Drop on a topic header: insert after the topic's last child.
    // We don't use arrayMove here because it places the item BEFORE
    // the topic header when dragging upward.
    const withoutActive = list.filter((item) => item.id !== draggedId);
    const topicIdx = withoutActive.findIndex((i) => i.id === overItem.id);
    const insertIdx = findEndOfTopicChildren(withoutActive, overItem.id, topicIdx + 1);

    reordered = [
      ...withoutActive.slice(0, insertIdx),
      { ...activeItem, parentId: newParentId, depth: 1 },
      ...withoutActive.slice(insertIdx),
    ];
  } else {
    // Drop on another child: arrayMove handles position correctly
    reordered = arrayMove(list, idxActive, idxOver);
    reordered = reordered.map((item) =>
      item.id === draggedId ? { ...item, parentId: newParentId, depth: 1 } : item
    );
  }

  // Safety: reject if any child ended up before the first topic
  const firstTopicIdx = reordered.findIndex(isTopic);
  if (firstTopicIdx === -1) return null;
  for (let i = 0; i < firstTopicIdx; i++) {
    if (isChild(reordered[i])) return null;
  }

  // Recalculate depths from parent relationships
  const idMap = new Map(reordered.map((i) => [i.id, i]));
  return reordered.map((item) => {
    if (isTopic(item) || !item.parentId) return { ...item, depth: 0 };
    const parent = idMap.get(item.parentId);
    return { ...item, depth: parent ? parent.depth + 1 : 0 };
  });
}

// ─── Serialization Helpers ──────────────────────────────────────────────────

/** Converts nested course topics into the flat draggable list. */
function flattenCurriculum(courseData: Course): DraggableItem[] {
  const result: DraggableItem[] = [];

  for (const topic of courseData.topics || []) {
    result.push({
      id: topic.id,
      title: topic.title,
      type: LEARNING_UNIT.TOPIC,
      depth: 0,
      parentId: null,
      originalData: topic,
    });

    for (const item of topic.items || []) {
      result.push({
        id: item.id,
        refId: item.id,
        title: item.title,
        type: item.type === LEARNING_UNIT.ASSIGNMENT ? LEARNING_UNIT.ASSIGNMENT : LEARNING_UNIT.LESSON,
        depth: 1,
        parentId: topic.id,
      });
    }
  }

  return result;
}

/** Converts the flat draggable list back into nested Topic[] for the API. */
function buildTopicsFromFlatList(items: DraggableItem[]): Topic[] {
  // Group children by parent topic ID
  const childrenMap = new Map<string, DraggableItem[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    if (!childrenMap.has(item.parentId)) childrenMap.set(item.parentId, []);
    childrenMap.get(item.parentId)!.push(item);
  }

  const topics: Topic[] = [];
  for (const item of items) {
    if (!isTopic(item) || item.parentId) continue;

    topics.push({
      id: item.id,
      title: item.title,
      items: (childrenMap.get(item.id) || [])
        .filter(isChild)
        .map((child) => ({
          id: child.refId ?? child.id,
          title: child.title,
          type: child.type as LearningContentType,
        })),
    });
  }

  return topics;
}

/**
 * Finds the insertion index after the last child of a parent topic.
 * Used when adding new lessons or assignments to a topic.
 */
function findInsertIndexForParent(
  list: DraggableItem[],
  parentId: string
): number {
  const parentIndex = list.findIndex((i) => i.id === parentId);
  if (parentIndex === -1) return -1;

  const parentDepth = list[parentIndex].depth;
  let insertIndex = parentIndex + 1;

  for (let i = parentIndex + 1; i < list.length; i++) {
    if (list[i].parentId === parentId) {
      insertIndex = i + 1;
    } else if (list[i].depth <= parentDepth || isTopic(list[i])) {
      break;
    }
  }

  return insertIndex;
}

// ─── SortableItem Component ─────────────────────────────────────────────────

type SortableItemProps = {
  id: string;
  children: React.ReactNode;
  type: LearningUnit;
  depth: number;
  onChange?: (id: string, expanded: boolean) => void;
};

const SortableItem = ({ id, children, type, depth, onChange }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${depth * 2}rem`,
  };

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    onChange?.(id, next);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center gap-3 p-3 rounded-md border bg-card hover:shadow-sm transition-shadow group">
        {type === LEARNING_UNIT.TOPIC && (
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground ${expanded ? "rotate-90" : ""}`}
            onClick={toggleExpanded}
          />
        )}
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

type CurriculumTabProps = {
  course: Course | null;
  initialItemId?: string | null;
};

const CurriculumTab = ({ course, initialItemId }: CurriculumTabProps) => {
  const { toast } = useToast();
  const { showOverlay, hideOverlay } = useLoadingOverlay();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── State ───────────────────────────────────────────────────────────────

  const [curriculum, setCurriculum] = useState<DraggableItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());

  // Modal state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemType, setEditingItemType] = useState<LearningUnit | null>(null);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] = useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [isAssignmentModelOpen, setIsAssignmentModelOpen] = useState(false);
  const [isAssignmentEditModalOpen, setIsAssignmentEditModalOpen] = useState(false);
  const [isLessonEditModelOpen, setIsLessonEditModelOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Lock state
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [topicLocks, setTopicLocks] = useState<Record<string, ContentLock | null>>({});

  // Ref to trigger auto-save after adding a Zoom meeting lesson
  const pendingSaveAfterLessonAdd = useRef(false);
  const isInitialMount = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived State ───────────────────────────────────────────────────────

  const firstLessonId = useMemo(() => {
    const first = curriculum.find(isChild);
    return first ? (first.refId ?? first.id) : null;
  }, [curriculum]);

  const draggedItem = useMemo(() => {
    return curriculum.find((i) => i.id === activeId);
  }, [activeId, curriculum]);

  // ── Effects ─────────────────────────────────────────────────────────────

  // Clean up auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Sync curriculum from course data
  useEffect(() => {
    if (course) setCurriculum(flattenCurriculum(course));
  }, [course]);

  // Auto-save after Zoom meeting lesson is added
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (pendingSaveAfterLessonAdd.current && curriculum.length > 0) {
      pendingSaveAfterLessonAdd.current = false;
      saveCurriculum();
    }
  }, [curriculum]);

  // Fetch content locks on mount / course change
  useEffect(() => {
    refetchLocks();
  }, [course?.id]);

  // Open edit modal if initialItemId is provided (from URL parameter)
  useEffect(() => {
    if (!initialItemId || curriculum.length === 0) return;

    const item = curriculum.find((i) => i.id === initialItemId || i.refId === initialItemId);
    if (!item) return;

    if (item.type === LEARNING_UNIT.LESSON) {
      setEditingItemId(initialItemId);
      setIsLessonEditModelOpen(true);
    } else if (item.type === LEARNING_UNIT.ASSIGNMENT) {
      setEditingItemId(initialItemId);
      setIsAssignmentEditModalOpen(true);
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, [initialItemId, curriculum]);

  // ── Drag Handlers ─────────────────────────────────────────────────────

  const handleDragMove = (event: DragMoveEvent) => {
    // Cancel any pending auto-save while the user is actively dragging
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setIsDragging(true);
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    setCurriculum((prev) => {
      const list = [...prev];
      const idxActive = list.findIndex((i) => i.id === draggedId);
      const idxOver = list.findIndex((i) => i.id === overId);

      if (idxActive === -1 || idxOver === -1) return prev;

      const activeItem = list[idxActive];
      const overItem = list[idxOver];

      let result: DraggableItem[] | null = null;

      if (isTopic(activeItem)) {
        result = moveTopic(list, draggedId, idxActive, idxOver, overItem);
      } else if (isChild(activeItem)) {
        result = moveChild(list, draggedId, idxActive, idxOver, overItem);
      }

      if (!result) return prev;

      // Debounced auto-save: waits 3s, resets if another drag happens
      if (JSON.stringify(prev) !== JSON.stringify(result)) {
        const snapshot = result;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => saveCurriculum(snapshot), 3000);
      }

      return result;
    });
  };

  // ── Persistence ───────────────────────────────────────────────────────

  /**
   * Saves the curriculum to the backend.
   * Accepts an optional snapshot to avoid stale closure issues
   * (e.g. when called from queueMicrotask inside setCurriculum).
   */
  const saveCurriculum = async (snapshot?: DraggableItem[]) => {
    const data = snapshot ?? curriculum;
    log("Saving curriculum structure...", data);

    if (!course) {
      toast({ title: "Error", description: "Course data is not available.", variant: "destructive" });
      return;
    }

    try {
      showOverlay("Saving Curriculum...");
      const topics = buildTopicsFromFlatList(data);
      await courseService.updateCourse(course.id, { topics });
      toast({ title: "Success", description: "Curriculum saved!" });
    } catch (error) {
      toast({ title: "Error", description: `Failed to save: ${error}`, variant: "destructive" });
    } finally {
      hideOverlay();
    }
  };

  const refetchLocks = async () => {
    const topicIds = curriculum
      .filter(isTopic)
      .map((item) => item.id);

    if (topicIds.length === 0) return;

    try {
      const topicRes = await contentLockService.getLocksByContentIds(topicIds);
      const lockMap: Record<string, ContentLock | null> = {};
      topicIds.forEach((id) => (lockMap[id] = null));
      if (topicRes.success) {
        topicRes.data.forEach((lock) => (lockMap[lock.contentId] = lock));
      }
      setTopicLocks(lockMap);
    } catch (err) {
      console.error("Failed to refetch locks", err);
    }
  };

  // ── CRUD Operations ───────────────────────────────────────────────────

  const addTopic = () => {
    setCurriculum((prev) => [
      {
        id: `topic_${Date.now()}`,
        title: "New Topic",
        type: LEARNING_UNIT.TOPIC,
        depth: 0,
        parentId: null,
      },
      ...prev,
    ]);
  };

  const updateItemTitle = (itemId: string, title: string) => {
    setCurriculum((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, title } : item))
    );
  };

  const deleteItem = (id: string, type: LearningUnit) => {
    setCurriculum((prev) => {
      if (type === LEARNING_UNIT.TOPIC) {
        // Remove the topic and all its children
        const topicIndex = prev.findIndex((i) => i.id === id);
        if (topicIndex === -1) return prev;

        let endIndex = topicIndex + 1;
        for (let i = topicIndex + 1; i < prev.length; i++) {
          if (prev[i].depth <= prev[topicIndex].depth) break;
          endIndex = i + 1;
        }
        return [...prev.slice(0, topicIndex), ...prev.slice(endIndex)];
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const addLessonsToParent = (lessons: Lesson[]) => {
    if (!activeParentId) return;

    const insertIndex = findInsertIndexForParent(curriculum, activeParentId);
    if (insertIndex === -1) return;

    const newItems: DraggableItem[] = lessons.map((l) => ({
      id: l.id,
      refId: l.id,
      title: l.title,
      type: LEARNING_UNIT.LESSON,
      depth: 1,
      parentId: activeParentId,
    }));

    const updated = [...curriculum];
    updated.splice(insertIndex, 0, ...newItems);
    setCurriculum(updated);
    setIsLessonSelectorModalOpen(false);
  };

  const handleAssignmentSave = (assignment: Assignment) => {
    setCurriculum((prev) => {
      // Update existing assignment
      const exists = prev.some((i) => i.id === assignment.id);
      if (exists) {
        return prev.map((item) =>
          item.id === assignment.id ? { ...item, title: assignment.title } : item
        );
      }

      // Insert new assignment under active parent
      if (!activeParentId) {
        toast({ title: "Error", description: "No topic selected", variant: "destructive" });
        return prev;
      }

      const insertIndex = findInsertIndexForParent(prev, activeParentId);
      if (insertIndex === -1) return prev;

      const newAssignment: DraggableItem = {
        id: assignment.id,
        refId: assignment.id,
        title: assignment.title,
        type: LEARNING_UNIT.ASSIGNMENT,
        depth: 1,
        parentId: activeParentId,
      };

      const updated = [...prev];
      updated.splice(insertIndex, 0, newAssignment);
      return updated;
    });

    setIsAssignmentModelOpen(false);
    setEditingItemId(null);
    setActiveParentId(null);
  };

  // ── Visibility ────────────────────────────────────────────────────────

  /** Whether a curriculum item should be visible in the list. */
  const isItemVisible = (item: DraggableItem): boolean => {
    // Topics are always visible
    if (isTopic(item)) return true;
    // While dragging a topic, hide all children to reduce visual noise
    if (draggedItem && isTopic(draggedItem)) return false;
    // Children are only visible when their parent topic is expanded
    return expandedTopicIds.has(item.parentId!);
  };

  const toggleTopicExpanded = (id: string, expanded: boolean) => {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      expanded ? next.add(id) : next.delete(id);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (!course) {
    return (
      <Card className="shadow-lg border">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading curriculum...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            {course.title} – Curriculum
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={addTopic} className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Topic
            </Button>
            <Button size="sm" onClick={() => saveCurriculum()} className="flex items-center gap-1">
              <Save className="h-4 w-4" /> Save
            </Button>
            <Link
              to={`/courses/${course.slug || course.id}/lesson/${firstLessonId}`}
              target="_blank"
            >
              <Button size="sm" className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                Preview Course
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
          >
            <SortableContext
              items={curriculum.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {curriculum.map((item) =>
                  !isItemVisible(item) ? null : (
                    <SortableItem
                      key={item.id}
                      id={item.id}
                      type={item.type}
                      depth={item.depth}
                      onChange={toggleTopicExpanded}
                    >
                      <div className="flex items-center justify-between w-full group">
                        {/* Left side: icon + title */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isTopic(item) ? (
                            expandedTopicIds.has(item.id) ? (
                              <FolderOpen className="h-6 w-6 text-primary" />
                            ) : (
                              <FolderClosed className="h-6 w-6 text-primary" />
                            )
                          ) : null}
                          {item.type === LEARNING_UNIT.LESSON && (
                            <BookOpen className="h-6 w-6 text-red-500" />
                          )}
                          {item.type === LEARNING_UNIT.ASSIGNMENT && (
                            <NotepadText className="h-6 w-6 text-blue-500" />
                          )}

                          {/* Title: editable for topics, link for lessons, plain for assignments */}
                          {isTopic(item) ? (
                            editingItemId === item.id ? (
                              <Input
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onBlur={() => updateItemTitle(item.id, newItemName)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateItemTitle(item.id, newItemName);
                                    e.currentTarget.blur();
                                    setEditingItemId(null);
                                  }
                                }}
                                className="flex-1 min-w-0"
                                autoFocus
                              />
                            ) : (
                              <span
                                className="flex-1 truncate cursor-pointer hover:underline"
                                onDoubleClick={() => {
                                  setEditingItemId(item.id);
                                  setNewItemName(item.title);
                                }}
                              >
                                {item.title}
                              </span>
                            )
                          ) : item.type === LEARNING_UNIT.LESSON ? (
                            <Link
                              to={`/courses/${course.slug || course.id}/lesson/${item.id}`}
                              target="_blank"
                              className="flex-1 truncate text-foreground hover:opacity-80"
                              style={{ textDecoration: "none" }}
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <span className="flex-1 truncate">{item.title}</span>
                          )}
                        </div>

                        {/* Right side: action buttons */}
                        <div className="flex items-center gap-1">
                          {isTopic(item) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setIsCreateLessonOpen(true);
                                  setActiveParentId(item.id);
                                }}
                                className="opacity-0 group-hover:opacity-100"
                                title="Add Lesson"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActiveParentId(item.id);
                                  setEditingItemId(null);
                                  setIsAssignmentModelOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100"
                                title="Add Assignment"
                              >
                                <NotebookPen className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setNewItemName(item.title);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Rename Topic"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActiveContentId(item.id);
                                  setIsLockModalOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100"
                                title="Lock Content"
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingItemType(LEARNING_UNIT.TOPIC);
                                  setIsConfirmDialogOpen(true);
                                }}
                                title="Delete Topic"
                                className="opacity-0 group-hover:opacity-100 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {isChild(item) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  if (item.type === LEARNING_UNIT.LESSON) {
                                    setIsLessonEditModelOpen(true);
                                  } else {
                                    setIsAssignmentEditModalOpen(true);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingItemType(item.type);
                                  setIsConfirmDialogOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </SortableItem>
                  )
                )}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      <LessonImportModal
        courseId={course.id}
        isOpen={isLessonSelectorModalOpen}
        onClose={() => setIsLessonSelectorModalOpen(false)}
        onConfirm={addLessonsToParent}
      />

      <EditLessonModal
        courseId={course.id}
        lessonId={editingItemId}
        isOpen={isLessonEditModelOpen}
        onClose={() => {
          setIsLessonEditModelOpen(false);
          setEditingItemId(null);
        }}
        onLessonUpdated={(lesson: Lesson) => {
          setCurriculum((prev) =>
            prev.map((item) =>
              item.id === lesson.id && item.type === LEARNING_UNIT.LESSON
                ? { ...item, title: lesson.title }
                : item
            )
          );
          setEditingItemId(null);
          setIsLessonEditModelOpen(false);
        }}
      />

      <ConfirmDialog
        title="Delete Item"
        body={`Are you sure you want to delete this ${
          editingItemType === LEARNING_UNIT.TOPIC
            ? "topic"
            : editingItemType === LEARNING_UNIT.LESSON
              ? "lesson"
              : "assignment"
        }? This action cannot be undone.`}
        open={isConfirmDialogOpen}
        onCancel={() => {
          setIsConfirmDialogOpen(false);
          setEditingItemId(null);
        }}
        onConfirm={() => {
          if (editingItemId && editingItemType) {
            deleteItem(editingItemId, editingItemType);
          }
          setIsConfirmDialogOpen(false);
          setEditingItemId(null);
        }}
      />

      {isAssignmentModelOpen && (
        <AssignmentModal
          courseId={course.id}
          onCancel={() => {
            setIsAssignmentModelOpen(false);
            setEditingItemId(null);
            setActiveParentId(null);
          }}
          onSave={handleAssignmentSave}
        />
      )}

      <EditAssignmentModal
        courseId={course.id}
        assignmentId={editingItemId}
        isOpen={isAssignmentEditModalOpen}
        onClose={() => {
          setIsAssignmentEditModalOpen(false);
          setEditingItemId(null);
        }}
        onUpdated={(updatedAssignment) => {
          setCurriculum((prev) =>
            prev.map((item) =>
              item.id === updatedAssignment.id && item.type === LEARNING_UNIT.ASSIGNMENT
                ? { ...item, title: updatedAssignment.title }
                : item
            )
          );
          setIsAssignmentEditModalOpen(false);
          setEditingItemId(null);
        }}
      />

      <CreateLessonModal
        courseId={course.id}
        isOpen={isCreateLessonOpen}
        onClose={() => {
          setIsCreateLessonOpen(false);
          setEditingItemId(null);
        }}
        onLessonCreated={(lesson, shouldAutoSave) => {
          if (shouldAutoSave) {
            pendingSaveAfterLessonAdd.current = true;
          }
          addLessonsToParent([lesson]);
          setIsCreateLessonOpen(false);
          setEditingItemId(null);
        }}
      />

      {isLockModalOpen && activeContentId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsLockModalOpen(false)}
          />
          <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div
              className="relative bg-background p-8 sm:p-10 shadow-2xl"
              style={{
                clipPath: "polygon(0 0, 90% 0, 100% 10%, 100% 100%, 10% 100%, 0 90%)",
              }}
            >
              <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none">
                <div className="absolute top-4 left-4 w-full h-full border-t-[12px] border-l-[12px] border-foreground/90" />
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none">
                <div className="absolute bottom-4 right-4 w-full h-full border-b-[12px] border-r-[12px] border-foreground/90" />
              </div>
              <div className="absolute top-4 right-12 w-12 h-1 bg-foreground/20" />
              <div className="absolute bottom-4 left-12 w-12 h-1 bg-foreground/20" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold uppercase tracking-wider mb-6 text-center border-b pb-2 border-border">
                  LOCK TOPIC
                </h3>
                <ContentLockForm
                  contentType="TOPIC"
                  contentId={activeContentId}
                  existingLock={topicLocks[activeContentId] ?? null}
                  onSaved={() => {
                    setIsLockModalOpen(false);
                    setActiveContentId(null);
                    refetchLocks();
                  }}
                  onDeleted={() => {
                    setIsLockModalOpen(false);
                    setActiveContentId(null);
                    refetchLocks();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CurriculumTab;

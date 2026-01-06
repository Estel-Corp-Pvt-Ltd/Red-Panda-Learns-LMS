import {
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragMoveEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
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
  Search,
  Trash2,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LEARNING_CONTENT, LEARNING_UNIT } from "@/constants";
import { LessonImportModal } from "@/components/admin/LessonImportModal";
import { EditLessonModal } from "@/components/admin/LessonEditModel";
import AssignmentModal from "@/components/AssignmentModal";
import EditAssignmentModal from "./EditAssignmentModal";
import { CreateLessonModal } from "@/components/lesson/AddLesson";
import type { Lesson } from "@/types/lesson";
import type { Assignment } from "@/types/assignment";
import { LearningUnit } from "@/types/general";
import { Course, Topic } from "@/types/course";
import { useEffect, useMemo, useState } from "react";
import { courseService } from "@/services/courseService";
import { useToast } from "@/hooks/use-toast";
import { useLoadingOverlay } from "@/contexts/LoadingOverlayContext";
import { LearningContentType } from "@/types/lesson";
import { arrayMove } from "@dnd-kit/sortable";
import ConfirmDialog from "../ConfirmDialog";
import { ContentLockForm } from "./ContentLockForm";
import { contentLockService } from "@/services/contentLockService";
import { ContentLock } from "@/types/content-lock";

// ─── Types ─────────────────────────────────────────────
type DraggableItem = {
  id: string;
  title: string;
  type: LearningUnit;
  depth: number;
  parentId: string | null;
  originalData?: Topic;
  refId?: string;
};

type SortableItemProps = {
  id: string;
  children: React.ReactNode;
  type: LearningUnit;
  depth: number;
  onChange?: (id: string, state: boolean) => void;
};

const SortableItem = ({ id, children, type, depth, onChange }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const [showChildren, setShowChildren] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${depth * 2}rem`,
  };

  const toggleChildren = () => {
    if (onChange) {
      onChange(id, !showChildren);
    }
    setShowChildren(!showChildren);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center gap-3 p-3 rounded-md border bg-card hover:shadow-sm transition-shadow group">
        {type === LEARNING_UNIT.TOPIC ? (
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground ${showChildren ? "rotate-90" : ""}`}
            onClick={toggleChildren}
          />
        ) : null}
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Props ─────────────────────────────────────────────
type CurriculumTabProps = {
  course: Course | null;
  initialItemId?: string | null;
};

// ─── Component ─────────────────────────────────────────────
const CurriculumTab = ({ course, initialItemId }: CurriculumTabProps) => {
  const { toast } = useToast();
  const { showOverlay, hideOverlay } = useLoadingOverlay();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [isAssignmentEditModalOpen, setIsAssignmentEditModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<DraggableItem[]>([]);

  const [isTopicItemAdded, setIsTopicItemAdded] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] = useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [isAssignmentModelOpen, setIsAssignmentModelOpen] = useState(false);
  const [isLessonEditModelOpen, setIsLessonEditModelOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTopicIds, setActiveTopicIds] = useState<Set<string>>(new Set());
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [editingItemType, setEditingItemType] = useState<LearningUnit | null>(null);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [loadingLocks, setLoadingLocks] = useState(false);
  const [topicLocks, setTopicLocks] = useState<Record<string, ContentLock | null>>({});
  // ✅ Add null check for course in useEffect
  useEffect(() => {
    if (course) {
      setCurriculum(getFlatCurriculum(course));
    }
  }, [course]);
  const handleDragMove = (event: DragMoveEvent) => {
    const { active } = event;
    setIsDragging(true);
    setActiveId(String(active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveId(null);
    // Early exit: no valid drop target or dropped on self
    if (!over || active.id === over.id) return;
    console.log(active.data);
    const activeId = String(active.id);
    const overId = String(over.id);

    setCurriculum((prev) => {
      const list = [...prev];

      // Find item indices
      const idxActive = list.findIndex((i) => i.id === activeId);
      const idxOver = list.findIndex((i) => i.id === overId);

      // Guard: invalid indices
      if (idxActive === -1 || idxOver === -1) return prev;

      // Type predicates
      const isTopic = (item: DraggableItem) => item.type === LEARNING_UNIT.TOPIC;
      const isChild = (item: DraggableItem) =>
        item.type === LEARNING_UNIT.LESSON || item.type === LEARNING_UNIT.ASSIGNMENT;

      const activeItem = list[idxActive];
      const overItem = list[idxOver];

      // ─────────────────────────────────────────────────────────
      // CASE 1: Dragging a TOPIC (move with children)
      // ─────────────────────────────────────────────────────────
      if (isTopic(activeItem)) {
        // Find all children of the active topic
        const activeTopicChildren = list.filter((item) => item.parentId === activeId);

        // Calculate the new position
        let newIndex = idxOver;

        // If dropping on a child, find its parent topic position
        if (isChild(overItem)) {
          const overParentIndex = list.findIndex((i) => i.id === overItem.parentId);
          if (overParentIndex !== -1) {
            newIndex = overParentIndex;
          }
        }

        // Remove the topic and its children
        const itemsToMove = [activeItem, ...activeTopicChildren];
        const filteredList = list.filter((item) => !itemsToMove.includes(item));

        // Insert at new position
        const newList = [
          ...filteredList.slice(0, newIndex),
          ...itemsToMove,
          ...filteredList.slice(newIndex),
        ];

        // Re-index the entire list to maintain proper order
        const final = newList.map((item) => {
          // For the moved topic, ensure it stays at root level
          if (item.id === activeId) {
            return { ...item, parentId: null, depth: 0 };
          }
          // For children of the moved topic, maintain their relationship
          if (item.parentId === activeId) {
            return { ...item, depth: 1 };
          }
          return item;
        });

        if (JSON.stringify(prev) !== JSON.stringify(final)) {
          queueMicrotask(() => saveCurriculumStructure());
        }

        return final;
      }

      // ─────────────────────────────────────────────────────────
      // CASE 2: Dragging a CHILD (Lesson or Assignment)
      // Can be moved between topics
      // ─────────────────────────────────────────────────────────
      if (isChild(activeItem)) {
        let newParentId: string | null = null;

        // Determine new parent based on drop target
        if (isTopic(overItem)) {
          // Dropped on a topic → becomes child of that topic
          newParentId = overItem.id;
        } else if (isChild(overItem)) {
          // Dropped on another child → inherits that child's parent
          newParentId = overItem.parentId;
        }

        // Guard: must have valid parent and cannot be own parent
        if (!newParentId || newParentId === activeId) return prev;

        // Perform array reorder
        let reordered = arrayMove(list, idxActive, idxOver);

        // Update the moved item's parent
        reordered = reordered.map((item) =>
          item.id === activeId ? { ...item, parentId: newParentId, depth: 1 } : item
        );

        // ─────────────────────────────────────────────────────────
        // CRITICAL GUARD: Prevent children before first topic
        // ─────────────────────────────────────────────────────────
        const firstTopicIdx = reordered.findIndex(isTopic);
        if (firstTopicIdx === -1) return prev; // No topics exist

        // Check if any child appears before the first topic
        for (let i = 0; i < firstTopicIdx; i++) {
          if (isChild(reordered[i])) {
            // INVALID: child positioned before first topic → snap back
            return prev;
          }
        }

        // ─────────────────────────────────────────────────────────
        // Recalculate depths from parent relationships
        // ─────────────────────────────────────────────────────────
        const idMap = new Map(reordered.map((i) => [i.id, i]));

        const computeDepth = (item: DraggableItem): number => {
          if (isTopic(item)) return 0;
          if (!item.parentId) return 0;
          const parent = idMap.get(item.parentId);
          return parent ? parent.depth + 1 : 0;
        };

        const final = reordered.map((item) => ({
          ...item,
          depth: computeDepth(item),
        }));

        // ─────────────────────────────────────────────────────────
        // ✅ Persist only if structure actually changed
        // ─────────────────────────────────────────────────────────
        if (JSON.stringify(prev) !== JSON.stringify(final)) {
          queueMicrotask(() => saveCurriculumStructure());
        }

        return final;
      }

      // Fallback: unrecognized operation
      return prev;
    });
  };

  const saveCurriculumStructure = async () => {
    if (!course) {
      toast({
        title: "Error",
        description: "Course data is not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      showOverlay("Saving Curriculum...");

      const newTopics: Topic[] = [];
      const childrenMap = new Map<string, DraggableItem[]>();
      curriculum.forEach((item) => {
        if (item.parentId) {
          if (!childrenMap.has(item.parentId)) childrenMap.set(item.parentId, []);
          childrenMap.get(item.parentId)!.push(item);
        }
      });

      for (const item of curriculum) {
        if (!item.parentId && item.type === LEARNING_UNIT.TOPIC) {
          const lessonItems = (childrenMap.get(item.id) || [])
            .filter((l) => l.type === LEARNING_UNIT.LESSON || l.type === LEARNING_UNIT.ASSIGNMENT)
            .map((lessonItem) => ({
              id: lessonItem.refId ?? lessonItem.id,
              title: lessonItem.title,
              type: lessonItem.type as LearningContentType,
            }));

          newTopics.push({
            id: item.id,
            title: item.title,
            items: lessonItems,
          });
        }
      }

      const updates: Partial<Course> = { topics: newTopics };
      await courseService.updateCourse(course.id, updates);

      toast({ title: "Success", description: "Curriculum saved!" });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save: ${error}`,
        variant: "destructive",
      });
    } finally {
      hideOverlay();
    }
  };

  const handleAssignment = (assignment: Assignment) => {
    setCurriculum((prev) => {
      // ─────────────────────────────────────────────────────────
      // ✅ CHECK IF EDITING EXISTING ASSIGNMENT
      // ─────────────────────────────────────────────────────────
      const existingIndex = prev.findIndex((i) => i.id === assignment.id);

      if (existingIndex !== -1) {
        // ✅ UPDATE MODE: Just update the title
        return prev.map((item) =>
          item.id === assignment.id ? { ...item, title: assignment.title } : item
        );
      }

      // ─────────────────────────────────────────────────────────
      // ✅ CREATE MODE: Insert under active parent
      // ─────────────────────────────────────────────────────────
      if (!activeParentId) {
        toast({
          title: "Error",
          description: "No topic selected",
          variant: "destructive",
        });
        return prev;
      }

      const parentIndex = prev.findIndex((i) => i.id === activeParentId);
      if (parentIndex === -1) return prev;

      const parentDepth = prev[parentIndex].depth;

      // Find insert position (after last child of parent)
      let insertIndex = parentIndex + 1;

      for (let i = parentIndex + 1; i < prev.length; i++) {
        const item = prev[i];

        if (item.parentId === activeParentId) {
          insertIndex = i + 1;
        } else if (item.depth <= parentDepth || item.type === LEARNING_UNIT.TOPIC) {
          break;
        }
      }

      const newAssignment = {
        id: assignment.id,
        refId: assignment.id,
        title: assignment.title,
        type: LEARNING_UNIT.ASSIGNMENT,
        depth: parentDepth + 1,
        parentId: activeParentId,
      };

      const newCurriculum = [...prev];
      newCurriculum.splice(insertIndex, 0, newAssignment);
      return newCurriculum;
    });

    // ✅ Clean up modal state
    setIsAssignmentModelOpen(false);
    setEditingItemId(null);
    setActiveParentId(null);
  };

  /** Flatten backend structure into draggable list form */
  const getFlatCurriculum = (courseData: Course): DraggableItem[] => {
    const flatList: DraggableItem[] = [];

    (courseData.topics || []).forEach((topic) => {
      flatList.push({
        id: topic.id,
        title: topic.title,
        type: LEARNING_UNIT.TOPIC,
        depth: 0,
        parentId: null,
        originalData: topic,
      });

      (topic.items || []).forEach((item) => {
        const isAssignment = item.type === LEARNING_UNIT.ASSIGNMENT;
        flatList.push({
          id: item.id,
          refId: item.id,
          title: item.title,
          type: isAssignment ? LEARNING_UNIT.ASSIGNMENT : LEARNING_UNIT.LESSON,
          depth: 1,
          parentId: topic.id,
        });
      });
    });

    return flatList;
  };

  /** Create and insert a new top-level Topic */
  const addItem = () => {
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

  /** Update an item's title (topic/lesson/assignment) */
  const updateItemName = (itemId: string, name: string) => {
    setCurriculum((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, title: name } : item))
    );
  };

  /** Delete any curriculum item */
  const deleteItem = (id: string, type: LearningUnit) => {
    if (type === LEARNING_UNIT.TOPIC) {
      // also remove its children
      setCurriculum((prev) => {
        const topicIndex = prev.findIndex((i) => i.id === id);
        if (topicIndex === -1) return prev;

        const topicDepth = prev[topicIndex].depth;

        let endIndex = topicIndex + 1;
        for (let i = topicIndex + 1; i < prev.length; i++) {
          if (prev[i].depth <= topicDepth) break;
          endIndex = i + 1;
        }

        return [...prev.slice(0, topicIndex), ...prev.slice(endIndex)];
      });
    }
    setCurriculum((prev) => prev.filter((i) => i.id !== id));
  };

  /** Pick lessons from library to attach to a topic */
  const addLessonToParent = (parentId: string) => {
    setActiveParentId(parentId);
    setIsLessonSelectorModalOpen(true);
  };

  /** Add lessons to the active topic (at end of topic's children) */
  const addLessonsToParent = (lessons: Lesson[]) => {
    const parentIndex = curriculum.findIndex((i) => i.id === activeParentId);
    if (parentIndex === -1) return;

    const parentDepth = curriculum[parentIndex].depth;

    let insertIndex = parentIndex + 1;

    for (let i = parentIndex + 1; i < curriculum.length; i++) {
      const item = curriculum[i];

      if (item.parentId === activeParentId) {
        insertIndex = i + 1;
      } else if (item.depth <= parentDepth || item.type === LEARNING_UNIT.TOPIC) {
        break;
      }
    }

    const newItems = lessons.map((l) => ({
      id: l.id,
      refId: l.id, // ✅ Add refId for consistency
      title: l.title,
      type: LEARNING_UNIT.LESSON,
      depth: parentDepth + 1,
      parentId: activeParentId,
    }));

    const newCurriculum = [...curriculum];
    newCurriculum.splice(insertIndex, 0, ...newItems);
    setCurriculum(newCurriculum);
    setIsLessonSelectorModalOpen(false);
  };

  /** Save the current curriculum structure to the backend */

  const firstLessonId = useMemo(() => {
    const firstLesson = curriculum.find(
      (i) => i.type === LEARNING_UNIT.LESSON || i.type === LEARNING_UNIT.ASSIGNMENT
    );
    return firstLesson ? firstLesson.refId ?? firstLesson.id : null;
  }, [curriculum]);

  const activeItem = useMemo(() => {
    return curriculum.find((i) => i.id === activeId);
  }, [activeId, curriculum]);

  // Handle initial itemId to open modal (from URL parameter)
  useEffect(() => {
    if (initialItemId && curriculum.length > 0) {
      // Find the item in curriculum
      const item = curriculum.find((i) => i.id === initialItemId || i.refId === initialItemId);

      if (item) {
        // Check item type and open appropriate modal
        if (item.type === LEARNING_UNIT.LESSON) {
          setEditingItemId(initialItemId);
          setIsLessonEditModelOpen(true);
        } else if (item.type === LEARNING_UNIT.ASSIGNMENT) {
          setEditingItemId(initialItemId);
          setIsAssignmentEditModalOpen(true);
        }

        // Clear the URL parameter after handling
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [initialItemId, curriculum]);

  // Add this useEffect to fetch locks on mount and when course changes
  useEffect(() => {
    refetchLocks();
  }, [course?.id]);

  // Fix the refetchLocks function to use curriculum instead of course.topics
  const refetchLocks = async () => {
    const topicIds = curriculum
      .filter((item) => item.type === LEARNING_UNIT.TOPIC)
      .map((item) => item.id);

    if (topicIds.length === 0) return;

    try {
      setLoadingLocks(true);

      const topicRes = await contentLockService.getLocksByContentIds(topicIds);

      const topicMap: Record<string, ContentLock | null> = {};
      topicIds.forEach((id) => (topicMap[id] = null));
      if (topicRes.success) {
        topicRes.data.forEach((lock) => (topicMap[lock.contentId] = lock));
      }
      setTopicLocks(topicMap);
    } catch (err) {
      console.error("Failed to refetch locks", err);
    } finally {
      setLoadingLocks(false);
    }
  };

  // Also update the useEffect dependency to trigger when curriculum changes
  useEffect(() => {
    if (curriculum.length > 0) {
      refetchLocks();
    }
  }, [curriculum.length]);

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
            {/* Add Topic Button */}
            <Button size="sm" onClick={addItem} className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Topic
            </Button>

            {/* Save */}
            <Button size="sm" onClick={saveCurriculumStructure} className="flex items-center gap-1">
              <Save className="h-4 w-4" /> Save
            </Button>

            {/* Preview */}
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

        {/* ───── List Body ─────────────────────── */}
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
                  item.type !== "TOPIC" &&
                  (activeItem?.type === LEARNING_UNIT.TOPIC ||
                    !activeTopicIds.has(item.parentId)) ? null : (
                    <SortableItem
                      key={String(item.id)}
                      id={String(item.id)}
                      type={item.type}
                      depth={item.depth}
                      onChange={(id, state) => {
                        setActiveTopicIds((prev) => {
                          const newSet = new Set(prev);
                          if (state) {
                            newSet.add(id);
                          } else {
                            newSet.delete(id);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <div className="flex items-center justify-between w-full group">
                        {/* ───── Left: icon + title ───────────── */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.type === LEARNING_UNIT.TOPIC ? (
                            activeTopicIds.has(item.id) ? (
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

                          {/* ───── Title Logic ───────────── */}
                          {item.type === LEARNING_UNIT.TOPIC ? (
                            editingItemId === item.id ? (
                              <Input
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onBlur={() => updateItemName(item.id, newItemName)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateItemName(item.id, newItemName);
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

                        {/* ───── Right: Action Buttons ───────────── */}
                        <div className="flex items-center gap-1">
                          {item.type === LEARNING_UNIT.TOPIC && (
                            <>
                              {/* Add Lesson */}
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
                              {/* Import Lesson */}
                              {/* <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addLessonToParent(item.id)}
                              className="opacity-0 group-hover:opacity-100"
                              title="Import Lesson"
                            >
                              <Search className="h-4 w-4" />
                            </Button> */}
                              {/* Add Assignment */}
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
                              {/* Rename Topic */}
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

                              {/* Lock Content */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActiveContentId(item.id); // or assignmentId
                                  setIsLockModalOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100"
                                title="Lock Content"
                              >
                                <Lock className="h-4 w-4 " />
                              </Button>

                              {/* Delete Topic */}
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

                          {(item.type === LEARNING_UNIT.LESSON ||
                            item.type === LEARNING_UNIT.ASSIGNMENT) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (item.type === LEARNING_UNIT.LESSON) {
                                    setEditingItemId(item.id);
                                    setIsLessonEditModelOpen(true);
                                  } else if (item.type === LEARNING_UNIT.ASSIGNMENT) {
                                    setEditingItemId(item.id);
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

      {/* ───── Modals ───────────────────────────────────────────── */}
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
          setCurriculum((prev) => {
            return prev.map((item) => {
              if (item.id === lesson.id && item.type === LEARNING_UNIT.LESSON) {
                // Ensure we're only updating lesson items
                return {
                  ...item,
                  title: lesson.title,
                } as DraggableItem;
              }
              return item;
            });
          });
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
          onSave={handleAssignment}
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
          // ✅ Update the curriculum list immediately
          setCurriculum((prev) =>
            prev.map((item) => {
              if (item.id === updatedAssignment.id && item.type === LEARNING_UNIT.ASSIGNMENT) {
                return {
                  ...item,
                  title: updatedAssignment.title,
                } as DraggableItem;
              }
              return item;
            })
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
        onLessonCreated={(lesson) => {
          addLessonsToParent([lesson]);
          setIsCreateLessonOpen(false);
          setEditingItemId(null);
        }}
      />
   {/* Add this after CreateLessonModal, inside the return's fragment */}
{isLockModalOpen && activeContentId && (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
    {/* Backdrop with Blur */}
    <div 
      className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
      onClick={() => setIsLockModalOpen(false)} 
    />
    
    {/* The Modern Geometric Modal */}
    <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
      
      {/* 1. Main Background Shape with Cut Corners (Clip Path) */}
      <div 
        className="relative bg-background p-8 sm:p-10 shadow-2xl"
        style={{
          // This creates the "Not a square" look by cutting the top-right and bottom-left corners
          clipPath: 'polygon(0 0, 90% 0, 100% 10%, 100% 100%, 10% 100%, 0 90%)'
        }}
      >
        
        {/* 2. The "Bracket" Design Elements (Like the image) */}
        {/* Top-Left Heavy Bracket */}
        <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none">
          <div className="absolute top-4 left-4 w-full h-full border-t-[12px] border-l-[12px] border-foreground/90" />
        </div>

        {/* Bottom-Right Heavy Bracket */}
        <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none">
          <div className="absolute bottom-4 right-4 w-full h-full border-b-[12px] border-r-[12px] border-foreground/90" />
        </div>

        {/* 3. Decorative "Tech" lines (Optional, adds detail) */}
        <div className="absolute top-4 right-12 w-12 h-1 bg-foreground/20" />
        <div className="absolute bottom-4 left-12 w-12 h-1 bg-foreground/20" />

        {/* 4. Content Wrapper */}
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

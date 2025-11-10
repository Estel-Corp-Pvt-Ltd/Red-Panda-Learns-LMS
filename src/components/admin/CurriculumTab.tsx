import {
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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
  Edit2,
  Eye,
  FolderOpen,
  GripVertical,
  NotebookPen,
  NotepadText,
  Plus,
  Save,
  Search,
  Trash2,
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
import { CreateLessonModal } from "@/components/admin/AddLesson";
import type { Lesson } from "@/types/lesson";
import type { Assignment } from "@/types/assignment";
import { LearningUnit } from "@/types/general";
import { Topic } from "@/types/course";
import { useEffect, useState } from "react";

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
};

const SortableItem = ({ id, children, depth }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${depth * 2}rem`,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center gap-3 p-3 rounded-md border bg-card hover:shadow-sm transition-shadow group">
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
  title: string;
  courseId: string | undefined;
  curriculum: DraggableItem[];
  setCurriculum: React.Dispatch<React.SetStateAction<DraggableItem[]>>;
  toast: (opts: any) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  saveCurriculumStructure: () => Promise<void>;
  addItem: () => void; // only adds a topic now
  addLessonToParent: (parentId: string) => void;
  deleteItem: (id: string, item?: DraggableItem) => void;
  updateItemName: (id: string, name: string) => void;
  isLessonSelectorModalOpen: boolean;
  setIsLessonSelectorModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCreateLessonOpen: boolean;
  setIsCreateLessonOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAssignmentModelOpen: boolean;
  setIsAssignmentModelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLessonEditModelOpen: boolean;
  setIsLessonEditModelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeParentId: string | null;
  setActiveParentId: React.Dispatch<React.SetStateAction<string | null>>;
  editingItemId: string | null;
  setEditingItemId: React.Dispatch<React.SetStateAction<string | null>>;
  newItemName: string;
  setNewItemName: React.Dispatch<React.SetStateAction<string>>;
  addLessonsToParent: (lessons: Lesson[]) => void;
  handleAssignment: (assignment: Assignment) => void;
  firstLessonId: string | null;
};



// ─── Component ─────────────────────────────────────────────
const CurriculumTab = ({
  title,
  courseId,
  curriculum,
  setCurriculum,
  toast,
  handleDragEnd,
  saveCurriculumStructure,
  addItem,
  addLessonToParent,
  deleteItem,
  updateItemName,
  isLessonSelectorModalOpen,
  setIsLessonSelectorModalOpen,
  isCreateLessonOpen,
  setIsCreateLessonOpen,
  isAssignmentModelOpen,
  setIsAssignmentModelOpen,
  isLessonEditModelOpen,
  setIsLessonEditModelOpen,
  activeParentId,
  setActiveParentId,
  editingItemId,
  setEditingItemId,
  newItemName,
  setNewItemName,
  addLessonsToParent,
  handleAssignment,
  firstLessonId,
}: CurriculumTabProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [isAssignmentEditModalOpen, setIsAssignmentEditModalOpen] = useState(false);


  return (
    <>
      <Card className="shadow-lg border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            {title} – Curriculum
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            {/* Add Topic Button */}
            <Button
              size="sm"
              onClick={addItem}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Topic
            </Button>

            {/* Save */}
            <Button
              size="sm"
              onClick={saveCurriculumStructure}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" /> Save
            </Button>

            {/* Preview */}
            <Link
              to={`/courses/${courseId}/lesson/${firstLessonId}`}
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
          >
            <SortableContext
              items={curriculum.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {curriculum.map((item) => (
                  <SortableItem
                    key={String(item.id)}
                    id={String(item.id)}
                    type={item.type}
                    depth={item.depth}
                  >
                    <div className="flex items-center justify-between w-full group">
                      {/* ───── Left: icon + title ───────────── */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {item.type === LEARNING_UNIT.TOPIC && (
                          <FolderOpen className="h-6 w-6 text-primary" />
                        )}
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
                              onBlur={() =>
                                updateItemName(item.id, newItemName)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  updateItemName(item.id, newItemName);
                              }}
                              className="flex-1 min-w-0"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="flex-1 truncate cursor-pointer hover:underline"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setNewItemName(item.title);
                              }}
                            >
                              {item.title}
                            </span>
                          )
                        ) : item.type === LEARNING_UNIT.LESSON ? (
                          <Link
                            to={`/course/${courseId}/lesson/${item.id}`}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addLessonToParent(item.id)}
                              className="opacity-0 group-hover:opacity-100"
                              title="Import Lesson"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
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
                            {/* Delete Topic */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteItem(item.id)}
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
                                  } else if (
                                    item.type === LEARNING_UNIT.ASSIGNMENT
                                  ) {
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
                                onClick={() => deleteItem(item.id, item)}
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
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* ───── Modals ───────────────────────────────────────────── */}
      <LessonImportModal
        courseId={courseId}
        isOpen={isLessonSelectorModalOpen}
        onClose={() => setIsLessonSelectorModalOpen(false)}
        onConfirm={addLessonsToParent}
      />

      <EditLessonModal
        courseId={courseId}
        lessonId={editingItemId}
        isOpen={isLessonEditModelOpen}
        onClose={() => {
          setIsLessonEditModelOpen(false);
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
        }}
      />

      {isAssignmentModelOpen && (
        <AssignmentModal
          onCancel={() => {
            setIsAssignmentModelOpen(false);
            setEditingItemId(null);
            setActiveParentId(null);
          }}
          onSave={handleAssignment}
        />
      )}

      <EditAssignmentModal
        assignmentId={editingItemId}
        isOpen={isAssignmentEditModalOpen}
        onClose={() => setIsAssignmentEditModalOpen(false)}
        onUpdated={(updatedAssignment) => {
          // ✅ Update the curriculum list immediately
          setCurriculum((prev) =>
            prev.map((item) => {
              if (
                item.id === updatedAssignment.id &&
                item.type === LEARNING_UNIT.ASSIGNMENT
              ) {
                return {
                  ...item,
                  title: updatedAssignment.title,
                } as DraggableItem;
              }
              return item;
            })
          );
        }}
      />

      <CreateLessonModal
        courseId={courseId}
        isOpen={isCreateLessonOpen}
        onClose={() => setIsCreateLessonOpen(false)}
        onLessonCreated={(lesson) => {
          // ✅ Ensure refId is set
          addLessonsToParent([lesson]);
        }}
      />
    </>
  );
};



export default CurriculumTab;

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
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  ChevronRight,
  Edit2,
  Eye,
  GripVertical,
  Plus,
  Save,
  Search,
  Trash2,
  Heading,
  Package,
  RefreshCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Course } from "@/types/course";
import { useEffect, useMemo, useState } from "react";
import { courseService } from "@/services/courseService";
import { useToast } from "@/hooks/use-toast";
import { useLoadingOverlay } from "@/contexts/LoadingOverlayContext";
import { arrayMove } from "@dnd-kit/sortable";
import { ImportCourseModal } from "@/components/course/ImportCourseModel";
import { ImportBundleModal } from "@/components/bundle/ImportBundleModel";
import { Bundle } from "@/types/bundle";
import { courseArrangementService } from "@/services/courseArrangementService";
import AdminLayout from "@/components/AdminLayout";
import { CoursePageHeading } from "@/types/courseArrangement";

// ─── Types ─────────────────────────────────────────────
type DraggableItemType = "HEADING" | "COURSE" | "BUNDLE";
type CoursePageContentType = "COURSE" | "BUNDLE";

interface DraggableItem {
  id: string;
  title: string;
  type: DraggableItemType;
  depth: number;
  parentId: string | null;
  originalData?: CoursePageHeading;
  refId?: string;
  itemType?: CoursePageContentType;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  type: DraggableItemType;
  depth: number;
  onToggle?: (id: string, isExpanded: boolean) => void;
}

// ─── Sortable Item Component ───────────────────────────
const SortableItem = ({ id, children, type, depth, onToggle }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const [isExpanded, setIsExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${depth * 2}rem`,
  };

  const handleToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (onToggle) {
      onToggle(id, newExpandedState);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center gap-3 p-3 rounded-md border bg-card hover:shadow-sm transition-shadow group">
        {type === "HEADING" && (
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground cursor-pointer transition-transform ${isExpanded ? "rotate-90" : ""
              }`}
            onClick={handleToggle}
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

// ─── Main Component ────────────────────────────────────
const ArrangeCourses = () => {
  const { toast } = useToast();
  const { showOverlay, hideOverlay } = useLoadingOverlay();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [curriculumItems, setCurriculumItems] = useState<DraggableItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedHeadingIds, setExpandedHeadingIds] = useState<Set<string>>(new Set());
  const [isImportCourseModalOpen, setIsImportCourseModalOpen] = useState(false);
  const [isImportBundleModalOpen, setIsImportBundleModalOpen] = useState(false);

  const currentArrangementId = "default_arrangement";

  // ─── Service Operations ──────────────────────────────
  const saveCourseArrangement = async (items: DraggableItem[]) => {
    try {
      showOverlay("Saving Course Arrangement...");

      const headings = convertToCoursePageHeadings(items);

      const result = await courseArrangementService.saveCourseArrangement(
        currentArrangementId,
        headings
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Course arrangement saved successfully!"
        });
      } else {
        // throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error saving arrangement:", error);
      toast({
        title: "Error",
        description: `Failed to save arrangement: ${error}`,
        variant: "destructive",
      });
    } finally {
      hideOverlay();
    }
  };

  const loadCourseArrangement = async (arrangementId: string = currentArrangementId) => {
    try {
      showOverlay("Loading Course Arrangement...");

      const result = await courseArrangementService.loadCourseArrangement(arrangementId);

      if (result.success) {
        const flatItems = convertToFlatStructure(result.data.headings);
        setCurriculumItems(flatItems);
        toast({
          title: "Success",
          description: "Course arrangement loaded successfully!"
        });
      } else {
        toast({
          title: "Info",
          description: "No saved arrangement found. Starting with empty structure.",
        });
        setCurriculumItems([]);
      }
    } catch (error) {
      console.error("Error loading arrangement:", error);
      toast({
        title: "Error",
        description: `Failed to load arrangement: ${error}`,
        variant: "destructive",
      });
    } finally {
      hideOverlay();
    }
  };

  // ─── Structure Conversion Functions ──────────────────
  const convertToCoursePageHeadings = (flatItems: DraggableItem[]): CoursePageHeading[] => {
    const headings: CoursePageHeading[] = [];
    const childrenMap = new Map<string, DraggableItem[]>();

    // Group children by parent ID
    flatItems.forEach((item) => {
      if (item.parentId) {
        if (!childrenMap.has(item.parentId)) {
          childrenMap.set(item.parentId, []);
        }
        childrenMap.get(item.parentId)!.push(item);
      }
    });

    // Create heading structure
    flatItems.forEach((item) => {
      if (!item.parentId && item.type === "HEADING") {
        const childItems = (childrenMap.get(item.id) || [])
          .filter((child) => child.itemType === "COURSE" || child.itemType === "BUNDLE")
          .map((childItem) => ({
            type: childItem.itemType as CoursePageContentType,
            refId: childItem.refId ?? childItem.id,
            title: childItem.title,
          }));

        headings.push({
          id: item.id,
          title: item.title,
          items: childItems,
        });
      }
    });

    return headings;
  };

  const convertToFlatStructure = (headings: CoursePageHeading[]): DraggableItem[] => {
    const flatList: DraggableItem[] = [];

    headings.forEach((heading) => {
      flatList.push({
        id: heading.id,
        title: heading.title,
        type: "HEADING",
        depth: 0,
        parentId: null,
        originalData: heading,
      });

      heading.items.forEach((item) => {
        flatList.push({
          id: `${item.type}_${item.refId}`,
          refId: item.refId,
          title: item.title || `Imported ${item.type}`,
          type: item.type as DraggableItemType,
          itemType: item.type,
          depth: 1,
          parentId: heading.id,
        });
      });
    });

    return flatList;
  };

  // ─── Drag Handlers ───────────────────────────────────
  const handleDragMove = (event: DragMoveEvent) => {
    const { active } = event;
    setIsDragging(true);
    setActiveDragId(String(active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setCurriculumItems((prev) => {
      const updatedItems = handleItemReorder(prev, activeId, overId);

      // Auto-save after reorder
      if (JSON.stringify(prev) !== JSON.stringify(updatedItems)) {
        queueMicrotask(() => saveCourseArrangement(updatedItems));
      }

      return updatedItems;
    });
  };

  const handleItemReorder = (
    items: DraggableItem[],
    activeId: string,
    overId: string
  ): DraggableItem[] => {
    const list = [...items];
    const activeIndex = list.findIndex((i) => i.id === activeId);
    const overIndex = list.findIndex((i) => i.id === overId);

    if (activeIndex === -1 || overIndex === -1) return items;

    const activeItem = list[activeIndex];
    const overItem = list[overIndex];

    // Handle heading drag (move with children)
    if (activeItem.type === "HEADING") {
      return handleHeadingDrag(list, activeIndex, overIndex, activeItem);
    }

    // Handle content item drag (course/bundle)
    if (activeItem.itemType === "COURSE" || activeItem.itemType === "BUNDLE") {
      return handleContentItemDrag(list, activeIndex, overIndex, activeItem, overItem);
    }

    return items;
  };

  const handleHeadingDrag = (
    list: DraggableItem[],
    activeIndex: number,
    overIndex: number,
    activeItem: DraggableItem
  ): DraggableItem[] => {
    const headingChildren = list.filter((item) => item.parentId === activeItem.id);
    const itemsToMove = [activeItem, ...headingChildren];

    const filteredList = list.filter((item) => !itemsToMove.includes(item));
    let newIndex = overIndex;

    // Adjust insertion point
    if (list[overIndex].itemType) {
      const overParentIndex = list.findIndex((i) => i.id === list[overIndex].parentId);
      if (overParentIndex !== -1) {
        newIndex = overParentIndex;
      }
    }

    const newList = [
      ...filteredList.slice(0, newIndex),
      ...itemsToMove,
      ...filteredList.slice(newIndex),
    ];

    return newList.map((item) => {
      if (item.id === activeItem.id) {
        return { ...item, parentId: null, depth: 0 };
      }
      if (item.parentId === activeItem.id) {
        return { ...item, depth: 1 };
      }
      return item;
    });
  };

  const handleContentItemDrag = (
    list: DraggableItem[],
    activeIndex: number,
    overIndex: number,
    activeItem: DraggableItem,
    overItem: DraggableItem
  ): DraggableItem[] => {
    let newParentId: string | null = null;

    if (overItem.type === "HEADING") {
      newParentId = overItem.id;
    } else if (overItem.itemType) {
      newParentId = overItem.parentId;
    }

    if (!newParentId || newParentId === activeItem.id) return list;

    let reordered = arrayMove(list, activeIndex, overIndex);

    reordered = reordered.map((item) =>
      item.id === activeItem.id ? { ...item, parentId: newParentId, depth: 1 } : item
    );

    // Validate structure
    const firstHeadingIndex = reordered.findIndex((item) => item.type === "HEADING");
    if (firstHeadingIndex === -1) return list;

    // Ensure content items don't come before first heading
    for (let i = 0; i < firstHeadingIndex; i++) {
      if (reordered[i].itemType) {
        return list;
      }
    }

    return reordered;
  };

  // ─── Item Management Functions ───────────────────────
  const addNewHeading = () => {
    const newHeading: DraggableItem = {
      id: `heading_${Date.now()}`,
      title: "New Heading",
      type: "HEADING",
      depth: 0,
      parentId: null,
    };

    setCurriculumItems((prev) => [...prev, newHeading]);
  };

  const updateItemTitle = (itemId: string, newTitle: string) => {
    setCurriculumItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, title: newTitle } : item))
    );
    setEditingItemId(null);
  };

  const deleteCurriculumItem = (itemId: string) => {
    setCurriculumItems((prev) => {
      const updatedItems = prev.filter((item) => item.id !== itemId);
      // Also remove any children of deleted heading
      return updatedItems.filter((item) => item.parentId !== itemId);
    });
  };

  // ─── Import Handlers ─────────────────────────────────
  const handleImportCourses = (courses: Course[]) => {
    const parentIndex = curriculumItems.findIndex((item) => item.id === activeParentId);
    if (parentIndex === -1) return;

    const parentDepth = curriculumItems[parentIndex].depth;
    const insertIndex = findInsertIndex(parentIndex, parentDepth);

    const newCourseItems: DraggableItem[] = courses.map((course) => ({
      id: course.id,
      refId: course.id,
      title: course.title,
      type: "COURSE",
      itemType: "COURSE",
      depth: parentDepth + 1,
      parentId: activeParentId,
    }));

    const updatedCurriculum = [...curriculumItems];
    updatedCurriculum.splice(insertIndex, 0, ...newCourseItems);
    setCurriculumItems(updatedCurriculum);
    setIsImportCourseModalOpen(false);
  };

  const handleImportBundles = (bundles: Bundle[]) => {
    const parentIndex = curriculumItems.findIndex((item) => item.id === activeParentId);
    if (parentIndex === -1) return;

    const parentDepth = curriculumItems[parentIndex].depth;
    const insertIndex = findInsertIndex(parentIndex, parentDepth);

    const newBundleItems: DraggableItem[] = bundles.map((bundle) => ({
      id: bundle.id,
      refId: bundle.id,
      title: bundle.title,
      type: "BUNDLE",
      itemType: "BUNDLE",
      depth: parentDepth + 1,
      parentId: activeParentId,
    }));

    const updatedCurriculum = [...curriculumItems];
    updatedCurriculum.splice(insertIndex, 0, ...newBundleItems);
    setCurriculumItems(updatedCurriculum);
    setIsImportBundleModalOpen(false);
  };

  const findInsertIndex = (parentIndex: number, parentDepth: number): number => {
    let insertIndex = parentIndex + 1;

    for (let i = parentIndex + 1; i < curriculumItems.length; i++) {
      const item = curriculumItems[i];

      if (item.parentId === activeParentId) {
        insertIndex = i + 1;
      } else if (item.depth <= parentDepth || item.type === "HEADING") {
        break;
      }
    }

    return insertIndex;
  };

  // ─── UI Helpers ──────────────────────────────────────
  const shouldShowItem = (item: DraggableItem): boolean => {
    if (item.type === "HEADING") return true;

    const isActiveHeadingExpanded = expandedHeadingIds.has(item.parentId!);
    const isActiveHeadingDragging = activeDragId === item.parentId;

    return isActiveHeadingExpanded || isActiveHeadingDragging;
  };

  const getItemIcon = (item: DraggableItem) => {
    switch (item.type) {
      case "HEADING":
        return <Heading className="h-6 w-6 text-primary" />;
      case "COURSE":
        return <BookOpen className="h-6 w-6 text-red-500" />;
      case "BUNDLE":
        return <Package className="h-6 w-6 text-blue-500" />;
      default:
        return null;
    }
  };

  // ─── Effects ─────────────────────────────────────────
  useEffect(() => {
    loadCourseArrangement();
  }, []);

  return (
    <AdminLayout>
      <Card className="shadow-lg border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            Course Arrangement Manager
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={addNewHeading}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Heading
            </Button>

            <Button
              size="sm"
              onClick={() => saveCourseArrangement(curriculumItems)}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" /> Save Arrangement
            </Button>

            <Button
              size="sm"
              onClick={() => loadCourseArrangement()}
              className="flex items-center gap-1"
              variant="outline"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>

            <Link to="/courses" target="_blank">
              <Button size="sm" className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                Preview
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
              items={curriculumItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {curriculumItems.map((item) =>
                  shouldShowItem(item) ? (
                    <SortableItem
                      key={item.id}
                      id={item.id}
                      type={item.type}
                      depth={item.depth}
                      onToggle={(id, isExpanded) => {
                        setExpandedHeadingIds((prev) => {
                          const newSet = new Set(prev);
                          if (isExpanded) {
                            newSet.add(id);
                          } else {
                            newSet.delete(id);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <div className="flex items-center justify-between w-full group">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getItemIcon(item)}
                          {editingItemId === item.id ? (
                            <Input
                              value={editItemName}
                              onChange={(e) => setEditItemName(e.target.value)}
                              onBlur={() => updateItemTitle(item.id, editItemName)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateItemTitle(item.id, editItemName);
                                }
                                if (e.key === "Escape") {
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
                                if (item.type === "HEADING") {
                                  setEditingItemId(item.id);
                                  setEditItemName(item.title);
                                }
                              }}
                            >
                              {item.title}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {item.type === "HEADING" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActiveParentId(item.id);
                                  setIsImportCourseModalOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Add Courses"
                              >
                                <BookOpen className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActiveParentId(item.id);
                                  setIsImportBundleModalOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Add Bundles"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCurriculumItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                            title={`Delete ${item.type}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </SortableItem>
                  ) : null
                )}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <ImportCourseModal
        isOpen={isImportCourseModalOpen}
        onClose={() => setIsImportCourseModalOpen(false)}
        onImport={handleImportCourses}
      />

      <ImportBundleModal
        isOpen={isImportBundleModalOpen}
        onClose={() => setIsImportBundleModalOpen(false)}
        onImport={handleImportBundles}
      />
    </AdminLayout>
  );
};

export default ArrangeCourses;

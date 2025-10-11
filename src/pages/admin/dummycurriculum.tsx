import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  FolderOpen,
  Edit2,
  Trash2,
  GripVertical,
  Copy,
  Save,
  BookOpen,
  Users,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { courseService } from "@/services/courseService";
import { Course, Topic, Cohort } from "@/types/course";
import { LessonSelectorModal } from "@/components/admin/LessonSelectorModal";
import { Lesson } from "@/types/lesson";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COURSE_STATUS, LEARNING_UNIT } from "@/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { v4 as uuidv4 } from 'uuid';
import { CourseStatus, LearningUnit } from "@/types/general";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authorService } from "@/services/authorService";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { attributeService } from "@/services/attributeService";
import { ATTRIBUTE_TYPE } from "@/constants";
import { AttributeType } from "@/types/general";
// import CourseAttributeSelector from "@/components/admin/CourseAttributeSelector";

// FIX: Define a new type for all draggable items, separating Cohort from LearningUnit
type DraggableItemType = LearningUnit;
import { serverTimestamp } from "firebase/firestore";
import { imageService } from "@/services/imageService";
import { getDownloadURL } from "firebase/storage";
import CohortBuilderPage from "./CreateCohortPage";

type SortableItemProps = {
  id: string;
  children: React.ReactNode;
  type: LearningUnit;
  depth: number;
};

type DraggableItem = {
  id: string;
  title: string;
  type: LearningUnit;
  
  depth: number;
  parentId: string | null;
  originalData?: Cohort | Topic;
};

const SortableItem = ({ id, children, depth }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

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

const DummyCurriculumBuilderPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [curriculum, setCurriculum] = useState<DraggableItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] = useState(false);
  const [isCohortImporterModalOpen, setIsCohortImporterModalOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null); // For adding lessons/topics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CourseStatus>(COURSE_STATUS.DRAFT);
  const [regularPrice, setRegularPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<string[]>([]);
  const [allTargetAudiences, setAllTargetAudiences] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authors, setAuthors] = useState<{ id: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const [categoriesData, targetAudienceData] = await Promise.all([
          attributeService.getAttributes(ATTRIBUTE_TYPE.CATEGORY),
          attributeService.getAttributes(ATTRIBUTE_TYPE.TARGET_AUDIENCE),
        ]);

        setAllCategories(categoriesData.map((a) => a.name));
        setAllTargetAudiences(targetAudienceData.map((a) => a.name));
      } catch (error) {
        console.error("Error fetching attributes:", error);
        toast({
          title: "Error",
          description: "Failed to load categories or target audiences.",
          variant: "destructive",
        });
      }
    };

    fetchAttributes();
  }, [toast]);



  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const courseData = await courseService.getCourseById(courseId);
      if (!courseData) {
        toast({ title: "Error", description: "Course not found.", variant: "destructive" });
        return;
      }
      setCourse(courseData);
      setTitle(courseData.title);
      setDescription(courseData.description);
      setStatus(courseData.status);
      setRegularPrice(courseData.regularPrice);
      setSalePrice(courseData.salePrice);

      setSelectedTargetAudiences(courseData.targetAudienceIds || []);
      setSelectedCategories(courseData.categoryIds || []);
      setThumbnailUrl(courseData.thumbnail || "");
      setAllCategories(courseData.categories || []);
      setTags(courseData.tags || []);
      setAuthorId(courseData.authorId);
      setAuthorName(courseData.authorName);
      setCurriculum(getFlatCurriculum(courseData));
    } catch (error) {
      toast({ title: "Error", description: `Failed to load course data. ${error}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };



  const getFlatCurriculum = (courseData: Course): DraggableItem[] => {
    const flatList: DraggableItem[] = [];
    (courseData.topics || []).forEach(topic => {
      flatList.push({ id: topic.id, title: topic.title, type: LEARNING_UNIT.TOPIC, depth: 0, parentId: null, originalData: topic });
      (topic.items || []).forEach(lesson => {
        flatList.push({ id: lesson.id, title: lesson.title, type: LEARNING_UNIT.LESSON, depth: 1, parentId: topic.id });
      });
    });
    (courseData.cohorts || []).forEach(cohort => {
      flatList.push({ id: cohort.id, title: cohort.title, type: LEARNING_UNIT.COHORT, depth: 0, parentId: null, originalData: cohort });
      (cohort.topics || []).forEach(topic => {
        flatList.push({ id: topic.id, title: topic.title, type: LEARNING_UNIT.TOPIC, depth: 1, parentId: cohort.id });
        (topic.items || []).forEach(lesson => {
          flatList.push({ id: lesson.id, title: lesson.title, type: LEARNING_UNIT.LESSON, depth: 2, parentId: topic.id });
        });
      });
    });
    return flatList;
  };


  const duplicateCohort = (cohortId: string) => {
  setCurriculum(prev => {
    const newList = [...prev];

    const originalCohort = newList.find(i => i.id === cohortId);
    if (!originalCohort || originalCohort.type !== LEARNING_UNIT.COHORT) return prev;

    const newCohortId = `cohort_${Date.now()}`;
    const newCohortTitle = `${originalCohort.title} -- Copy`;

    const newCohort: DraggableItem = {
      id: newCohortId,
      title: newCohortTitle,
      type: LEARNING_UNIT.COHORT,
      depth: 0,
      parentId: null,
    };

    // Get topics inside the original cohort
    const topics = newList.filter(i => i.parentId === cohortId && i.type === LEARNING_UNIT.TOPIC);

    const duplicatedTopics: DraggableItem[] = [];
    const duplicatedLessons: DraggableItem[] = [];

    topics.forEach(topic => {
      const newTopicId = `topic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const newTopic: DraggableItem = {
        id: newTopicId,
        title: topic.title,
        type: LEARNING_UNIT.TOPIC,
        depth: 1,
        parentId: newCohortId,
      };
      duplicatedTopics.push(newTopic);

      const lessons = newList.filter(i => i.parentId === topic.id && i.type === LEARNING_UNIT.LESSON);
      lessons.forEach(lesson => {
        duplicatedLessons.push({
          ...lesson,
          id: `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          parentId: newTopicId,
          depth: 2,
        });
      });
    });

    return [...newList, newCohort, ...duplicatedTopics, ...duplicatedLessons];
  });
};

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  setCurriculum(prev => {
    let list = [...prev];

    const isCohort = (i: typeof list[number]) => i.type === LEARNING_UNIT.COHORT;
    const isTopic  = (i: typeof list[number]) => i.type === LEARNING_UNIT.TOPIC;
    const isLesson = (i: typeof list[number]) => i.type === LEARNING_UNIT.LESSON;

    const idxActive = list.findIndex(i => i.id === active.id);
    const idxOver   = list.findIndex(i => i.id === over.id);
    if (idxActive === -1 || idxOver === -1) return prev;

    const itemMap = new Map(list.map(i => [i.id, i] as const));

    const getCohortIdFor = (item: typeof list[number]): string | null => {
      if (isCohort(item)) return item.id;
      if (isTopic(item)) return item.parentId ?? null;
      if (isLesson(item)) {
        const topic = item.parentId ? itemMap.get(item.parentId) : undefined;
        return topic && isTopic(topic) ? (topic.parentId ?? null) : null;
      }
      return null;
    };

    // Reparent only when the drop pairing is valid
    const activeItem = { ...list[idxActive] };
    const overItem   = list[idxOver];

    const computeNewParentId = (): string | null | undefined => {
      // undefined => keep current parent
      if (isCohort(activeItem)) return null; // cohorts are always top-level (parentId = null)

      if (isTopic(activeItem)) {
        if (isCohort(overItem)) return overItem.id;                  // Topic into that cohort
        if (isTopic(overItem))  return overItem.parentId ?? null;    // Topic among topics of same cohort
        if (isLesson(overItem)) return getCohortIdFor(overItem);     // Topic near a lesson => adopt that lesson's cohort
        return undefined;
      }

      if (isLesson(activeItem)) {
        if (isTopic(overItem))  return overItem.id;                  // Lesson into that topic
        if (isLesson(overItem)) return overItem.parentId ?? null;    // Lesson among lessons of same topic
        if (isCohort(overItem)) return undefined;                    // Don't reparent off a cohort
        return undefined;
      }

      return undefined;
    };

    const maybeNewParent = computeNewParentId();
    if (maybeNewParent !== undefined) {
      activeItem.parentId = maybeNewParent;
    }
    list[idxActive] = activeItem;

    // Move active to the 'over' index
    list = arrayMove(list, idxActive, idxOver);

    // Enforce relaxed “level gating” (minimal movement):
    // 1) Ensure at least one cohort exists above the first topic (if both exist).
    // 2) Ensure at least one topic exists above the first lesson (if both exist).
    const ensureLevelGating = (arr: typeof list) => {
      let out = arr;
      // Iterate a few times to resolve interdependencies (e.g., moving topic before lesson may require moving cohort before topic)
      for (let pass = 0; pass < 4; pass++) {
        let changed = false;

        const cIdx = out.findIndex(isCohort);
        const tIdx = out.findIndex(isTopic);
        const lIdx = out.findIndex(isLesson);

        if (cIdx !== -1 && tIdx !== -1 && tIdx < cIdx) {
          // Move earliest cohort to just before the earliest topic
          out = arrayMove(out, cIdx, tIdx);
          changed = true;
        }

        // Recompute after potential move
        const tIdx2 = out.findIndex(isTopic);
        const lIdx2 = out.findIndex(isLesson);

        if (tIdx2 !== -1 && lIdx2 !== -1 && lIdx2 < tIdx2) {
          // Move earliest topic to just before the earliest lesson
          out = arrayMove(out, tIdx2, lIdx2);
          changed = true;
        }

        if (!changed) break;
      }
      return out;
    };

    list = ensureLevelGating(list);

    // Recompute depth from actual parent chain (order-independent)
    const finalMap = new Map(list.map(i => [i.id, i] as const));
    const depthMemo = new Map<string, number>();

    const depthOf = (item: typeof list[number]): number => {
      if (depthMemo.has(item.id)) return depthMemo.get(item.id)!;

      let d = 0;
      if (isCohort(item)) {
        d = 0;
      } else if (isTopic(item)) {
        const parent = item.parentId ? finalMap.get(item.parentId) : undefined;
        d = parent && isCohort(parent) ? depthOf(parent) + 1 : 1; // fallback to level 1
      } else if (isLesson(item)) {
        const parent = item.parentId ? finalMap.get(item.parentId) : undefined;
        d = parent && isTopic(parent) ? depthOf(parent) + 1 : 2; // fallback to level 2
      }
      depthMemo.set(item.id, d);
      return d;
    };

    return list.map(i => ({ ...i, depth: depthOf(i) }));
  });
};

  const addItem = (type: LearningUnit, parentId: string | null = null, depth = 0) => {
    const newItem: DraggableItem = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      title: `New ${type} `,
      type,
      depth,
      parentId,
    };
    setCurriculum(prev => [...prev, newItem]);
    setEditingItemId(newItem.id);
    setNewItemName(newItem.title);
  };

  const addLessonToParent = (parentId: string) => {
    setActiveParentId(parentId);
    setIsLessonSelectorModalOpen(true);
  };

const addTopicToCohort = (cohortId: string, depth: number) => {
  const newTopic = {
    id: `TOPIC_${Date.now()}`,
    title: "New Topic",
    type: LEARNING_UNIT.TOPIC,
    depth: depth + 1,
    parentId: cohortId,
  };

  setCurriculum((prev) => {
    const cohortIndex = prev.findIndex((i) => i.id === cohortId);

    // Find index after the last child of the cohort
    let insertIndex = cohortIndex + 1;
    for (let i = cohortIndex + 1; i < prev.length; i++) {
      if (prev[i].depth <= depth) break;
      insertIndex = i + 1;
    }

    const newCurriculum = [...prev];
    newCurriculum.splice(insertIndex, 0, newTopic);
    return newCurriculum;
  });
};
  // utils ---------------------------------------------------------------
  const flattenCohort = (
    cohort: Cohort,
    cohortDepth = 0
  ): DraggableItem[] => {
    const rows: DraggableItem[] = [
      {
        id: cohort.id,
        title: cohort.title,
        type: LEARNING_UNIT.COHORT,
        depth: cohortDepth,
        parentId: null,
        originalData: cohort,
      },
    ];

    cohort.topics.forEach((topic) => {
      rows.push({
        id: topic.id,
        title: topic.title,
        type: LEARNING_UNIT.TOPIC,
        depth: cohortDepth + 1,
        parentId: cohort.id,
      });

      topic.items.forEach((lesson) => {
        rows.push({
          id: lesson.id,
          title: lesson.title,
          type: LEARNING_UNIT.LESSON,
          depth: cohortDepth + 2,
          parentId: topic.id,
        });
      });
    });

    return rows;
  };



  const updateItemName = (itemId: string, name: string) => {
    setCurriculum(prev => prev.map(item => (item.id === itemId ? { ...item, title: name } : item)));
    setEditingItemId(null);
  };

  const deleteItem = (itemId: string) => {
    console.log("Deleting item:", itemId);

    setCurriculum(prev => {
      // Find all children and grandchildren recursively to delete them too
      const itemsToDelete = new Set<string>([itemId]);
      const queue = [itemId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = prev.filter(i => i.parentId === currentId);
        for (const child of children) {
          itemsToDelete.add(child.id);
          queue.push(child.id);
        }
      }

      console.log("Items to delete:", Array.from(itemsToDelete));
      const newCurriculum = prev.filter(i => !itemsToDelete.has(i.id));
      console.log("New curriculum length:", newCurriculum.length);
      return newCurriculum;
    });
  };

  // FIX: Complete rewrite of the save function to be robust and correct.
  // FIX: Complete rewrite of the save function to be robust and correct.
  const saveCurriculumStructure = async () => {
    if (!courseId || !course) {
      toast({ title: "Error", description: "Course data is not available.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      const newRootTopics: Topic[] = [];
      const newCohorts: Cohort[] = [];

      // Create maps for efficient lookup
      const itemMap = new Map(curriculum.map(item => [item.id, item]));
      const childrenMap = new Map<string, DraggableItem[]>();
      curriculum.forEach(item => {
        if (item.parentId) {
          if (!childrenMap.has(item.parentId)) {
            childrenMap.set(item.parentId, []);
          }
          childrenMap.get(item.parentId)!.push(item);
        }
      });
      
      // Process only root items (depth 0)
      for (const item of curriculum) {
        if (item.depth === 0) {
            if (item.type === 'COHORT') {
                const cohortChildren = childrenMap.get(item.id) || []; // These are topics
                const cohortTopics: Topic[] = cohortChildren.map(topicItem => {
                    const lessonItems = (childrenMap.get(topicItem.id) || []).map(lessonItem => ({
                        id: lessonItem.id,
                        title: lessonItem.title,
                    }));
                    return { id: topicItem.id, title: topicItem.title, items: lessonItems };
                });
                
                // Reconstruct the cohort, preserving original data if it exists
                const originalCohort = item.originalData as Cohort || {};
                newCohorts.push({
                    ...originalCohort,
                    id: item.id,
                    title: item.title,
                    topics: cohortTopics,
                    price: 0 ,
            
                });

            } else if (item.type === LEARNING_UNIT.TOPIC) {
                const lessonItems = (childrenMap.get(item.id) || []).map(lessonItem => ({
                    id: lessonItem.id,
                    title: lessonItem.title,
                }));
                newRootTopics.push({ id: item.id, title: item.title, items: lessonItems });
            }
        }
      }
      
      const updates: Partial<Course> = {
        topics: newRootTopics,
        cohorts: newCohorts,
      };

      await courseService.updateCourse(courseId, updates);

      toast({ title: "Success", description: "Curriculum saved!" });
      console.log("Curriculum saved with:", updates);
      
    } catch (error) {
      toast({ title: "Error", description: `Failed to save: ${error}`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!course) return <div>Course not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Header is fine */}

      <main className="container mx-auto px-6 py-8">

        <Tabs defaultValue="curriculum" className="w-full">

          {/* Tab buttons ----------------------------------------------------- */}
          <TabsList>
   
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
        
          </TabsList>

        

          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <Card className="shadow-lg border">
              {/* ---- Header ------------------------------------------------ */}
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Course Curriculum & Cohorts
                </CardTitle>

                <div className="flex flex-wrap gap-2">
                 <CohortBuilderPage onCohortCreated={(cohort) => {
  // Add new cohort row at root level in curriculum
  const newItem = {
    id: cohort.id,
    title: cohort.title,
    type: LEARNING_UNIT.COHORT,
    depth: 0,
    parentId: null,
    originalData: cohort,
  };
  setCurriculum(prev => [...prev, newItem]);

  toast({
    title: "Cohort Added",
    description: `“${cohort.title}” has been added to this course.`,
  });
}} />
           

                 <Button
  size="sm"
  onClick={() => {
    const existingCohort = curriculum.find(item => item.type === LEARNING_UNIT.COHORT);
    if (existingCohort) {
      addTopicToCohort(existingCohort.id, existingCohort.depth); // depth will likely be 0
    } else {
      addItem(LEARNING_UNIT.TOPIC);
    }
  }}
  className="flex items-center gap-1"
>
  Add Topic
</Button>


                  <Button
                    size="sm"
                    onClick={saveCurriculumStructure}
                    disabled={saving}
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardHeader>

              {/* ---- Body -------------------------------------------------- */}
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
                          key={item.id}
                          id={item.id}
                          type={item.type}
                          depth={item.depth}
                        >
                          <div className="flex items-center justify-between w-full group">
                            {/* ---- Icon + Title -------------------------------- */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Icon */}
                              {item.type === LEARNING_UNIT.TOPIC && (
                                <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                              {item.type === LEARNING_UNIT.LESSON && (
                                <BookOpen className="h-4 w-4 text-red-500 flex-shrink-0" />
                              )}
                              {item.type === LEARNING_UNIT.COHORT && (
                                <Users className="h-5 w-5 text-green-600 flex-shrink-0" />
                              )}

                              {/* Title – inline edit */}
                              {editingItemId === item.id ? (
                                <Input
                                  value={newItemName}
                                  onChange={(e) => setNewItemName(e.target.value)}
                                  onBlur={() => {
                                    updateItemName(item.id, newItemName);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateItemName(item.id, newItemName);
                                    }
                                  }}
                                  className="flex-1 min-w-0"
                                  autoFocus
                                />
                              ) : (
                                <span className="flex-1 truncate cursor-pointer hover:underline">
                                  {item.title} -- {item.id}
                                </span>
                              )}
                            </div>

                            {/* ---- Action Buttons ----------------------------- */}
                            {/* ---- Action Buttons ----------------------------- */}
                            <div className="flex items-center gap-1">
                              {/* Cohort actions */}
                              {item.type === LEARNING_UNIT.COHORT && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addTopicToCohort(item.id, item.depth)} 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={`Add Topic to Cohort${item.id} ${item.depth} ${item.parentId}`} 
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>

                                <Button
  variant="ghost"
  size="sm"
  onClick={() => duplicateCohort(item.id)}
  className="opacity-0 group-hover:opacity-100 transition-opacity"
  title="Duplicate Cohort"
>
  <Copy className="h-4 w-4 text-blue-500" />
</Button>


                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setNewItemName(item.title);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Rename Cohort"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                    title="Delete Cohort"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* Topic actions */}
                              {item.type === LEARNING_UNIT.TOPIC && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addLessonToParent(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Add Lesson"
                                  >
                                    <Plus className="h-4 w-4" />
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
                                    onClick={() => deleteItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                    title="Delete Topic"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* Lesson actions */}
                              {item.type === LEARNING_UNIT.LESSON && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setNewItemName(item.title);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Rename Lesson"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                    title="Delete Lesson"
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
          </TabsContent>
        </Tabs>
      </main>

      {/* Cohort Importer */}
     

      {/* Lesson Selector */}
     <LessonSelectorModal
  isOpen={isLessonSelectorModalOpen}
  onClose={() => setIsLessonSelectorModalOpen(false)}
  onConfirm={(lessons: Lesson[]) => {
    if (!activeParentId) return;

    const parentIndex = curriculum.findIndex(i => i.id === activeParentId);
    const parentDepth = curriculum[parentIndex]?.depth || 0;

    const newItems = lessons.map(lesson => ({
      id: `Lesson ` +  uuidv4(), 
      title: lesson.title,
      type: LEARNING_UNIT.LESSON,
      depth: parentDepth + 1,
      parentId: activeParentId,
    }));

    setCurriculum(prev => {
      let insertIndex = parentIndex + 1;
      for (let i = parentIndex + 1; i < prev.length; i++) {
        if (prev[i].depth <= parentDepth) break;
        insertIndex = i + 1;
      }

      const updated = [...prev];
      updated.splice(insertIndex, 0, ...newItems);
      return updated;
    });

    setIsLessonSelectorModalOpen(false);
  }}
  excludedLessonIds={[]} // you can remove this filter if needed
/>

    </div>
  );
};

export default DummyCurriculumBuilderPage;

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  NotepadText,
  NotebookPen,
  Search,
  Eye,
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
import { Course, Topic, Cohort, TopicItem } from "@/types/course";
import { LessonSelectorModal } from "@/components/admin/LessonSelectorModal";
import { LearningContentType, Lesson } from "@/types/lesson";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COURSE_STATUS, LEARNING_UNIT } from "@/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { CourseStatus, LearningUnit } from "@/types/general";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { instructorService } from "@/services/instructorService";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { attributeService } from "@/services/attributeService";
import { ATTRIBUTE_TYPE } from "@/constants";

// import CourseAttributeSelector from "@/components/admin/CourseAttributeSelector";

// FIX: Define a new type for all draggable items, separating Cohort from LearningUnit
import { fileService } from "@/services/fileService";
import { getDownloadURL } from "firebase/storage";
import CohortBuilderPage from "./CreateCohortPage";
import { useLoadingOverlay } from "@/contexts/LoadingOverlayContext";
import { CreateLessonModal } from "@/components/admin/AddLesson";
import { getFullName } from "@/utils/name";
import { Assignment } from "@/types/assignment";
import { logError } from "@/utils/logger";
import AssignmentModal from "@/components/AssignmentModal";

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
  refId?: string; // real id for lessons, assignments
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

const CurriculumBuilderPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showOverlay, hideOverlay } = useLoadingOverlay();

  const [course, setCourse] = useState<Course | null>(null);
  const [curriculum, setCurriculum] = useState<DraggableItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] =
    useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null); // For adding lessons/topics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CourseStatus>(COURSE_STATUS.DRAFT);
  const [regularPrice, setRegularPrice] = useState(0);
  const [duration, setDuration] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<
    string[]
  >([]);
  const [allTargetAudiences, setAllTargetAudiences] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [isAssignmentModelOpen, setIsAssignmentModelOpen] = useState(false);
  const [isTopicItemAdded, setIsTopicItemAdded] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const categoriesData = await attributeService.getAttributes(
          ATTRIBUTE_TYPE.CATEGORY
        );
        setAllCategories(categoriesData.map((a) => a.name));
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to load categories.",
          variant: "destructive",
        });
      }

      try {
        const targetAudienceData = await attributeService.getAttributes(
          ATTRIBUTE_TYPE.TARGET_AUDIENCE
        );
        setAllTargetAudiences(targetAudienceData.map((a) => a.name));
      } catch (error) {
        console.error("Error fetching target audiences:", error);
        toast({
          title: "Error",
          description: "Failed to load target audiences.",
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
        toast({
          title: "Error",
          description: "Course not found.",
          variant: "destructive",
        });
        return;
      }
      setCourse(courseData);
      setTitle(courseData.title);
      setDescription(courseData.description);
      setStatus(courseData.status);
      setDuration(courseData.duration);
      setRegularPrice(courseData.regularPrice);
      setSalePrice(courseData.salePrice);

      setSelectedTargetAudiences(courseData.targetAudienceIds || []);
      setSelectedCategories(courseData.categoryIds || []);
      setThumbnailUrl(courseData.thumbnail || "");
      // setAllCategories(courseData.categories || []);
      setTags(courseData.tags || []);
      setInstructorId(courseData.instructorName);
      setInstructorName(courseData.instructorName);
      setCurriculum(getFlatCurriculum(courseData));
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load course data. ${error}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // auto-save when curriculum changes
  useEffect(() => {
    if (isTopicItemAdded && curriculum.length > 0 && courseId) {
      // Debounce auto-save to avoid too many requests
      const timeoutId = setTimeout(() => {
        saveCurriculumStructure();
      }, 1000);
      setIsTopicItemAdded(false);

      return () => clearTimeout(timeoutId);
    }
  }, [curriculum]); // This will run whenever curriculum changes

  useEffect(() => {
    const fetchInstructors = async () => {
      const result = await instructorService.getAllInstructors();

      if (result.success) {
        const formattedInstructors = result
          .data
          .map((instructor) => ({
            id: instructor.id,
            name: getFullName(instructor.firstName, instructor.middleName, instructor.lastName)
          }));

        setInstructors(formattedInstructors);

      } else {
        console.error("Failed to fetch instructors:", result.error);
        toast({
          title: "Error",
          description: "Could not load instructors' list.",
          variant: "destructive",
        });
      }
    };

    fetchInstructors();
  }, [toast, instructorId, instructorName]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file!",
        variant: "destructive",
      });
      return;
    }

    setPreview(URL.createObjectURL(file));
    uploadThumbnail(file);
  };

  const uploadThumbnail = async (selectedFile: File) => {
    if (!selectedFile) return;

    // Check file size (3MB limit)
    const MAX_SIZE = 3 * 1024 * 1024; // 3MB in bytes
    if (selectedFile.size > MAX_SIZE) {
      toast({
        title: "File Too Large",
        description: "The selected file exceeds the 3MB size limit.",
        variant: "destructive",
      });
      return;
    }

    const uploadResult = fileService.startResumableUpload(
      `/courses/${courseId}/thumbnail.png`,
      selectedFile
    );
    if (!uploadResult.success) {
      toast({
        title: "Upload Failed",
        description: "Unable to upload the file. Please try again.",
        variant: "destructive",
      });
      return;
    }

    uploadResult.data.on(
      "state_changed",
      (snapshot) => {
        setUploadingThumbnail(true);
        // Calculate progress
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(prog));
      },
      (error) => {
        toast({
          title: "Failed to upload thumbnail.",
          description: "Something went wrong",
          variant: "destructive",
        });
        console.error(error);
        setUploadingThumbnail(false);
      },
      async () => {
        try {
          setProgress(100);
          setUploadingThumbnail(false);
          const url = await getDownloadURL(uploadResult.data.snapshot.ref);
          setThumbnailUrl(url);
          toast({
            title: "Thumbnail Uploaded",
            description: "Thumbnail has been successfully uploaded",
            variant: "default",
          });
        } catch (error) {
          toast({
            title: "Thumbnail not uploaded",
            description: "Something went wrong",
            variant: "destructive",
          });
          logError("Error getting download URL:", error);
        }
      }
    );
  };

  const saveBasics = async () => {
    if (!courseId || !course) return;
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Enter a course title.",
        variant: "destructive",
      });
      return;
    }
    if (!description.trim()) {
      toast({
        title: "Missing Description",
        description: "Enter a description.",
        variant: "destructive",
      });
      return;
    }
    if (regularPrice < 0 || salePrice < 0 || salePrice > regularPrice) {
      toast({
        title: "Pricing Error",
        description: "Check regular / sale price.",
        variant: "destructive",
      });
      return;
    }
    if (duration < 0) {
      toast({
        title: "Invalid Duration",
        description: "Duration must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    try {
      showOverlay("Saving Course Basics");
      await courseService.updateCourse(courseId, {
        title: title.trim(),
        description: description.trim(),
        duration,
        regularPrice,
        thumbnail: thumbnailUrl,
        salePrice,
        targetAudienceIds: selectedTargetAudiences,
        categoryIds: selectedCategories,
        tags,
        instructorId: instructorId,
        instructorName: instructorName,
        status,
      });
      toast({ title: "Saved", description: "Basics updated." });
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      hideOverlay();
    }
  };

  //Todo
  // Notify the system if both cohorts and topics are non-empty simultaneously
  const getFlatCurriculum = (courseData: Course): DraggableItem[] => {
    const flatList: DraggableItem[] = [];

    // Root topics
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
        const isAssignment = item.type === "ASSIGNMENT";
        flatList.push({
          id: item.id,
          refId: item.id, // real item id
          title: item.title,
          type: isAssignment ? LEARNING_UNIT.ASSIGNMENT : LEARNING_UNIT.LESSON,
          depth: 1,
          parentId: topic.id,
        });
      });
    });

    // Cohorts
    (courseData.cohorts || []).forEach((cohort) => {
      flatList.push({
        id: cohort.id,
        title: cohort.title,
        type: LEARNING_UNIT.COHORT,
        depth: 0,
        parentId: null,
        originalData: cohort,
      });

      (cohort.topics || []).forEach((topic) => {
        flatList.push({
          id: topic.id,
          title: topic.title,
          type: LEARNING_UNIT.TOPIC,
          depth: 1,
          parentId: cohort.id,
        });

        (topic.items || []).forEach((item) => {
          const isAssignment = item.type === "ASSIGNMENT";
          flatList.push({
            id: item.id,
            refId: item.id, // real item id
            title: item.title,
            type: isAssignment ? LEARNING_UNIT.ASSIGNMENT : LEARNING_UNIT.LESSON,
            depth: 2,
            parentId: topic.id,
          });
        });
      });
    });

    return flatList;
  };

  const duplicateCohort = (cohortId: string) => {
    setCurriculum((prev) => {
      const newList = [...prev];
      const originalCohort = newList.find((i) => i.id === cohortId);
      if (!originalCohort || originalCohort.type !== LEARNING_UNIT.COHORT)
        return prev;

      const newCohortId = `cohort_${Date.now()}`;
      const newCohortTitle = `${originalCohort.title} -- Copy`;

      const newCohort: DraggableItem = {
        id: newCohortId,
        title: newCohortTitle,
        type: LEARNING_UNIT.COHORT,
        depth: 0,
        parentId: null,
      };

      const topics = newList.filter(
        (i) => i.parentId === cohortId && i.type === LEARNING_UNIT.TOPIC
      );

      const itemsToInsert: DraggableItem[] = [newCohort];

      topics.forEach((topic) => {
        const newTopicId = `topic_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`;
        const newTopic: DraggableItem = {
          id: newTopicId,
          title: topic.title,
          type: LEARNING_UNIT.TOPIC,
          depth: 1,
          parentId: newCohortId,
        };

        itemsToInsert.push(newTopic);

        const lessons = newList.filter(
          (i) => i.parentId === topic.id && i.type === LEARNING_UNIT.LESSON
        );

        lessons.forEach((lesson) => {
          const refId = lesson.refId ?? lesson.id;
          const newLesson: DraggableItem = {
            ...lesson,
            id: refId,
            refId: refId,
            parentId: newTopicId,
            depth: 2,
          };
          itemsToInsert.push(newLesson);
        });
      });

      return [...newList, ...itemsToInsert];
    });
  };


  const excludedLessonIdsForActiveParent = useMemo(() => {
    if (!isLessonSelectorModalOpen || !activeParentId) return [];

    const topic = curriculum.find(
      (i) => i.id === activeParentId && i.type === LEARNING_UNIT.TOPIC
    );
    if (!topic) return [];

    const cohortId = topic.parentId;

    // ------- CASE 1: topic inside a cohort -------
    if (cohortId) {
      const topicIdsInCohort = new Set(
        curriculum
          .filter(
            (i) => i.type === LEARNING_UNIT.TOPIC && i.parentId === cohortId
          )
          .map((i) => i.id)
      );

      const usedLessonIds = new Set<string>();
      curriculum.forEach((i) => {
        if (
          i.type === LEARNING_UNIT.LESSON &&
          i.parentId &&
          topicIdsInCohort.has(i.parentId)
        ) {
          usedLessonIds.add(i.refId ?? i.id);
        }
      });
      return Array.from(usedLessonIds);
    }

    // ------- CASE 2: root topic (no cohort) -------
    // Then exclude *all* lessons used anywhere else in the course
    const usedLessonIds = new Set<string>();
    curriculum.forEach((i) => {
      if (i.type === LEARNING_UNIT.LESSON) {
        usedLessonIds.add(i.refId ?? i.id);
      }
    });
    return Array.from(usedLessonIds);
  }, [isLessonSelectorModalOpen, activeParentId, curriculum]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCurriculum((prev) => {
      let list = [...prev];

      const isCohort = (i: (typeof list)[number]) =>
        i.type === LEARNING_UNIT.COHORT;
      const isTopic = (i: (typeof list)[number]) =>
        i.type === LEARNING_UNIT.TOPIC;
      const isLesson = (i: (typeof list)[number]) =>
        i.type === LEARNING_UNIT.LESSON;
      const isAssignment = (i: (typeof list)[number]) =>
        i.type === LEARNING_UNIT.ASSIGNMENT;

      const idxActive = list.findIndex((i) => i.id === active.id);
      const idxOver = list.findIndex((i) => i.id === over.id);
      if (idxActive === -1 || idxOver === -1) return prev;

      const itemMap = new Map(list.map((i) => [i.id, i] as const));

      const getCohortIdFor = (item: (typeof list)[number]): string | null => {
        if (isCohort(item)) return item.id;
        if (isTopic(item)) return item.parentId ?? null;
        if (isLesson(item) || isAssignment(item)) {
          const topic = item.parentId ? itemMap.get(item.parentId) : undefined;
          return topic && isTopic(topic) ? topic.parentId ?? null : null;
        }
        return null;
      };

      // Reparent only when the drop pairing is valid
      const activeItem = { ...list[idxActive] };
      const overItem = list[idxOver];

      const computeNewParentId = (): string | null | undefined => {
        // undefined => keep current parent
        if (isCohort(activeItem)) return null; // cohorts are always top-level (parentId = null)

        if (isTopic(activeItem)) {
          if (isCohort(overItem)) return overItem.id; // Topic into that cohort
          if (isTopic(overItem)) return overItem.parentId ?? null; // Topic among topics of same cohort
          if (isLesson(overItem) || isAssignment(overItem)) return getCohortIdFor(overItem); // Topic near a lesson => adopt that lesson's cohort
          return undefined;
        }

        if (isLesson(activeItem) || isAssignment(activeItem)) {
          if (isTopic(overItem)) return overItem.id; // Lesson into that topic
          if (isLesson(overItem)) return overItem.parentId ?? null; // Lesson among lessons of same topic
          if (isCohort(overItem)) return undefined; // Don't reparent off a cohort
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
          const lIdx = out.findIndex(isLesson) || out.findIndex(isAssignment);

          if (cIdx !== -1 && tIdx !== -1 && tIdx < cIdx) {
            // Move earliest cohort to just before the earliest topic
            out = arrayMove(out, cIdx, tIdx);
            changed = true;
          }

          // Recompute after potential move
          const tIdx2 = out.findIndex(isTopic);
          const lIdx2 = out.findIndex(isLesson) || out.findIndex(isAssignment);

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
      const finalMap = new Map(list.map((i) => [i.id, i] as const));
      const depthMemo = new Map<string, number>();

      const depthOf = (item: (typeof list)[number]): number => {
        if (depthMemo.has(item.id)) return depthMemo.get(item.id)!;

        let d = 0;
        if (isCohort(item)) {
          d = 0;
        } else if (isTopic(item)) {
          const parent = item.parentId
            ? finalMap.get(item.parentId)
            : undefined;
          d = parent && isCohort(parent) ? depthOf(parent) + 1 : 1; // fallback to level 1
        } else if (isLesson(item) || isAssignment(item)) {
          const parent = item.parentId
            ? finalMap.get(item.parentId)
            : undefined;
          d = parent && isTopic(parent) ? depthOf(parent) + 1 : 2; // fallback to level 2
        }
        depthMemo.set(item.id, d);
        return d;
      };

      return list.map((i) => ({ ...i, depth: depthOf(i) }));
    });
  };

  const addItem = (
    type: LearningUnit,
    parentId: string | null = null,
    depth = 0
  ) => {
    const newItem: DraggableItem = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      title: `New ${type} `,
      type,
      depth,
      parentId,
    };
    setCurriculum((prev) => [...prev, newItem]);
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
  const flattenCohort = (cohort: Cohort, cohortDepth = 0): DraggableItem[] => {
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

  // --------------------------------------------------------------------

  const updateItemName = (itemId: string, name: string) => {
    setCurriculum((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, title: name } : item))
    );
    setEditingItemId(null);
  };

  const deleteItem = (itemId: string) => {
    console.log("Deleting item:", itemId);

    setCurriculum((prev) => {
      // Find all children and grandchildren recursively to delete them too
      const itemsToDelete = new Set<string>([itemId]);
      const queue = [itemId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = prev.filter((i) => i.parentId === currentId);
        for (const child of children) {
          itemsToDelete.add(child.id);
          queue.push(child.id);
        }
      }

      console.log("Items to delete:", Array.from(itemsToDelete));
      const newCurriculum = prev.filter((i) => !itemsToDelete.has(i.id));
      console.log("New curriculum length:", newCurriculum.length);
      return newCurriculum;
    });
  };

  const handleAssignment = (assignment: Assignment) => {
    console.log("handleAssignment called:", { assignment, activeParentId });

    if (!activeParentId) {
      console.error("No activeParentId set");
      return;
    }

    const parentIndex = curriculum.findIndex(item => item.id === activeParentId);
    if (parentIndex === -1) {
      console.error("Parent not found in curriculum:", activeParentId);
      return;
    }

    console.log("Parent found at index:", parentIndex, curriculum[parentIndex]);

    // Check duplicate
    const assignmentExists = curriculum.some(item =>
      item.type === LEARNING_UNIT.ASSIGNMENT &&
      item.parentId === activeParentId &&
      (item.refId === assignment.id || item.refId === assignment.id)
    );

    if (assignmentExists) {
      console.log("Assignment already exists");
      toast({
        title: "Duplicate Assignment",
        description: "Assignment already exists in this topic",
        variant: "destructive"
      });
      return;
    }

    // Create assignment item
    const newItem: DraggableItem = {
      id: assignment.id,
      refId: assignment.id,
      title: assignment.title,
      type: LEARNING_UNIT.ASSIGNMENT,
      depth: curriculum[parentIndex].depth + 1,
      parentId: activeParentId,
    };

    console.log("Adding new assignment item:", newItem);

    setCurriculum(prev => {
      const updated = [...prev];

      // Find insertion point after parent
      let insertIndex = parentIndex + 1;
      for (let i = parentIndex + 1; i < updated.length; i++) {
        if (updated[i].depth <= curriculum[parentIndex].depth) break;
        insertIndex = i + 1;
      }

      updated.splice(insertIndex, 0, newItem);
      console.log("Curriculum after adding assignment:", updated);
      return updated;
    });

    setIsAssignmentModelOpen(false);
    setActiveParentId(null); // Reset active parent
    toast({
      title: "Success",
      description: "Assignment added to curriculum"
    });
    setIsTopicItemAdded(true);
  };

  const addLessonsToParent = (lessons: Lesson[]) => {
    if (!activeParentId) return;

    const parentIndex = curriculum.findIndex(
      (i) => i.id === activeParentId
    );
    const parentDepth = curriculum[parentIndex]?.depth || 0;
    const parentTopic = curriculum[parentIndex];

    // if topic has a cohort, collect used lesson ids in that cohort
    let usedInCohort = new Set<string>();
    const cohortId = parentTopic?.parentId ?? null;

    if (cohortId) {
      const topicIdsInCohort = new Set(
        curriculum
          .filter(
            (i) =>
              i.type === LEARNING_UNIT.TOPIC && i.parentId === cohortId
          )
          .map((i) => i.id)
      );

      curriculum.forEach((i) => {
        if (
          i.type === LEARNING_UNIT.LESSON &&
          i.parentId &&
          topicIdsInCohort.has(i.parentId)
        ) {
          usedInCohort.add(i.refId ?? i.id);
        }
      });
    }

    // Filter: remove duplicates already present in cohort AND duplicates within selection
    const seenInSelection = new Set<string>();
    const filtered = lessons.filter((l) => {
      if (cohortId && usedInCohort.has(l.id)) return false;
      if (seenInSelection.has(l.id)) return false;
      seenInSelection.add(l.id);
      return true;
    });

    const skippedCount = lessons.length - filtered.length;
    if (skippedCount > 0) {
      toast({
        title: "Skipped duplicates",
        description: `${skippedCount} lesson(s) already exist in this cohort and were not added.`,
      });
    }

    const newItems: DraggableItem[] = filtered.map((lesson) => ({
      id: lesson.id, // instance id
      refId: lesson.id, // real id
      title: lesson.title,
      type: LEARNING_UNIT.LESSON,
      depth: parentDepth + 1,
      parentId: activeParentId,
    }));

    setCurriculum((prev) => {
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
    setActiveParentId(null); // Reset active parent
    setIsTopicItemAdded(true);
  };

  const saveCurriculumStructure = async () => {
    if (!courseId || !course) {
      toast({
        title: "Error",
        description: "Course data is not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Current curriculum:", curriculum);
      showOverlay("Saving Curriculum.");

      const newRootTopics: Topic[] = [];
      const newCohorts: Cohort[] = [];

      // Create maps for efficient lookup
      const itemMap = new Map(curriculum.map((item) => [item.id, item]));
      const childrenMap = new Map<string, DraggableItem[]>();
      curriculum.forEach((item) => {
        if (item.parentId) {
          if (!childrenMap.has(item.parentId)) {
            childrenMap.set(item.parentId, []);
          }
          childrenMap.get(item.parentId)!.push(item);
        }
      });

      // Process only root items (depth 0)
      for (const item of curriculum) {
        if (item.parentId == null) {
          if (item.type === LEARNING_UNIT.COHORT) {
            // Topics directly under this cohort
            const cohortTopicItems = (childrenMap.get(item.id) || []).filter(
              (c) => c.type === LEARNING_UNIT.TOPIC
            );

            const cohortTopics: Topic[] = cohortTopicItems.map((topicItem) => {
              const lessonItems = (childrenMap.get(topicItem.id) || [])
                .filter((l) => l.type === LEARNING_UNIT.LESSON || l.type === LEARNING_UNIT.ASSIGNMENT)
                .map((lessonItem) => ({
                  id: (lessonItem.refId ?? lessonItem.id) as string, // handle both lessons and assignments
                  title: lessonItem.title,
                  type: lessonItem.type as LearningContentType
                })) as TopicItem[];

              return {
                id: topicItem.id,
                title: topicItem.title,
                items: lessonItems,
              };
            });

            const originalCohort = (item.originalData as Cohort) || {};
            newCohorts.push({
              ...originalCohort,
              id: item.id,
              title: item.title,
              topics: cohortTopics,
              price: 0,
            });
          } else if (item.type === LEARNING_UNIT.TOPIC) {
            // Root topic
            const lessonItems = (childrenMap.get(item.id) || [])
              .filter((l) => l.type === LEARNING_UNIT.LESSON || l.type === LEARNING_UNIT.ASSIGNMENT)
              .map((lessonItem) => ({
                id: lessonItem.refId ?? lessonItem.id, // handle both lessons and assignments
                title: lessonItem.title,
                type: lessonItem.type as LearningContentType
              }));
            newRootTopics.push({
              id: item.id,
              title: item.title,
              items: lessonItems,
            });
          }
        }
      }
      const updates: Partial<Course> = {
        topics: newRootTopics,
        cohorts: newCohorts,
      };

      await courseService.updateCourse(courseId, updates);

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

  const firstLessonId = useMemo(() => {
    const firstLesson = curriculum.find(
      (i) => i.type === LEARNING_UNIT.LESSON || i.type === LEARNING_UNIT.ASSIGNMENT
    );
    return firstLesson ? (firstLesson.refId ?? firstLesson.id) : null;
  }, [curriculum]);

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
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            {/* <TabsTrigger value="additional">Additional</TabsTrigger> */}
          </TabsList>

          {/* ────────── BASICS TAB CONTENT ────────── */}
          <TabsContent value="basics">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* ───────── LEFT SIDE (Main Content) ───────── */}
              <div className="lg:col-span-2 space-y-6">
                {/* Title */}
                <Card className="rounded-xl border p-4">
                  <CardHeader className="pb-2">
                    <CardTitle>Course Title</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Mastering React 18"
                    />
                  </CardContent>
                </Card>
                {/* Description */}
                <Card className="rounded-xl border p-4">
                  <CardHeader className="pb-2">
                    <CardTitle>Description</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      A short marketing paragraph – supports markdown.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-32"
                      placeholder="What will students learn?"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Thumbnail</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!preview && thumbnailUrl && (
                      <div className="mb-5">
                        <img
                          src={thumbnailUrl}
                          alt="Preview"
                          className="border rounded"
                        />
                      </div>
                    )}
                    {preview && (
                      <div className="mb-5">
                        <img
                          src={preview}
                          alt="Preview"
                          className="border rounded"
                        />
                      </div>
                    )}
                    {uploadingThumbnail && (
                      <div className="mb-8">
                        <div className="w-full h-2 rounded-sm bg-white border overflow-hidden">
                          <div
                            style={{
                              width: `${progress}%`,
                              height: "100%",
                              backgroundColor: "#ff00ff",
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                        <small>{progress}%</small>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <input type="file" accept="image/*" onChange={handleFileChange} />
                    </div>
                  </CardContent>
                </Card>
                {/* Instructor + Categories + Tags row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Instructor */}
                  <Card className="rounded-xl border p-4">
                    <CardHeader className="pb-2">
                      <CardTitle>Instructor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={instructorName}
                        onValueChange={(val) => {
                          const a = instructors.find((x) => x.name === val);
                          setInstructorName(val);
                          setInstructorId(a?.id || "");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                        <SelectContent>
                          {instructors.map((a) => (
                            <SelectItem key={a.id} value={a.name}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                  {/* Categories */}
                  {/* <Card className="rounded-xl border p-4">
                    <CardHeader className="pb-2">
                      <CardTitle>Categories</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Pick one or more to help discovery
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {["AI/ML", "Bootcamp", "College", "Data-Science", "Generative-AI"].map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={categories.includes(cat)}
                            onCheckedChange={() =>
                              setCategories((prev) =>
                                prev.includes(cat)
                                  ? prev.filter((c) => c !== cat)
                                  : [...prev, cat]
                              )
                            }
                          />
                          {cat}
                        </label>
                      ))}
                    </CardContent>
                  </Card>
                  {/* Tags */}
                  <Card className="rounded-xl border p-4">
                    <CardHeader className="pb-2">
                      <CardTitle>Tags</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Used for search. Press Enter to add.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={tagInput}
                        placeholder="add tag and press ↵"
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tagInput.trim()) {
                            e.preventDefault();
                            if (!tags.includes(tagInput.trim()))
                              setTags([...tags, tagInput.trim()]);
                            setTagInput("");
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2 mt-3">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1"
                          >
                            {t}
                            <button
                              className="hover:text-red-500"
                              onClick={() =>
                                setTags(tags.filter((x) => x !== t))
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Categories */}
                  <Card className="rounded-xl border p-4">
                    <CardHeader className="pb-2">
                      <CardTitle>Categories</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Pick one or more to help discovery
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {selectedCategories.length > 0
                              ? `${selectedCategories.length} selected`
                              : "Select categories"}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search or add category..." />
                            <CommandList>
                              <CommandGroup>
                                {allCategories.map((cat) => (
                                  <CommandItem
                                    key={cat}
                                    onSelect={() =>
                                      setSelectedCategories((prev) =>
                                        prev.includes(cat)
                                          ? prev.filter((c) => c !== cat)
                                          : [...prev, cat]
                                      )
                                    }
                                  >
                                    <Checkbox
                                      checked={selectedCategories.includes(cat)}
                                      className="mr-2"
                                    />
                                    {cat}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                            <div className="p-2 border-t">
                              <Input
                                placeholder="Add new category"
                                onKeyDown={async (e) => {
                                  if (
                                    e.key === "Enter" &&
                                    e.currentTarget.value.trim()
                                  ) {
                                    const newCat = e.currentTarget.value.trim();
                                    await attributeService.addAttribute(
                                      ATTRIBUTE_TYPE.CATEGORY,
                                      newCat
                                    );
                                    setAllCategories((prev) => [
                                      ...prev,
                                      newCat,
                                    ]);
                                    setSelectedCategories((prev) => [
                                      ...prev,
                                      newCat,
                                    ]);
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </CardContent>
                  </Card>

                  {/* Target Audience */}
                  <Card className="rounded-xl border p-4">
                    <CardHeader className="pb-2">
                      <CardTitle>Target Audience</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {selectedTargetAudiences.length > 0
                              ? `${selectedTargetAudiences.length} selected`
                              : "Select target audience"}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search or add audience..." />
                            <CommandList>
                              <CommandGroup>
                                {allTargetAudiences.map((aud) => (
                                  <CommandItem
                                    key={aud}
                                    onSelect={() =>
                                      setSelectedTargetAudiences((prev) =>
                                        prev.includes(aud)
                                          ? prev.filter((a) => a !== aud)
                                          : [...prev, aud]
                                      )
                                    }
                                  >
                                    <Checkbox
                                      checked={selectedTargetAudiences.includes(
                                        aud
                                      )}
                                      className="mr-2"
                                    />
                                    {aud}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                            <div className="p-2 border-t">
                              <Input
                                placeholder="Add new target audience"
                                onKeyDown={async (e) => {
                                  if (
                                    e.key === "Enter" &&
                                    e.currentTarget.value.trim()
                                  ) {
                                    const newAud = e.currentTarget.value.trim();
                                    await attributeService.addAttribute(
                                      ATTRIBUTE_TYPE.TARGET_AUDIENCE,
                                      newAud
                                    );
                                    setAllTargetAudiences((prev) => [
                                      ...prev,
                                      newAud,
                                    ]);
                                    setSelectedTargetAudiences((prev) => [
                                      ...prev,
                                      newAud,
                                    ]);
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {/* ───────── RIGHT SIDE (Pricing, Status) ───────── */}
              <div className="space-y-6">
                {/* Pricing */}
                <Card className="rounded-xl border p-4">
                  <div className="flex gap-4">
                    <Button onClick={saveBasics}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Basics
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/admin")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-3" />
                      {"Back to Courses"}
                    </Button>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        Regular price
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={regularPrice}
                          onChange={(e) => setRegularPrice(+e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Sale price</label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={salePrice}
                          onChange={(e) => setSalePrice(+e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Duration */}
                <Card className="rounded-xl border p-4">
                  <CardHeader className="pb-2">
                    <CardTitle>Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                    />
                  </CardContent>
                </Card>
                {/* Status */}
                <Card className="rounded-xl border p-4">
                  <CardHeader className="pb-2">
                    <CardTitle>Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={status}
                      onValueChange={(val) => setStatus(val as CourseStatus)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(COURSE_STATUS).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <Card className="shadow-lg border">
              {/* ---- Header ------------------------------------------------ */}
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {title} - Curriculum
                </CardTitle>

                <div className="flex flex-wrap gap-2">
                  <CohortBuilderPage
                    onCohortCreated={(cohort) => {
                      setCurriculum((prev) => {
                        const newCohort: DraggableItem = {
                          id: cohort.id,
                          title: cohort.title,
                          type: LEARNING_UNIT.COHORT,
                          depth: 0,
                          parentId: null,
                          originalData: cohort,
                        };

                        // Find all orphan topics (no cohort yet)
                        const orphanTopics = prev.filter(
                          (i) =>
                            i.type === LEARNING_UNIT.TOPIC &&
                            i.parentId === null
                        );
                        if (orphanTopics.length === 0) {
                          // No orphans, just append cohort
                          return [...prev, newCohort];
                        }

                        // Reparent orphans + adjust depth
                        const updated = prev.map((item) => {
                          if (orphanTopics.some((t) => t.id === item.id)) {
                            return { ...item, parentId: cohort.id, depth: 1 };
                          }
                          if (
                            item.type === LEARNING_UNIT.LESSON &&
                            orphanTopics.some((t) => t.id === item.parentId)
                          ) {
                            return { ...item, depth: 2 };
                          }
                          return item;
                        });

                        // Place cohort before first orphan topic
                        const firstOrphanIndex = prev.findIndex(
                          (i) =>
                            i.type === LEARNING_UNIT.TOPIC &&
                            i.parentId === null
                        );
                        const insertIndex =
                          firstOrphanIndex === -1
                            ? prev.length
                            : firstOrphanIndex;
                        const result = [...updated];
                        result.splice(insertIndex, 0, newCohort);
                        return result;
                      });

                      toast({
                        title: "Cohort Added",
                        description: `“${cohort.title}” has been added, and existing topics were nested under it.`,
                      });
                    }}
                  />

                  {!curriculum.some(
                    (item) => item.type === LEARNING_UNIT.COHORT
                  ) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          addItem(LEARNING_UNIT.TOPIC);
                        }}
                        className="flex items-center gap-1"
                      >
                        Add Topic
                      </Button>
                    )}

                  <Button
                    size="sm"
                    onClick={saveCurriculumStructure}
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Link to={`/course/${courseId}/lesson/${firstLessonId}`} target="_blank">
                    <Button
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Preview Course
                    </Button>
                  </Link>
                </div >
              </CardHeader >

              {/* ---- Body -------------------------------------------------- */}
              < CardContent className="pt-0" >
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
                                <FolderOpen className="h-6 w-6 text-primary flex-shrink-0" />
                              )}
                              {item.type === LEARNING_UNIT.LESSON && (
                                <BookOpen className="h-6 w-6 text-red-500 flex-shrink-0" />
                              )}
                              {item.type === LEARNING_UNIT.COHORT && (
                                <Users className="h-6 w-6 text-green-600 flex-shrink-0" />
                              )}
                              {item.type === LEARNING_UNIT.ASSIGNMENT && (
                                <NotepadText className="h-6 w-6 text-blue-500 flex-shrink-0" />
                              )}

                              {/* Title – inline edit */}
                              {editingItemId === item.id ? (
                                <Input
                                  value={newItemName}
                                  onChange={(e) =>
                                    setNewItemName(e.target.value)
                                  }
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
                              ) : item.type === LEARNING_UNIT.ASSIGNMENT || item.type == LEARNING_UNIT.LESSON ? (<Link to={`/admin/edit-${item.type.toLowerCase()}/${item.id}`}>{item.title}</Link>) : (
                                <span className="flex-1 truncate cursor-pointer hover:underline">
                                  {item.title}
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
                                    onClick={() =>
                                      addTopicToCohort(item.id, item.depth)
                                    }
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
                                    onClick={() => {
                                      setIsCreateLessonOpen(true);
                                      setActiveParentId(item.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Add Lesson"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addLessonToParent(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Add Lesson"
                                  >
                                    <Search className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setIsAssignmentModelOpen(true);
                                      setActiveParentId(item.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                                    onClick={() => deleteItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                    title="Delete Topic"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* Lesson actions */}
                              {(item.type === LEARNING_UNIT.LESSON || item.type == LEARNING_UNIT.ASSIGNMENT) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setNewItemName(item.title);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Rename"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
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
              </CardContent >
            </Card >
          </TabsContent >
        </Tabs >
      </main >

      {/* Lesson Selector */}
      <LessonSelectorModal
        isOpen={isLessonSelectorModalOpen}
        onClose={() => {
          setIsLessonSelectorModalOpen(false);
        }}
        onConfirm={addLessonsToParent}
        excludedLessonIds={excludedLessonIdsForActiveParent}
      />
      {isAssignmentModelOpen && <AssignmentModal onCancel={() => {
        setIsAssignmentModelOpen(false);
      }} onSave={handleAssignment} />}
      <CreateLessonModal
        isOpen={isCreateLessonOpen}
        onClose={() => {
          setIsCreateLessonOpen(false);
        }}
        onLessonCreated={(lesson) => addLessonsToParent([lesson])}
      />
    </div >
  );
};

export default CurriculumBuilderPage;

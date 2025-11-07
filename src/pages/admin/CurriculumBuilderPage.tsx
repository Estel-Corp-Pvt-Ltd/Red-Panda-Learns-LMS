import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import CourseBasicsTab from "@/components/admin/CourseBasicsTab";
import CurriculumTab from "@/components/admin/CurriculumTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLoadingOverlay } from "@/contexts/LoadingOverlayContext";
import { courseService } from "@/services/courseService";
import { attributeService } from "@/services/attributeService";
import { instructorService } from "@/services/instructorService";
import { getFullName } from "@/utils/name";
import { ATTRIBUTE_TYPE, COURSE_STATUS, LEARNING_UNIT } from "@/constants";
import { logError } from "@/utils/logger";
import type { Course } from "@/types/course";
import type { Lesson } from "@/types/lesson";
import type { Assignment } from "@/types/assignment";
import type { Topic, TopicItem } from "@/types/course";
import type { CourseStatus, LearningUnit } from "@/types/general";
import type { DurationForm } from "@/components/admin/CourseBasicsTab";
import { LearningContentType } from "@/types/lesson";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { getDownloadURL } from "firebase/storage";
import { fileService } from "@/services/fileService";

/** Convert empty string to null or valid number */
const toNumberOrNull = (val: string) => (val === "" ? null : Number(val));
/** Type guard for numeric checks */
const isNum = (v: number | null): v is number =>
  v !== null && Number.isFinite(v);

// ─────────────────────────────────────────────────────────────────────────────
// ─── Main Component ──────────────────────────────────────────────────────────

const CurriculumBuilderPage = () => {
  // ─── Router + Utils ─────────────────────────────────────────────
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showOverlay, hideOverlay } = useLoadingOverlay();

  // ─── Basic Info States ─────────────────────────────────────────
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CourseStatus>(COURSE_STATUS.DRAFT);

  const [regularPrice, setRegularPrice] = useState<number | null>(0);
  const [salePrice, setSalePrice] = useState<number | null>(0);
  const [duration, setDuration] = useState<DurationForm>({
    hours: 0,
    minutes: 0,
  });

  // ─── Attributes & Instructor ────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<
    string[]
  >([]);
  const [allTargetAudiences, setAllTargetAudiences] = useState<string[]>([]);
  const [instructors, setInstructors] = useState<
    { id: string; name: string }[]
  >([]);
  const [instructorId, setInstructorId] = useState("");
  const [instructorName, setInstructorName] = useState("");

  // ─── Tags & Media ───────────────────────────────────────────
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [progress, setProgress] = useState(0);

  // ─── Curriculum Management ──────────────────────────────────
  type DraggableItem = {
    id: string;
    title: string;
    type: LearningUnit;
    depth: number;
    parentId: string | null;
    refId?: string;
    originalData?: any;
  };

  const [curriculum, setCurriculum] = useState<DraggableItem[]>([]);
  const [isTopicItemAdded, setIsTopicItemAdded] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] =
    useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [isAssignmentModelOpen, setIsAssignmentModelOpen] = useState(false);
  const [isLessonEditModelOpen, setIsLessonEditModelOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────
  // ─── Lifecycle: Load Attributes, Instructor, and Course Data ───
  // ───────────────────────────────────────────────────────────────

  /** Load attributes (Categories, Target Audiences) */
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const categories = await attributeService.getAttributes(
          ATTRIBUTE_TYPE.CATEGORY
        );
        setAllCategories(categories.map((a) => a.name));

        const audiences = await attributeService.getAttributes(
          ATTRIBUTE_TYPE.TARGET_AUDIENCE
        );
        setAllTargetAudiences(audiences.map((a) => a.name));
      } catch (err) {
        toast({
          title: "Error loading attributes",
          description: String(err),
          variant: "destructive",
        });
      }
    };
    fetchAttributes();
  }, [toast]);

  /** Load instructors list */
  useEffect(() => {
    const fetchInstructors = async () => {
      const result = await instructorService.getAllInstructors();
      if (result.success) {
        setInstructors(
          result.data.map((i) => ({
            id: i.id,
            name: getFullName(i.firstName, i.middleName, i.lastName),
          }))
        );
      }
    };
    fetchInstructors();
  }, []);

  /** Load course and flatten structure into draggable list */
  useEffect(() => {
    if (!courseId) return;
    const loadCourse = async () => {
      try {
        showOverlay("Loading course data...");
        const data = await courseService.getCourseById(courseId);
        setCourse(data);
        setTitle(data.title);
        setDescription(data.description);
        setStatus(data.status);
        setDuration({
          hours: data.duration?.hours ?? 0,
          minutes: data.duration?.minutes ?? 0,
        });
        setRegularPrice(data.regularPrice ?? 0);
        setSalePrice(data.salePrice ?? 0);
        setSelectedCategories(data.categoryIds ?? []);
        setSelectedTargetAudiences(data.targetAudienceIds ?? []);
        setTags(data.tags ?? []);
        setInstructorId(data.instructorId ?? "");
        setInstructorName(data.instructorName ?? "");
        setThumbnailUrl(data.thumbnail ?? "");
        setCurriculum(getFlatCurriculum(data));
      } catch (err) {
        toast({
          title: "Error loading course",
          description: String(err),
          variant: "destructive",
        });
      } finally {
        hideOverlay();
      }
    };
    loadCourse();
  }, [courseId]);

  // ───────────────────────────────────────────────────────────────
  // ─── BASICS TAB LOGIC ──────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────

  /**
   * Upload handler for new thumbnail image
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
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

  /** Can the basic course info be saved (validation) */
  const canSaveBasics =
    title.trim() &&
    description.trim() &&
    isNum(regularPrice) &&
    isNum(salePrice) &&
    isNum(duration.hours) &&
    isNum(duration.minutes);

  /** Save fundamental course details (non-curriculum) */
  const saveBasics = async () => {
    if (!courseId) return;
    try {
      showOverlay("Saving course basics...");
      await courseService.updateCourse(courseId, {
        title: title.trim(),
        description: description.trim(),
        duration,
        regularPrice: regularPrice!,
        salePrice: salePrice!,
        thumbnail: thumbnailUrl,
        categoryIds: selectedCategories,
        targetAudienceIds: selectedTargetAudiences,
        tags,
        instructorId,
        instructorName,
        status,
      });
      toast({ title: "Saved", description: "Course updated." });
    } catch (err) {
      toast({
        title: "Error",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      hideOverlay();
    }
  };

  // ───────────────────────────────────────────────────────────────
  // ─── CURRICULUM TAB LOGIC ──────────────────────────────────────
  // ───────────────────────────────────────────────────────────────

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
  const addTopic = () => {
    setCurriculum((prev) => [
      ...prev,
      {
        id: `topic_${Date.now()}`,
        title: "New Topic",
        type: LEARNING_UNIT.TOPIC,
        depth: 0,
        parentId: null,
      },
    ]);
  };



  /** Update an item's title (topic/lesson/assignment) */
  const updateItemName = (itemId: string, name: string) => {
    setCurriculum((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, title: name } : item))
    );
  
  };

  /** Delete any curriculum item */
  const deleteItem = (id: string) => {
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
      } else if (
        item.depth <= parentDepth ||
        item.type === LEARNING_UNIT.TOPIC
      ) {
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

  /** Add new assignment or update existing one under active topic */
  /** Add new assignment or update existing one */
  const handleAssignment = (assignment: Assignment) => {
    setCurriculum((prev) => {
      // ─────────────────────────────────────────────────────────
      // ✅ CHECK IF EDITING EXISTING ASSIGNMENT
      // ─────────────────────────────────────────────────────────
      const existingIndex = prev.findIndex((i) => i.id === assignment.id);

      if (existingIndex !== -1) {
        // ✅ UPDATE MODE: Just update the title
        return prev.map((item) =>
          item.id === assignment.id
            ? { ...item, title: assignment.title }
            : item
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
        } else if (
          item.depth <= parentDepth ||
          item.type === LEARNING_UNIT.TOPIC
        ) {
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
  /** Enforce hierarchy and re-index after drag & drop */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Early exit: no valid drop target or dropped on self
    if (!over || active.id === over.id) return;

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
      const isTopic = (item: (typeof list)[number]) =>
        item.type === LEARNING_UNIT.TOPIC;
      const isChild = (item: (typeof list)[number]) =>
        item.type === LEARNING_UNIT.LESSON ||
        item.type === LEARNING_UNIT.ASSIGNMENT;

      const activeItem = list[idxActive];
      const overItem = list[idxOver];

     
      if (isTopic(activeItem)) {
        const overItem = list[idxOver];

        // Prevent dropping into another topic’s children
        // Check if drop target is inside someone else’s subtree
        if (!isTopic(overItem)) {
          // Find the topic "block" that owns the overItem
          const parentTopic = list.find(
            (i) =>
              i.type === LEARNING_UNIT.TOPIC &&
              // Find first topic above the overItem
              list.indexOf(i) < idxOver &&
              // Find next topic below (if any)
              (list.findIndex(
                (t) =>
                  t.type === LEARNING_UNIT.TOPIC &&
                  list.indexOf(t) > list.indexOf(i)
              ) > idxOver ||
                list.findIndex(
                  (t) =>
                    t.type === LEARNING_UNIT.TOPIC &&
                    list.indexOf(t) > list.indexOf(i)
                ) === -1)
          );

          // If we found that the overItem belongs to a topic block (thus not root)
          if (parentTopic) {
            return prev; //  Invalid drop → ignore
          }
        }

        //  Valid reorder: treat all topics as root-level
        const reordered = arrayMove(list, idxActive, idxOver);
        const final = reordered.map((item) =>
          isTopic(item) ? { ...item, parentId: null, depth: 0 } : item
        );

        if (JSON.stringify(prev) !== JSON.stringify(final)) {
          queueMicrotask(() => saveCurriculumStructure());
        }

        return final;
      }

      // ─────────────────────────────────────────────────────────
      // CASE 2: Dragging a CHILD (Lesson or Assignment)
      // Must maintain parent relationship and validate position
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

        // Guard: must have valid parent
        if (!newParentId) return prev;

        // Perform array reorder
        let reordered = arrayMove(list, idxActive, idxOver);

        // Update the moved item's parent
        reordered = reordered.map((item) =>
          item.id === activeId ? { ...item, parentId: newParentId } : item
        );

        // ─────────────────────────────────────────────────────────
        //  CRITICAL GUARD: Prevent children before first topic
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

        const computeDepth = (item: (typeof reordered)[number]): number => {
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

  /** Save the current curriculum structure to the backend */
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
      showOverlay("Saving Curriculum...");

      const newTopics: Topic[] = [];
      const childrenMap = new Map<string, DraggableItem[]>();
      curriculum.forEach((item) => {
        if (item.parentId) {
          if (!childrenMap.has(item.parentId))
            childrenMap.set(item.parentId, []);
          childrenMap.get(item.parentId)!.push(item);
        }
      });

      for (const item of curriculum) {
        if (!item.parentId && item.type === LEARNING_UNIT.TOPIC) {
          const lessonItems = (childrenMap.get(item.id) || [])
            .filter(
              (l) =>
                l.type === LEARNING_UNIT.LESSON ||
                l.type === LEARNING_UNIT.ASSIGNMENT
            )
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
      (i) =>
        i.type === LEARNING_UNIT.LESSON || i.type === LEARNING_UNIT.ASSIGNMENT
    );
    return firstLesson ? firstLesson.refId ?? firstLesson.id : null;
  }, [curriculum]);

  // ───────────────────────────────────────────────────────────────
  // ─── RENDER ────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="basics" className="w-full">
          <TabsList>
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          </TabsList>

          {/* ─── BASICS TAB ───────────────────────────────────────── */}
          <TabsContent value="basics">
            <CourseBasicsTab
              course={course}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              instructorId={instructorId}
              setInstructorId={setInstructorId}
              instructorName={instructorName}
              setInstructorName={setInstructorName}
              instructors={instructors}
              regularPrice={regularPrice}
              setRegularPrice={setRegularPrice}
              salePrice={salePrice}
              setSalePrice={setSalePrice}
              duration={duration}
              setDuration={setDuration}
              status={status}
              setStatus={setStatus}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              allCategories={allCategories}
              setAllCategories={setAllCategories}
              selectedTargetAudiences={selectedTargetAudiences}
              setSelectedTargetAudiences={setSelectedTargetAudiences}
              allTargetAudiences={allTargetAudiences}
              setAllTargetAudiences={setAllTargetAudiences}
              tags={tags}
              setTags={setTags}
              tagInput={tagInput}
              setTagInput={setTagInput}
              thumbnailUrl={thumbnailUrl}
              preview={preview}
              uploadingThumbnail={uploadingThumbnail}
              progress={progress}
              handleFileChange={handleFileChange}
              onSave={saveBasics}
              canSaveBasics={Boolean(canSaveBasics)}
            />
          </TabsContent>

          {/* ─── CURRICULUM TAB ───────────────────────────────────── */}
          <TabsContent value="curriculum">
            <CurriculumTab
              title={title}
              courseId={courseId}
              curriculum={curriculum}
              setCurriculum={setCurriculum}
              toast={toast}
              handleDragEnd={handleDragEnd}
              saveCurriculumStructure={saveCurriculumStructure}
              addItem={addTopic}
              addLessonToParent={addLessonToParent}
              deleteItem={deleteItem}
              updateItemName={updateItemName}
              isLessonSelectorModalOpen={isLessonSelectorModalOpen}
              setIsLessonSelectorModalOpen={setIsLessonSelectorModalOpen}
              isCreateLessonOpen={isCreateLessonOpen}
              setIsCreateLessonOpen={setIsCreateLessonOpen}
              isAssignmentModelOpen={isAssignmentModelOpen}
              setIsAssignmentModelOpen={setIsAssignmentModelOpen}
              isLessonEditModelOpen={isLessonEditModelOpen}
              setIsLessonEditModelOpen={setIsLessonEditModelOpen}
              activeParentId={activeParentId}
              setActiveParentId={setActiveParentId}
              editingItemId={editingItemId}
              setEditingItemId={setEditingItemId}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              addLessonsToParent={addLessonsToParent}
              handleAssignment={handleAssignment}
              firstLessonId={firstLessonId}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CurriculumBuilderPage;

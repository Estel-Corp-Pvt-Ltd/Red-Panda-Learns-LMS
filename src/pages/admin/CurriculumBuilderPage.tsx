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
  Upload,
  Save,
  BookOpen,
  Users,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { courseService } from "@/services/courseService";
import { Course, Topic, Cohort } from "@/types/course";
import { LessonSelectorModal } from "@/components/admin/LessonSelectorModal";
import { Lesson } from "@/types/lesson";
import CohortImporterModal from "@/components/admin/CohortImporterModel";
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
import { authorService } from "@/services/authorService";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";

// FIX: Define draggable item type
type DraggableItemType = LearningUnit | "COHORT";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  type: DraggableItemType;
  depth: number;
}

type DraggableItem = {
  id: string;
  title: string;
  type: DraggableItemType;
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

const CurriculumBuilderPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [curriculum, setCurriculum] = useState<DraggableItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [lessonsToBeAdded, setLessonsToBeAdded] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] = useState(false);
  const [isCohortImporterModalOpen, setIsCohortImporterModalOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  // Basics tab state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CourseStatus>(COURSE_STATUS.DRAFT);
  const [regularPrice, setRegularPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authors, setAuthors] = useState<{ id: string; name: string }[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      setCategories(courseData.categories || []);
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

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const data = await authorService.getAllAuthors();
        const formattedAuthors = data.map(author => {
          const fullName = [author.firstName, author.middleName, author.lastName]
            .filter(Boolean)
            .join(" ");
          return { id: author.id, name: fullName };
        });

        setAuthors(prev => {
          const exists = formattedAuthors.some(a => a.id === authorId);
          return exists || !authorId
            ? formattedAuthors
            : [{ id: authorId, name: authorName }, ...formattedAuthors];
        });
      } catch (error) {
        console.error("Failed to fetch authors:", error);
        toast({ title: "Error", description: "Could not load authors list.", variant: "destructive" });
      }
    };
    fetchAuthors();
  }, [toast, authorId, authorName]);

  const saveBasics = async () => { /* unchanged, fine */ };

  const getFlatCurriculum = (courseData: Course): DraggableItem[] => {
    const flatList: DraggableItem[] = [];
    (courseData.topics || []).forEach(topic => {
      flatList.push({ id: topic.id, title: topic.title, type: LEARNING_UNIT.TOPIC, depth: 0, parentId: null, originalData: topic });
      (topic.items || []).forEach(lesson => {
        flatList.push({ id: lesson.id, title: lesson.title, type: LEARNING_UNIT.LESSON, depth: 1, parentId: topic.id });
      });
    });
    (courseData.cohorts || []).forEach(cohort => {
      flatList.push({ id: cohort.id, title: cohort.title, type: "COHORT", depth: 0, parentId: null, originalData: cohort });
      (cohort.topics || []).forEach(topic => {
        flatList.push({ id: topic.id, title: topic.title, type: LEARNING_UNIT.TOPIC, depth: 1, parentId: cohort.id });
        (topic.items || []).forEach(lesson => {
          flatList.push({ id: lesson.id, title: lesson.title, type: LEARNING_UNIT.LESSON, depth: 2, parentId: topic.id });
        });
      });
    });
    return flatList;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCurriculum(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const addItem = (type: DraggableItemType, parentId: string | null = null, depth = 0) => {
    const newItem: DraggableItem = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      title: `New ${type}`,
      type,
      depth,
      parentId,
    };
    setCurriculum(prev => [...prev, newItem]);
    setEditingItemId(newItem.id);
    setNewItemName(newItem.title);
  };

  const addLessonToParent = (parentId: string, parentDepth: number) => {
    setActiveParentId(parentId);
    setIsLessonSelectorModalOpen(true);
  };

  const addTopicToCohort = (cohortId: string, cohortDepth: number) => {
    addItem(LEARNING_UNIT.TOPIC, cohortId, cohortDepth + 1);
  };

  const handleImportCohorts = (importedCohorts: Cohort[]) => {
    const flatRows = importedCohorts.flatMap(c => getFlatCurriculum({ cohorts: [c] } as Course));
    const existingIds = new Set(curriculum.map(r => r.id));
    setCurriculum(prev => [...prev, ...flatRows.filter(r => !existingIds.has(r.id))]);
    setIsCohortImporterModalOpen(false);
  };

  const updateItemName = (itemId: string, name: string) => {
    setCurriculum(prev => prev.map(item => (item.id === itemId ? { ...item, title: name } : item)));
    setEditingItemId(null);
  };

  const deleteItem = (itemId: string) => {
    setCurriculum(prev => {
      const itemsToDelete = new Set<string>([itemId]);
      const queue = [itemId];
      while (queue.length) {
        const currentId = queue.shift()!;
        prev.filter(i => i.parentId === currentId).forEach(child => {
          itemsToDelete.add(child.id);
          queue.push(child.id);
        });
      }
      return prev.filter(i => !itemsToDelete.has(i.id));
    });
  };

  const saveCurriculumStructure = async () => { /* same as your robust version */ };

  if (loading) return <div>Loading...</div>;
  if (!course) return <div>Course not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="basics" className="w-full">
          <TabsList>
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
          </TabsList>

          {/* Basics tab unchanged */}

          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <Card className="shadow-lg border">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Course Curriculum & Cohorts
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setIsCohortImporterModalOpen(true)}>
                    <Upload className="h-4 w-4" /> Import Cohort
                  </Button>
                  <Button size="sm" onClick={() => addItem("COHORT")}>
                    <Plus className="h-4 w-4" /> Add Cohort
                  </Button>
                  <Button size="sm" onClick={() => addItem(LEARNING_UNIT.TOPIC)}>
                    <Plus className="h-4 w-4" /> Add Topic
                  </Button>
                  <Button size="sm" onClick={saveCurriculumStructure} disabled={saving}>
                    <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={curriculum.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                    {curriculum.map(item => (
  <SortableItem
    key={item.id}
    id={item.id}
    type={item.type}
    depth={item.depth}
  >
    <div className="flex items-center justify-between w-full group">
      {/* ---- Icon + Title ---- */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {item.type === LEARNING_UNIT.TOPIC && (
          <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
        )}
        {item.type === LEARNING_UNIT.LESSON && (
          <BookOpen className="h-4 w-4 text-red-500 flex-shrink-0" />
        )}
        {item.type === "COHORT" && (
          <Users className="h-5 w-5 text-green-600 flex-shrink-0" />
        )}

        {/* editable name */}
        {editingItemId === item.id ? (
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onBlur={() => updateItemName(item.id, newItemName)}
            onKeyDown={(e) => e.key === "Enter" && updateItemName(item.id, newItemName)}
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
        )}
      </div>

      {/* ---- Actions ---- */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.type === "COHORT" && (
          <>
            <Button size="sm" variant="ghost" onClick={() => addTopicToCohort(item.id, item.depth)} title="Add Topic"><Plus className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)} title="Delete Cohort" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
        {item.type === LEARNING_UNIT.TOPIC && (
          <>
            <Button size="sm" variant="ghost" onClick={() => addLessonToParent(item.id, item.depth)} title="Add Lesson"><Plus className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)} title="Delete Topic" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
        {item.type === LEARNING_UNIT.LESSON && (
          <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)} title="Delete Lesson" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
      <CohortImporterModal
        isOpen={isCohortImporterModalOpen}
        onClose={() => setIsCohortImporterModalOpen(false)}
        onConfirm={handleImportCohorts}
        excludedCohortIds={curriculum.filter(i => i.type === "COHORT").map(i => i.id)}
      />

      {/* Lesson Selector */}
      <LessonSelectorModal
        isOpen={isLessonSelectorModalOpen}
        onClose={() => setIsLessonSelectorModalOpen(false)}
        onConfirm={(lessons: Lesson[]) => {
          if (!activeParentId) return;
          const parentDepth = curriculum.find(i => i.id === activeParentId)?.depth || 0;
          const newItems = lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            type: LEARNING_UNIT.LESSON,
            depth: parentDepth + 1,
            parentId: activeParentId,
          }));
          setCurriculum(prev => [...prev, ...newItems]);
          setIsLessonSelectorModalOpen(false);
          setLessonsToBeAdded([]);
        }}
        excludedLessonIds={curriculum.filter(i => i.type === LEARNING_UNIT.LESSON).map(l => l.id)}
      />
    </div>
  );
};

export default CurriculumBuilderPage;
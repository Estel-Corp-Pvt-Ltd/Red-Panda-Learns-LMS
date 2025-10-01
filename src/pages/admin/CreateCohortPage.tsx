import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { formatDate } from "@/utils/date-time";
import { serverTimestamp } from "firebase/firestore";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, FolderOpen, Edit2, Trash2, GripVertical, Save, BookOpen, Unlock, Lock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cohortService } from "@/services/cohortService";
import { Cohort, Topic, TopicItem } from "@/types/course";
import { LessonSelectorModal } from "@/components/admin/LessonSelectorModal";
import { Lesson } from "@/types/lesson";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LEARNING_UNIT } from "@/constants";
import { LearningUnit } from "@/types/general";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header"; 

// --- Components (copied from CurriculumBuilderPage) ---
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  type: LearningUnit;
};

type DraggableTopicOrLesson = {
  id: string;
  title: string;
  type: LearningUnit;
};

const SortableItem = ({ id, children, type }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: type === LEARNING_UNIT.LESSON ? "2rem" : 0,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className={`flex items-center gap-3 p-3 rounded-md border bg-card hover:shadow-sm transition-shadow group${type === LEARNING_UNIT.LESSON ? ' ml-[3px]' : ''}`}>
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground " />
        </div>
        {children}
      </div>
    </div>
  );
};

const CohortBuilderPage = () => {
  const { cohortId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditMode = !!cohortId;

  // State
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [curriculum, setCurriculum] = useState<DraggableTopicOrLesson[]>([]);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");
  const [lessonsToBeAdded, setLessonsToBeAdded] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] = useState(false);
  const [activeTopicForLesson, setActiveTopicForLesson] = useState<string | null>(null);
  const [excludedLessonIds, setExcludedLessonIds] = useState<string[]>([]);
  
  // Cohort-specific state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  });
  const [enrollmentOpen, setEnrollmentOpen] = useState(true);
  const [maxStudents, setMaxStudents] = useState<number | undefined>(undefined);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // --- Data Loading ---
  useEffect(() => {
    const loadCohortData = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const cohortData = await cohortService.getCohortById(cohortId!);
        if (!cohortData) {
          toast({ title: "Error", description: "Cohort not found.", variant: "destructive" });
          navigate("/admin");
          return;
        }
        setCohort(cohortData);
        setTitle(cohortData.title);
        setDescription(cohortData.description || "");
        setPrice(cohortData.price);
        setStartDate(formatDate(cohortData.startDate));
        setEndDate(cohortData.endDate);
        setEnrollmentOpen(cohortData.enrollmentOpen);
        setMaxStudents(cohortData.maxStudents);
        setCurriculum(getFlatCurriculum(cohortData.topics || []));
      } catch (error) {
        toast({ title: "Error", description: `Failed to load cohort data: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadCohortData();
  }, [cohortId, isEditMode, navigate, toast]);

  // --- Helper and Handler Functions (copied from CurriculumBuilderPage) ---
  const getFlatCurriculum = (topics: Topic[]) => {
    return topics.flatMap(topic => [
      { id: topic.id, type: LEARNING_UNIT.TOPIC, title: topic.title },
      ...topic.items.map(lesson => ({ id: lesson.id, type: LEARNING_UNIT.LESSON, title: lesson.title }))
    ]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = curriculum.findIndex(i => i.id === active.id);
    const newIndex = curriculum.findIndex(i => i.id === over.id);
    if (curriculum[oldIndex]?.type === LEARNING_UNIT.LESSON && newIndex === 0) return;
    setCurriculum(arrayMove(curriculum, oldIndex, newIndex));
  };

  const addTopic = () => {
    const newTopicId = `topic-${Date.now()}`;
    const newTopic: DraggableTopicOrLesson = { id: newTopicId, title: "New Topic", type: LEARNING_UNIT.TOPIC };
    setCurriculum(prev => [...prev, newTopic]);
    setEditingTopic(newTopicId);
    setNewTopicName(newTopic.title);
  };

  const addLesson = (topicId: string) => {
    setActiveTopicForLesson(topicId);
    const existingLessonIds = curriculum.filter(item => item.type === LEARNING_UNIT.LESSON).map(item => item.id);
    setExcludedLessonIds(existingLessonIds);
    setIsLessonSelectorModalOpen(true);
  };

  useEffect(() => {
    if (lessonsToBeAdded.length && activeTopicForLesson) addLessonsToTopic();
  }, [lessonsToBeAdded]);

  const addLessonsToTopic = () => {
    setCurriculum(prev => {
      const topicIndex = prev.findIndex(item => item.id === activeTopicForLesson);
      if (topicIndex === -1) return prev;
      const nextTopicIndex = prev.findIndex((item, idx) => idx > topicIndex && item.type === LEARNING_UNIT.TOPIC);
      const lessonItems: DraggableTopicOrLesson[] = lessonsToBeAdded.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        type: LEARNING_UNIT.LESSON
      }));
      const insertIndex = nextTopicIndex !== -1 ? nextTopicIndex : prev.length;
      return [...prev.slice(0, insertIndex), ...lessonItems, ...prev.slice(insertIndex)];
    });
    setLessonsToBeAdded([]);
    setActiveTopicForLesson(null);
  };

  const updateTopicName = (topicId: string, name: string) => {
    setCurriculum(prev => prev.map(item => item.id === topicId ? { ...item, title: name } : item));
  };

  const deleteTopic = (topicId: string) => {
    // Also delete lessons under this topic
    setCurriculum(prev => {
        const topicIndex = prev.findIndex(item => item.id === topicId);
        if (topicIndex === -1) return prev;
        const nextTopicIndex = prev.findIndex((item, idx) => idx > topicIndex && item.type === LEARNING_UNIT.TOPIC);
        const endIndex = nextTopicIndex !== -1 ? nextTopicIndex : prev.length;
        return [...prev.slice(0, topicIndex), ...prev.slice(endIndex)];
    });
  };

  const deleteLesson = (lessonId: string) => {
    setCurriculum(prev => prev.filter(item => item.id !== lessonId));
  };

  // --- Save Function ---
  const saveCohort = async () => {
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Cohort title is required.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      // Unflatten curriculum into topics with lessons
      const topics: Topic[] = [];
      let currentTopic: Topic | null = null;
      for (const item of curriculum) {
        if (item.type === LEARNING_UNIT.TOPIC) {
          currentTopic = { id: item.id, title: item.title, items: [] };
          topics.push(currentTopic);
        } else if (item.type === LEARNING_UNIT.LESSON && currentTopic) {
          currentTopic.items.push({ id: item.id, title: item.title });
        }
      }

      // Prepare the cohort data object
      const cohortData = {
        title: title.trim(),
        description: description.trim(),
       price: price,
        startDate: startDate!,
        endDate: endDate!,
        enrollmentOpen,
        maxStudents,
        topics, // <-- This now includes the full curriculum structure
        // The service will add other fields like id, createdAt, etc.
      };

      console.log(cohortData)
      if (isEditMode && cohortId) {
        await cohortService.updateCohort(cohortId, cohortData);
        toast({ title: "Success", description: "Cohort updated successfully!" });
      } else {
        const newId = await cohortService.createCohort(cohortData);
        toast({ title: "Success", description: "Cohort created successfully!" });
        navigate(`/admin/cohort/${newId}`); 
      }
    } catch (error) {
      toast({ title: "Error", description: `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading Cohort Builder...</div>;

  return (
   <div className="min-h-screen bg-background text-foreground flex flex-col">
    {/* ✅ Shared Header */}
    <Header />

    <header className="border-b bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {isEditMode ? "Edit Cohort" : "Create New Cohort"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditMode
                ? cohort?.title
                : "Define the details and curriculum for a new cohort."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin")}
            className="w-full sm:w-auto"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="basics" className="w-full">
          <TabsList>
            <TabsTrigger value="basics">Basics & Enrollment</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          </TabsList>

          <TabsContent value="basics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader><CardTitle>Cohort Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input placeholder="e.g., Spring 2024 Evening Batch" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea placeholder="A brief description of this cohort." value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div>
  <label className="text-sm font-medium">Price</label>
  <Input
    type="number"
    placeholder="Enter price"
    value={price}
    onChange={(e) => setPrice(+e.target.value)}
  />
</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle>Dates</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <Input type="date" value={startDate?.toISOString().split("T")[0] || ""} onChange={(e) => setStartDate(e.target.valueAsDate)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      <Input type="date" value={endDate?.toISOString().split("T")[0] || ""} onChange={(e) => setEndDate(e.target.valueAsDate)} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Enrollment</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="enrollmentOpen" className="flex items-center gap-2 cursor-pointer">
                        {enrollmentOpen ? <Unlock className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-red-500" />}
                        <span>Enrollment Open</span>
                      </label>
                      <Checkbox id="enrollmentOpen" checked={enrollmentOpen} onCheckedChange={(checked) => setEnrollmentOpen(!!checked)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Students</label>
                      <Input type="number" placeholder="Unlimited" value={maxStudents ?? ""} onChange={(e) => setMaxStudents(e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <Button onClick={saveCohort} disabled={saving} className="mt-6 w-full md:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Cohort"}
            </Button>
          </TabsContent>

          <TabsContent value="curriculum">
            <Card>
              <CardHeader>
                <CardTitle>Cohort Curriculum</CardTitle>
                <div className="flex gap-4 mt-4">
                  <Button onClick={addTopic}><Plus className="mr-2 h-4 w-4" /> Add Topic</Button>
                  <Button onClick={saveCohort} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Cohort"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={curriculum.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {curriculum.map((item) => (
                        <SortableItem key={item.id} id={item.id} type={item.type}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-x-2 flex-1">
                              {item.type === LEARNING_UNIT.TOPIC && <FolderOpen className="h-5 w-5 text-primary" />}
                              {item.type === LEARNING_UNIT.LESSON && <BookOpen className="h-4 w-4 text-red-500" />}
                              {editingTopic === item.id && item.type === LEARNING_UNIT.TOPIC ? (
                                <Input
                                  value={newTopicName}
                                  onChange={(e) => setNewTopicName(e.target.value)}
                                  onBlur={() => { updateTopicName(item.id, newTopicName); setEditingTopic(null); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") { updateTopicName(item.id, newTopicName); setEditingTopic(null); }}}
                                  autoFocus
                                />
                              ) : (
                                <span>{item.title}</span>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.type === LEARNING_UNIT.TOPIC && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => addLesson(item.id)}><Plus className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => { setEditingTopic(item.id); setNewTopicName(item.title); }}><Edit2 className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteTopic(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </>
                              )}
                              {item.type === LEARNING_UNIT.LESSON && (
                                <Button variant="ghost" size="sm" onClick={() => deleteLesson(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              )}
                            </div>
                          </div>
                        </SortableItem>
                      ))}
                      {curriculum.length === 0 && <p className="text-center text-muted-foreground py-4">No curriculum yet. Click "Add Topic" to start building.</p>}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <LessonSelectorModal
        isOpen={isLessonSelectorModalOpen}
        onClose={() => setIsLessonSelectorModalOpen(false)}
        onConfirm={setLessonsToBeAdded}
        excludedLessonIds={excludedLessonIds}
      />
    </div>
  );
};

export default CohortBuilderPage;
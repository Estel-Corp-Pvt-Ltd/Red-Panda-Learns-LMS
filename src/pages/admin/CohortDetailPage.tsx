import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cohortService } from "@/services/cohortService";
import { Cohort, Topic, TopicItem } from "@/types/course"; // Import TopicItem too
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FolderOpen,
  BookOpen,
  ArrowLeft,
  Edit2,
  Save,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Users,
  Calendar,
  GripVertical, // For SortableItem
} from "lucide-react";
import { toDateSafe } from "@/utils/date-time";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// DND imports
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

// Your custom components/constants
import { LEARNING_UNIT } from "@/constants"; // Assuming LEARNING_UNIT enum is here
import { LearningUnit } from "@/types/general"; // Assuming LearningUnit type is here
import { LessonSelectorModal } from "@/components/admin/LessonSelectorModal"; // Assuming this modal exists
import { Lesson } from "@/types/lesson"; // Assuming Lesson type is here
import { serverTimestamp } from "firebase/firestore";

// --- Sortable Item Components (Reused from CurriculumBuilderPage) ---
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  type: LearningUnit;
}

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

const CohortDetailPage = () => {
  const { cohortId } = useParams();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false); // Controls overall edit mode
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state for basic details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [price,setPrice]=useState(0);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [enrollmentOpen, setEnrollmentOpen] = useState(true);
  const [maxStudents, setMaxStudents] = useState<number | undefined>(undefined);

  // Curriculum state (for DND and editing topics/lessons)
  const [curriculum, setCurriculum] = useState<DraggableTopicOrLesson[]>([]);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null); // To edit a topic title
  const [newTopicName, setNewTopicName] = useState("");

  // Lesson selection modal state
  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] = useState(false);
  const [activeTopicForLesson, setActiveTopicForLesson] = useState<string | null>(null); // To know which topic to add lessons to
  const [lessonsToBeAdded, setLessonsToBeAdded] = useState<Lesson[]>([]);
  const [excludedLessonIds, setExcludedLessonIds] = useState<string[]>([]); // To prevent adding duplicate lessons

  // DND sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Data Loading ---
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await cohortService.getCohortById(cohortId!);
        if (!data) throw new Error("Cohort not found");
        setCohort(data);
        console.log(data)
        // Initialize form state for basic details
        setTitle(data.title);
        setDescription(data.description || "");
        setPrice(data.price);

        
        // FIX: Convert Firestore Timestamps to JS Dates
        setStartDate(data.startDate && typeof (data.startDate as any).toDate === 'function' ? (data.startDate as any).toDate() : data.startDate);
        setEndDate(data.endDate && typeof (data.endDate as any).toDate === 'function' ? (data.endDate as any).toDate() : data.endDate);
        
        setEnrollmentOpen(data.enrollmentOpen);
        setMaxStudents(data.maxStudents);

        // Initialize curriculum state
        setCurriculum(getFlatCurriculum(data.topics || []));
      } catch (err) {
        toast({
          title: "Error",
          description: "Could not load cohort.",
          variant: "destructive",
        });
        navigate("/admin");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cohortId, navigate, toast]);

  // --- Curriculum Helper Functions (from CurriculumBuilderPage) ---
  const getFlatCurriculum = (topics: Topic[]): DraggableTopicOrLesson[] => {
    return topics.flatMap(topic => [
      { id: topic.id, type: LEARNING_UNIT.TOPIC, title: topic.title },
      ...topic.items.map(lesson => ({
        id: lesson.id,
        type: LEARNING_UNIT.LESSON,
        title: lesson.title,
      }))
    ]);
  };

  const unflattenCurriculum = (flatCurriculum: DraggableTopicOrLesson[]): Topic[] => {
    const topics: Topic[] = [];
    let currentTopic: Topic | null = null;

    for (const item of flatCurriculum) {
      if (item.type === LEARNING_UNIT.TOPIC) {
        currentTopic = { id: item.id, title: item.title, items: [] };
        topics.push(currentTopic);
      } else if (item.type === LEARNING_UNIT.LESSON && currentTopic) {
        currentTopic.items.push({ id: item.id, title: item.title });
      }
    }
    return topics;
  };

  // --- DND Handler ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = curriculum.findIndex(i => i.id === active.id);
    const newIndex = curriculum.findIndex(i => i.id === over.id);

    // Safety checks: don't allow a lesson to be placed at the root level before a topic
    if (curriculum[oldIndex]?.type === LEARNING_UNIT.LESSON && newIndex === 0) {
      toast({
        title: "Invalid Move",
        description: "Lessons cannot be placed before the first topic.",
        variant: "destructive",
      });
      return;
    }
    // Block move entirely if the first item (which must be a topic) is being moved
    if (curriculum[0]?.type === LEARNING_UNIT.TOPIC && active.id === curriculum[0].id && newIndex !== 0) {
        toast({
            title: "Invalid Move",
            description: "The first item must always be a topic.",
            variant: "destructive",
        });
        return;
    }


    setCurriculum(prev => arrayMove(prev, oldIndex, newIndex));
  };

  // --- Topic/Lesson Management ---
  const addTopic = () => {
    const newTopicId = `topic-${Date.now()}`; // Ensure unique ID
    const newTopic: DraggableTopicOrLesson = { id: newTopicId, title: "New Topic", type: LEARNING_UNIT.TOPIC };
    setCurriculum(prev => [...prev, newTopic]);
    setEditingTopicId(newTopicId); // Automatically start editing new topic
    setNewTopicName(newTopic.title);
  };

  const updateTopicTitle = (topicId: string, name: string) => {
    setCurriculum(prev =>
      prev.map(item =>
        item.id === topicId ? { ...item, title: name } : item
      )
    );
    setEditingTopicId(null); // Exit editing mode
  };

  const deleteTopic = (topicId: string) => {
    // Also delete lessons that belong to this topic
    setCurriculum(prev => {
      const topicIndex = prev.findIndex(item => item.id === topicId);
      if (topicIndex === -1) return prev;

      // Find the index of the next topic or the end of the array
      let endIndex = prev.length;
      for (let i = topicIndex + 1; i < prev.length; i++) {
        if (prev[i].type === LEARNING_UNIT.TOPIC) {
          endIndex = i;
          break;
        }
      }
      return [...prev.slice(0, topicIndex), ...prev.slice(endIndex)];
    });
  };

  const addLesson = (topicId: string) => {
    setActiveTopicForLesson(topicId);
    // Get all lesson IDs already in the curriculum
    const existingLessonIds = curriculum
      .filter(item => item.type === LEARNING_UNIT.LESSON)
      .map(item => item.id);
    setExcludedLessonIds(existingLessonIds);
    setIsLessonSelectorModalOpen(true);
  };

  // Effect to add lessons after modal confirmation
  useEffect(() => {
    if (lessonsToBeAdded.length > 0 && activeTopicForLesson) {
      setCurriculum(prev => {
        const topicIndex = prev.findIndex(item => item.id === activeTopicForLesson);
        if (topicIndex === -1) return prev;

        const existingLessonIdsInCurriculum = new Set(
          prev.filter(item => item.type === LEARNING_UNIT.LESSON).map(item => item.id)
        );

        const nextTopicIndex = prev.findIndex(
          (item, idx) => idx > topicIndex && item.type === LEARNING_UNIT.TOPIC
        );

        const lessonItems: DraggableTopicOrLesson[] = lessonsToBeAdded
          .filter(lesson => !existingLessonIdsInCurriculum.has(lesson.id)) // Filter out already added lessons
          .map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            type: LEARNING_UNIT.LESSON
          }));

        let insertIndex = nextTopicIndex !== -1 ? nextTopicIndex : prev.length;

        return [...prev.slice(0, insertIndex), ...lessonItems, ...prev.slice(insertIndex)];
      });

      setLessonsToBeAdded([]);
      setActiveTopicForLesson(null);
    }
  }, [lessonsToBeAdded, activeTopicForLesson]);


  const deleteLesson = (lessonId: string) => {
    setCurriculum(prev => prev.filter(item => item.id !== lessonId));
  };


  // --- Save Function ---
  const handleSave = async () => {
    if (!cohortId || !cohort) return;

    // Basic validation
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Cohort title is required.", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Validation Error", description: "Start and End dates are required.", variant: "destructive" });
      return;
    }
    if (startDate > endDate) {
        toast({ title: "Validation Error", description: "End Date cannot be before Start Date.", variant: "destructive" });
        return;
    }
    // Also validate curriculum: must have at least one topic
    if (curriculum.filter(item => item.type === LEARNING_UNIT.TOPIC).length === 0) {
        toast({ title: "Validation Error", description: "Cohort must have at least one topic.", variant: "destructive" });
        return;
    }


    try {
      setSaving(true);

      // Unflatten curriculum for saving
      const updatedTopics = unflattenCurriculum(curriculum);

      // Prepare data for update
      const cohortUpdateData = {
        title: title.trim(),
        description: description.trim(),
        price: price,
        startDate,
        endDate,
        enrollmentOpen,
        maxStudents,
        topics: updatedTopics, // Save the updated curriculum
      };

      await cohortService.updateCohort(cohortId, cohortUpdateData);
      console.log(cohortUpdateData)
      // Update local cohort state to reflect saved changes
      setCohort(prev => prev ? { ...prev, ...cohortUpdateData, updatedAt: serverTimestamp() } : null);
      setEditing(false); // Exit edit mode
      
      toast({
        title: "Success",
        description: "Cohort updated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Cancel Edit ---
  const handleCancel = () => {
  if (!cohort) return;

  // Reset form state to original cohort data
  setTitle(cohort.title);
  setDescription(cohort.description || "");
  setPrice(cohort.price);
  setStartDate(toDateSafe(cohort.startDate));
  setEndDate(toDateSafe(cohort.endDate));
setEnrollmentOpen(cohort.enrollmentOpen ?? false);
  setMaxStudents(cohort.maxStudents);

  // Reset curriculum state to original cohort data
  setCurriculum(getFlatCurriculum(cohort.topics || []));
  setEditingTopicId(null);
  setNewTopicName("");

  setEditing(false); // Exit edit mode
};

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading cohort...</p>
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Cohort not found</h2>
          <Button onClick={() => navigate("/admin")}>Back to Cohorts</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Matches your builder theme */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Cohorts
              </Button>
              <div>
                <h1 className="text-3xl font-bold">
                  {editing ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                    />
                  ) : (
                    cohort.title
                  )}
                </h1>
                <p className="text-muted-foreground mt-1">Cohort Details</p>
              </div>
            </div>

            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Cohort
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editing ? (
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter cohort description"
                        className="min-h-32"
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        {description || "No description provided"}
                      </p>
                    )}
                  </CardContent>

                   <CardHeader>
                    <CardTitle>Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editing ? (
                      <Textarea
                        value={price}
                        onChange={(e) => setPrice(+e.target.value)}
                        placeholder="Enter cohort Price"
                        className="min-h-32"
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        {price || "No Price "}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      {editing ? (
                        <Input
                          type="date"
                          value={startDate ? format(new Date(startDate), "yyyy-MM-dd") : ""}
                          onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                        />
                      ) : (
                        <p>{startDate ? format(new Date(startDate), "MMM d, yyyy") : "No start date"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      {editing ? (
                        <Input
                          type="date"
                          value={endDate ? format(new Date(endDate), "yyyy-MM-dd") : ""}
                          onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                        />
                      ) : (
                        <p>{endDate ? format(new Date(endDate), "MMM d, yyyy") : "No end date"}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Enrollment Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {enrollmentOpen ? (
                            <Unlock className="h-5 w-5 text-green-600" />
                          ) : (
                            <Lock className="h-5 w-5 text-red-600" />
                          )}
                          <label className="text-base font-medium">Enrollment Open</label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Allow new students to enroll
                        </p>
                      </div>
                      {editing ? (
                        <Checkbox
                          checked={enrollmentOpen}
                          onCheckedChange={(checked) => setEnrollmentOpen(!!checked)}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {enrollmentOpen ? "Yes" : "No"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Students</label>
                      {editing ? (
                        <Input
                          type="number"
                          placeholder="Unlimited"
                          value={maxStudents ?? ""}
                          onChange={(e) => setMaxStudents(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      ) : (
                        <p>{maxStudents ? maxStudents : "Unlimited"}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* CURRICULUM TAB */}
          <TabsContent value="curriculum">
            <Card>
              <CardHeader>
                <CardTitle>Cohort Curriculum </CardTitle>
                <div className="flex gap-4 mt-4">
                  {editing && (
                    <Button onClick={addTopic}><Plus className="mr-2 h-4 w-4" /> Add Topic</Button>
                  )}
                  {/* Save button is already in the main header, linking it here for clarity */}
                  {!editing && curriculum.length === 0 && (
                    <p className="text-muted-foreground">No curriculum added yet.</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={curriculum.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {curriculum.length === 0 && !editing ? (
                        <p className="text-muted-foreground text-center py-6">
                          No curriculum defined for this cohort. Click "Edit Cohort" to add topics.
                        </p>
                      ) : curriculum.length === 0 && editing ? (
                         <p className="text-muted-foreground text-center py-6">
                          Click "Add Topic" to start building your cohort's curriculum.
                        </p>
                      ) : (
                        curriculum.map((item) => (
                          <SortableItem key={item.id} id={item.id} type={item.type}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-x-2 flex-1">
                                {item.type === LEARNING_UNIT.TOPIC && (
                                  <FolderOpen className="h-5 w-5 text-primary" />
                                )}
                                {item.type === LEARNING_UNIT.LESSON && (
                                  <BookOpen className="h-4 w-4 text-red-500" />
                                )}

                                {editing && editingTopicId === item.id && item.type === LEARNING_UNIT.TOPIC ? (
                                  <Input
                                    value={newTopicName}
                                    onChange={(e) => setNewTopicName(e.target.value)}
                                    onBlur={() => updateTopicTitle(item.id, newTopicName)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        updateTopicTitle(item.id, newTopicName);
                                      }
                                    }}
                                    className="flex-1"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="flex-1">{item.title}</span>
                                )}
                              </div>

                              {editing && (
                                <div className="flex gap-1">
                                  {item.type === LEARNING_UNIT.TOPIC && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => addLesson(item.id)}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingTopicId(item.id);
                                          setNewTopicName(item.title);
                                        }}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteTopic(item.id)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {item.type === LEARNING_UNIT.LESSON && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteLesson(item.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </SortableItem>
                        ))
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Lesson Selector Modal */}
      <LessonSelectorModal
        isOpen={isLessonSelectorModalOpen}
        onClose={() => setIsLessonSelectorModalOpen(false)}
        onConfirm={setLessonsToBeAdded}
        excludedLessonIds={excludedLessonIds}
      />
    </div>
  );
};

export default CohortDetailPage;

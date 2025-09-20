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
  FileText,
  Edit2,
  Trash2,
  GripVertical,
  Upload,
  Save,
  BookOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { courseService } from "@/services/courseService";
import { Course, Topic, TopicItem } from "@/types/course";
import { LessonSelectorModal } from "@/components/admin/LessonSelectorModal";
import { Lesson } from "@/types/lesson";
import { CourseImporterModal } from "@/components/admin/CourseImporterModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COURSE_STATUS, LEARNING_UNIT } from "@/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { CourseStatus, LearningUnit } from "@/types/general";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authorService } from "@/services/authorService";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft:
      String(type).toLowerCase() === String(LEARNING_UNIT.LESSON).toLowerCase()
        ? "2rem"
        : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={`flex items-center gap-3 p-3 rounded-md border bg-card hover:shadow-sm transition-shadow group${type === LEARNING_UNIT.LESSON ? ' ml-[3px]' : ''}`}
      >
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground " />
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
  const [curriculum, setCurriculum] = useState<DraggableTopicOrLesson[]>([]);
  const [importedCurriculum, setImportedCurriculum] = useState<DraggableTopicOrLesson[]>([]);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");
  const [lessonsToBeAdded, setLessonsToBeAdded] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLessonSelectorModalOpen, setIsLessonSelectorModalOpen] = useState(false);
  const [isCourseImporterModalOpen, setIsCourseImporterModalOpen] = useState(false);
  const [activeTopicForLesson, setActiveTopicForLesson] = useState<string | null>(null);
  // for lessons that have been added already
  const [excludedLessonIds, setExcludedLessonIds] = useState<string[]>([]);
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [status, setStatus] = useState<CourseStatus>(course?.status || COURSE_STATUS.DRAFT);
  const [regularPrice, setRegularPrice] = useState(course?.regularPrice || 0);
  const [salePrice, setSalePrice] = useState(course?.salePrice || 0);
  const [categories, setCategories] = useState<string[]>(course?.categories || []);
  const [tags, setTags] = useState<string[]>(course?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authors, setAuthors] = useState<{ id: string; name: string }[]>([]);

  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    if (!courseId) {
      toast({
        title: "Error",
        description: "No course ID provided.",
        variant: "destructive",
      });
      return;
    }

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
      setRegularPrice(courseData.regularPrice);
      setSalePrice(courseData.salePrice);
      setCategories(courseData.categories);
      setTags(courseData.tags);
      setAuthorId(courseData.authorId);
      setAuthorName(courseData.authorName);
      setCurriculum(getFlatCurriculum(courseData.topics) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load course data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const data = await authorService.getAllAuthors();
        setAuthors(data.map(author => ({ name: author.firstName + " " + author.middleName + " " + author.lastName, id: author.id })));
      } catch (error) {
        console.error("Failed to fetch authors:", error);
        toast({
          title: "Error",
          description: "Could not load authors list.",
          variant: "destructive",
        });
      }
    };
    fetchAuthors();
  }, [toast]);

  const getFlatCurriculum = (curriculum: Topic[]) => {
    return curriculum.flatMap(topic => [
      { id: topic.id, type: LEARNING_UNIT.TOPIC, title: topic.title },
      ...topic.items.map(lesson => ({
        id: lesson.id,
        type: LEARNING_UNIT.LESSON,
        title: lesson.title,
      }))
    ]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const flat = curriculum;
    const oldIndex = flat.findIndex(i => i.id === active.id);
    const newIndex = flat.findIndex(i => i.id === over.id);

    // Safety check: don't allow a lesson to be placed at the root level before a topic
    if (flat[oldIndex]?.type === LEARNING_UNIT.LESSON && newIndex === 0) {
      return;
    }

    const firstItem = flat[0];
    if (firstItem.type === LEARNING_UNIT.TOPIC && active.id === firstItem.id) {
      return; // Block move entirely
    }

    const reorderedFlat = arrayMove(flat, oldIndex, newIndex);
    setCurriculum(reorderedFlat);
  };

  const addTopic = () => {
    const newTopic: DraggableTopicOrLesson = {
      id: `${Date.now()}`,
      title: "New Topic",
      type: LEARNING_UNIT.TOPIC
    };
    setCurriculum(prev => [...prev, newTopic]);
    setEditingTopic(newTopic.id);
    setNewTopicName(newTopic.title);
  };

  const addLesson = (topicId: string) => {
    setActiveTopicForLesson(topicId);
    const existingLessonIds = curriculum
      .filter(item => item.type === LEARNING_UNIT.LESSON)
      .map(item => item.id);
    setExcludedLessonIds(existingLessonIds);
    setIsLessonSelectorModalOpen(true);
  };

  useEffect(() => {
    if (lessonsToBeAdded.length && activeTopicForLesson)
      addLessonsToTopic();
  }, [lessonsToBeAdded]);

  useEffect(() => {
    if (importedCurriculum.length > 0) {
      setCurriculum(prev => [...prev, ...importedCurriculum]);
      setImportedCurriculum([]);
    }
  }, [importedCurriculum]);

  const addLessonsToTopic = () => {
    setCurriculum(prev => {
      const topicIndex = prev.findIndex(item => item.id === activeTopicForLesson);
      if (topicIndex === -1) return prev;

      const existingLessonIds = new Set(
        prev.filter(item => item.type === LEARNING_UNIT.LESSON).map(item => item.id)
      );

      // Find the next topic’s index after the active one
      const nextTopicIndex = prev.findIndex(
        (item, idx) => idx > topicIndex && item.type === LEARNING_UNIT.TOPIC
      );

      // Build the lesson objects
      const lessonItems: DraggableTopicOrLesson[] = lessonsToBeAdded
        .filter(lesson => !existingLessonIds.has(lesson.id))
        .map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          type: LEARNING_UNIT.LESSON
        }));

      let insertIndex = nextTopicIndex !== -1 ? nextTopicIndex : prev.length;

      // Insert lessons before the next topic (or at the end)
      const updated = [
        ...prev.slice(0, insertIndex),
        ...lessonItems,
        ...prev.slice(insertIndex)
      ];

      return updated;
    });

    // Reset
    setLessonsToBeAdded([]);
    setActiveTopicForLesson(null);
  };

  const updateTopicName = (topicId: string, name: string) => {
    setCurriculum(prev =>
      prev.map(topic =>
        topic.id === topicId ? { ...topic, title: name } : topic
      )
    );
  };

  const deleteTopic = (topicId: string) => {
    setCurriculum(prev => prev.filter(topic => topic.id !== topicId));
  };

  const deleteLesson = (lessonId: string) => {
    setCurriculum(prev =>
      prev.filter(item => item.id !== lessonId)
    );
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
      setSaving(true);

      // ✅ Unflatten curriculum into topics with lessons inside `items`
      const topics: Topic[] = [];
      let currentTopic: Topic | null = null;

      for (let i = 0; i < curriculum.length; i++) {
        const item = curriculum[i];

        if (item.type === LEARNING_UNIT.TOPIC) {
          // Start a new topic
          currentTopic = {
            id: item.id,
            title: item.title,
            items: []
          };
          topics.push(currentTopic);
        } else if (item.type === LEARNING_UNIT.LESSON && currentTopic) {
          // Add lesson to current topic
          const lesson: TopicItem = {
            id: item.id,
            title: item.title
          };
          currentTopic.items.push(lesson);
        }
      }

      // ✅ Create updated course object
      const updatedCourse: Course = {
        ...course,
        topics,
        updatedAt: new Date(),
      };

      console.log("Saving curriculum:", updatedCourse);

      await courseService.updateCourse(courseId, updatedCourse);

      toast({
        title: "Success",
        description: "Curriculum saved!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          `Failed to save: ${error instanceof Error ? error.message : "Unknown error"
          }`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveBasics = async () => {
    if (!courseId || !course) {
      toast({
        title: "Error",
        description: "Course data is not available.",
        variant: "destructive",
      });
      return;
    }

    // ✅ Basic checks before saving
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a course title.",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Missing Description",
        description: "Please enter a course description.",
        variant: "destructive",
      });
      return;
    }

    if (regularPrice < 0 || salePrice < 0) {
      toast({
        title: "Invalid Price",
        description: "Prices cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    if (salePrice > regularPrice) {
      toast({
        title: "Invalid Pricing",
        description: "Sale price cannot be greater than regular price.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const updatedCourse: Course = {
        ...course,
        title: title.trim(),
        description: description.trim(),
        status,
        authorId,
        authorName,
        regularPrice,
        salePrice,
        categories,
        tags
      };

      await courseService.updateCourse(courseId, updatedCourse);

      toast({
        title: "Success",
        description: "Course basics saved!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save: ${error instanceof Error ? error.message : "Unknown error"
          }`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading course curriculum...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Course not found</h2>
          <Button onClick={() => navigate("/admin")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{course.title}</h1>
              <p className="text-muted-foreground mt-1">Curriculum Builder</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/admin")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="basics" className="w-full">
          <TabsList>
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
          </TabsList>

          <TabsContent value="basics">
            <div className="grid grid-cols-3 gap-6 h-[calc(100vh-120px)]">
              {/* Left column (2/3) */}
              <div className="col-span-2 space-y-6 sticky top-0 self-start h-fit">
                <Card>
                  <CardHeader>
                    <CardTitle>Title</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      placeholder="Enter course title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full h-40 p-3 border rounded-md"
                      placeholder="Enter course description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </CardContent>
                </Card>

                <Button
                  className="w-full"
                  onClick={saveBasics}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Basics"}
                </Button>
              </div>

              {/* Right column (1/3) */}
              <div className="col-span-1 space-y-6 overflow-y-auto pr-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      className="w-full border rounded-md p-2"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as CourseStatus)}
                    >
                      {Object.values(COURSE_STATUS).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Regular Price</label>
                      <Input
                        type="number"
                        placeholder="Enter regular price"
                        value={regularPrice}
                        onChange={(e) => setRegularPrice(Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Sale Price</label>
                      <Input
                        type="number"
                        placeholder="Enter sale price"
                        value={salePrice}
                        onChange={(e) => setSalePrice(Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {["AI/ML", "Bootcamp", "College-student", "Data-Science", "Generative-AI"].map(
                        (category) => (
                          <label
                            key={category}
                            className="flex items-center space-x-3 rounded-lg border p-2 hover:bg-muted cursor-pointer"
                          >
                            <Checkbox
                              id={category}
                              checked={categories.includes(category)}
                              onCheckedChange={() => toggleCategory(category)}
                            />
                            <span className="text-sm font-medium">{category}</span>
                          </label>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Input for adding tags */}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Type a tag and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tagInput.trim()) {
                            e.preventDefault();
                            if (!tags.includes(tagInput.trim())) {
                              setTags([...tags, tagInput.trim()]);
                            }
                            setTagInput("");
                          }
                        }}
                      />
                    </div>

                    {/* Display tags with remove option */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tags.map((tag, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-gray-200 text-sm px-3 py-1 rounded-full"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setTags(tags.filter((_, i) => i !== index))
                            }
                            className="text-gray-500 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Author</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={authorName}
                      onValueChange={(val) => {
                        const selected = authors.find((a) => a.name === val);
                        setAuthorId(selected.id || "");
                        setAuthorName(val);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an author" />
                      </SelectTrigger>
                      <SelectContent>
                        {authors.map((a) => (
                          <SelectItem key={a.id} value={a.name}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

              </div>
            </div>
          </TabsContent>

          <TabsContent value="curriculum">
            <Card>
              <CardHeader>
                <CardTitle>Course Curriculum </CardTitle>
                <div className="flex gap-4 mt-4">
                  <Button variant="outline" onClick={() => setIsCourseImporterModalOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Import
                  </Button>
                  <Button onClick={addTopic}>
                    <Plus className="mr-2 h-4 w-4" /> Add Topic
                  </Button>
                  <Button
                    onClick={saveCurriculumStructure}
                    disabled={saving}
                    className="bg-success hover:bg-success/90"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
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
  {curriculum.map((item) => {
    console.log("Rendering item:", item); // 🔍 Debugging line

    const itemType = item.type.toLowerCase();
    const topicType = LEARNING_UNIT.TOPIC.toLowerCase();
    const lessonType = LEARNING_UNIT.LESSON.toLowerCase();

    return (
      <SortableItem key={item.id} id={item.id} type={item.type}>
        <div className="flex items-center justify-between w-full  ">
           <div className="flex items-center gap-x-2 flex-1 translate-x-2">
    {itemType === topicType && (
      <FolderOpen className="h-5 w-5 text-primary" />
    )}
    {itemType === lessonType && (
     
  <BookOpen className="h-4 w-4 text-red-500 " />
     
    )}

            {editingTopic === item.id.replace("topic-", "") &&
            itemType === topicType ? (
              <Input
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onBlur={() => {
                  updateTopicName(item.id.replace("topic-", ""), newTopicName);
                  setEditingTopic(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateTopicName(
                      item.id.replace("topic-", ""),
                      newTopicName
                    );
                    setEditingTopic(null);
                  }
                }}
                className="flex-1"
                autoFocus
              />
            ) : (
              <span className="flex-1 " >{item.title}</span>
            )}
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {itemType === topicType && (
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
                    setEditingTopic(item.id.replace("topic-", ""));
                    setNewTopicName(item.title);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTopic(item.id.replace("topic-", ""))}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {itemType === lessonType && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteLesson(item.id.replace("lesson-", ""))}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SortableItem>
    );
  })}
</div>



                
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Additional tab (empty for now) */}
          <TabsContent value="additional">
            <Card>
              <CardHeader>
                <CardTitle>Additional</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Leave empty for now */}
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

      <CourseImporterModal
        currentCourseId={courseId}
        currentCurriculum={curriculum}
        isOpen={isCourseImporterModalOpen}
        onConfirm={setImportedCurriculum}
        onClose={() => setIsCourseImporterModalOpen(false)}
      />
    </div>
  );
};

export default CurriculumBuilderPage;

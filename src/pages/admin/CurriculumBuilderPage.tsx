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
  ArrowLeft
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
import { serverTimestamp } from "firebase/firestore";
import { imageService } from "@/services/imageService";
import { getDownloadURL } from "firebase/storage";

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

const CurriculumBuilderPage = () => {
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
  const [categories, setCategories] = useState<string[]>([]);
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
      setThumbnailUrl(courseData.thumbnail || "");
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

        // If the course's author isn’t in the fetched list, add them
        setAuthors(prev => {
          const exists = formattedAuthors.some(a => a.id === authorId);
          return exists || !authorId
            ? formattedAuthors
            : [{ id: authorId, name: authorName }, ...formattedAuthors];
        });
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
  }, [toast, authorId, authorName]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file!", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadThumbnail = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please choose an image before uploading.",
        variant: "destructive",
      });
      return;
    }

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

    const uploadTask = imageService.uploadImage(`/courses/${courseId}/thumbnail.png`, selectedFile);
    if (!uploadTask) {
      toast({
        title: "Upload Failed",
        description: "Unable to upload the file. Please try again.",
        variant: "destructive",
      });
      return;
    }

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        setUploading(true);
        // Calculate progress
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(prog));
      }, (error) => {
        console.error(error);
        setUploading(false);
      },
      async () => {
        try {
          setProgress(100);
          setUploading(false);
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setThumbnailUrl(url);
          toast({
            title: "Thumbnail Uploaded",
            description: "Thumbnail has been successfully uploaded",
            variant: "default",
          });
        } catch (error) {
          console.error("Error getting download URL:", error);
        }
      });
  }

  const saveBasics = async () => {
    if (!courseId || !course) return;
    if (!title.trim()) {
      toast({ title: "Missing Title", description: "Enter a course title.", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Missing Description", description: "Enter a description.", variant: "destructive" });
      return;
    }
    if (regularPrice < 0 || salePrice < 0 || salePrice > regularPrice) {
      toast({ title: "Pricing Error", description: "Check regular / sale price.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      await courseService.updateCourse(courseId, {
        title: title.trim(),
        description: description.trim(),
        regularPrice,
        thumbnail: thumbnailUrl,
        salePrice,
        categories,
        tags,
        authorId,
        authorName,
        status,
      });
      toast({ title: "Saved", description: "Basics updated." });
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCurriculum(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const addItem = (type: LearningUnit, parentId: string | null = null, depth = 0) => {
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

  const addLessonToParent = (parentId: string) => {
    setActiveParentId(parentId);
    setIsLessonSelectorModalOpen(true);
  };

  const addTopicToCohort = (cohortId: string, cohortDepth: number) => {
    addItem(LEARNING_UNIT.TOPIC, cohortId, cohortDepth + 1);
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

  // --------------------------------------------------------------------
  // drop-in replacement for the old handler
  const handleImportCohorts = (importedCohorts: Cohort[]) => {
    const flatRows = importedCohorts.flatMap(flattenCohort);

    // filter out any duplicates that are already in curriculum
    const existingIds = new Set(curriculum.map((r) => r.id));

    setCurriculum((prev) => [
      ...prev,
      ...flatRows.filter((row) => !existingIds.has(row.id)),
    ]);

    setIsCohortImporterModalOpen(false);
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
          if (item.type === LEARNING_UNIT.COHORT) {
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
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              startDate: serverTimestamp(),
              endDate: serverTimestamp(),
              enrollmentOpen: true,
              price: 1000
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

        <Tabs defaultValue="basics" className="w-full">

          {/* Tab buttons ----------------------------------------------------- */}
          <TabsList>
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
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
                    {uploading && (
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
                      <Button className="border px-5 py-2" onClick={uploadThumbnail} disabled={uploading || !preview}>{!preview ? "Uploaded" : "Upload"}</Button>
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
                        value={authorName}
                        onValueChange={(val) => {
                          const a = authors.find((x) => x.name === val);
                          setAuthorName(val);
                          setAuthorId(a?.id || "");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select instructor" />
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
                  {/* Categories */}
                  <Card className="rounded-xl border p-4">
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
                              onClick={() => setTags(tags.filter((x) => x !== t))}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {/* ───────── RIGHT SIDE (Pricing, Status) ───────── */}
              <div className="space-y-6">
                {/* Pricing */}
                <Card className="rounded-xl border p-4">
                  <div className="flex gap-4">
                    <Button onClick={saveBasics} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save Basics"}
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/admin")} >
                      <ArrowLeft className="mr-2 h-4 w-3" />
                      {"Back to Courses"}
                    </Button>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Regular price</label>
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
                  Course Curriculum & Cohorts
                </CardTitle>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCohortImporterModalOpen(true)}
                    className="flex items-center gap-1"
                  >
                    <Upload className="h-4 w-4" />
                    Import Cohort
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => addItem(LEARNING_UNIT.TOPIC)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
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
                                    onClick={() => addTopicToCohort(item.id, item.depth)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Add Topic to Cohort"
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
      <CohortImporterModal
        isOpen={isCohortImporterModalOpen}
        onClose={() => setIsCohortImporterModalOpen(false)}
        onConfirm={handleImportCohorts}
        excludedCohortIds={curriculum.filter(i => i.type === LEARNING_UNIT.COHORT).map(i => i.id)}
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
        }}
        excludedLessonIds={curriculum.filter(i => i.type === LEARNING_UNIT.LESSON).map(l => l.id)}
      />
    </div>
  );
};

export default CurriculumBuilderPage;

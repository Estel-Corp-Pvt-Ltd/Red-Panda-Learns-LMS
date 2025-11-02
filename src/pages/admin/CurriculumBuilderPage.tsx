// src/pages/admin/CurriculumBuilderPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import CourseBasicsTab from "@/components/admin/CourseBasicsTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // not from @radix directly
import { useToast } from "@/hooks/use-toast";
import { useLoadingOverlay } from "@/contexts/LoadingOverlayContext";
import { courseService } from "@/services/courseService";
import { attributeService } from "@/services/attributeService";
import { instructorService } from "@/services/instructorService";
import { getFullName } from "@/utils/name";
import { ATTRIBUTE_TYPE, COURSE_STATUS } from "@/constants";
import type { Course } from "@/types/course";
import type { CourseStatus } from "@/types/general";
import type { DurationForm } from "@/components/admin/CourseBasicsTab";

const toNumberOrNull = (val: string) => (val === "" ? null : Number(val));
const isNum = (v: number | null): v is number => v !== null && Number.isFinite(v);

const CurriculumBuilderPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showOverlay, hideOverlay } = useLoadingOverlay();

  // ─── Course data and state ──────────────────────────────────────────────────
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CourseStatus>(COURSE_STATUS.DRAFT);
  const [regularPrice, setRegularPrice] = useState<number | null>(0);
  const [salePrice, setSalePrice] = useState<number | null>(0);
  const [duration, setDuration] = useState<DurationForm>({ hours: 0, minutes: 0 });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<string[]>([]);
  const [allTargetAudiences, setAllTargetAudiences] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [progress, setProgress] = useState(0);

  // ─── Lifecycle: fetch attributes and instructors ───────────────────────────
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const categories = await attributeService.getAttributes(ATTRIBUTE_TYPE.CATEGORY);
        setAllCategories(categories.map((a) => a.name));
        const audiences = await attributeService.getAttributes(ATTRIBUTE_TYPE.TARGET_AUDIENCE);
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

  useEffect(() => {
    const fetchInstructors = async () => {
      const result = await instructorService.getAllInstructors();
      if (result.success) {
        setInstructors(
          result.data.map((i) => ({
            id: i.id,
            name: getFullName(i.firstName, i.middleName, i.lastName),
          })),
        );
      }
    };
    fetchInstructors();
  }, []);

  // ─── Fetch course data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!courseId) return;
    const loadCourse = async () => {
      try {
        setPreview(null);
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

  // ─── Handle thumbnail upload (stub implementation) ────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setThumbnailUrl(preview || "");
  };

  // ─── Save basics ───────────────────────────────────────────────────────────
  const canSaveBasics =
    title.trim() &&
    description.trim() &&
    isNum(regularPrice) &&
    isNum(salePrice) &&
    isNum(duration.hours) &&
    isNum(duration.minutes);

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
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      hideOverlay();
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="basics" className="w-full">
          <TabsList>
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          </TabsList>

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
        </Tabs>
      </main>
    </div>
  );
};

export default CurriculumBuilderPage;
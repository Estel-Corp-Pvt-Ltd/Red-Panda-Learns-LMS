import { Header } from "@/components/Header";
import type { DurationForm } from "@/components/admin/CourseBasicsTab";
import CourseBasicsTab from "@/components/admin/CourseBasicsTab";
import CurriculumTab from "@/components/admin/CurriculumTab";
import QuizTab from "@/components/admin/QuizTab";
import AdditionalTab from "@/components/admin/AdminCourseAdditionalTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ATTRIBUTE_TYPE, COURSE_STATUS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useLoadingOverlay } from "@/contexts/LoadingOverlayContext";
import { useToast } from "@/hooks/use-toast";
import { attributeService } from "@/services/attributeService";
import { courseService } from "@/services/courseService";
import { fileService } from "@/services/fileService";
import { instructorService } from "@/services/instructorService";
import type { Course } from "@/types/course";
import type { CourseStatus, LearningUnit } from "@/types/general";
import { logError } from "@/utils/logger";
import { getFullName } from "@/utils/name";
import { getDownloadURL } from "firebase/storage";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

/** Type guard for numeric checks */
const isNum = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

// ─────────────────────────────────────────────────────────────────────────────
// ─── Main Component ──────────────────────────────────────────────────────────

const CurriculumBuilderPage = () => {
  // ─── Router + Utils ─────────────────────────────────────────────
  const { param } = useParams();
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

  const { user } = useAuth();
  const location = useLocation();
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
  const [slug, setSlug] = useState("");
  const [courseId, setCourseId] = useState("");
  const [copied, setCopied] = useState(false);
  const [isMailSendingEnabled, setIsMailSendingEnabled] = useState(false);
  const [isCertificateEnabled, setIsCertificateEnabled] = useState(false);
  const [isForumEnabled, setIsForumEnabled] = useState(false);
  const [isWelcomeMessageEnabled, setIsEnrollAnnouncementEnabled] = useState(false);
  const [customCertificateName, setCustomCertificateName] = useState("");
  const [isCourseCompletionEnabled, setIsCourseCompletionEnabled] = useState(false);
  const itemId = new URLSearchParams(location.search).get("itemId");
  const [activeTab, setActiveTab] = useState("basics");

  // Handle URL parameters to switch to curriculum tab

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get("itemId");

    if (itemId) {
      setActiveTab("curriculum");
    }
  }, [location.search]);
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
    if (!param) return;
    const loadCourse = async () => {
      try {
        let data = await courseService.getCourseById(param);

        if (!data) {
          console.warn("Course not found for CourseId:", param);
          return;
        }

        setCourse(data);
        setCourseId(data.id);
        setTitle(data.title);
        setDescription(data.description);
        setSlug(data.slug ? `${data.slug}` : `${data.id ?? courseId}`);
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
        setIsMailSendingEnabled(data.isMailSendingEnabled ?? false);
        setIsCertificateEnabled(data.isCertificateEnabled ?? false);
        setIsForumEnabled(data.isForumEnabled ?? false);
        setIsEnrollAnnouncementEnabled(data.isWelcomeMessageEnabled ?? false);
        setCustomCertificateName(
          data.customCertificateName || data.title || ""
        );
        setIsCourseCompletionEnabled(data.isCourseCompletionEnabled ?? false);
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
  }, [param]);

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

  // Add a save function for additional settings:
  const saveAdditionalSettings = async () => {
    if (!courseId) return;
    try {
      showOverlay("Saving additional settings...");
      await courseService.updateCourse(courseId, {
        isMailSendingEnabled,
        isCertificateEnabled,
        isForumEnabled,
        isWelcomeMessageEnabled,
        customCertificateName,
        isCourseCompletionEnabled,
      });
      toast({ title: "Saved", description: "Additional settings updated." });
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

  /** Can the basic course info be saved (validation) */
  const canSaveBasics =
    title.trim() &&
    slug.trim().length > 0 &&
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
        slug: slug.trim(),
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

  const handleCopyLink = async () => {
    const baseUrl = window.location.origin || "http://localhost:8080";
    const link = `${baseUrl}/courses/${slug ? slug : courseId}`;
    await navigator.clipboard.writeText(link);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  // ───────────────────────────────────────────────────────────────
  // ─── CURRICULUM TAB LOGIC ──────────────────────────────────────
  // ───────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────
  // ─── RENDER ────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{title || course?.title || "Untitled Course"}</h1>
            <TabsList>
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>{" "}
              {/* New tab trigger */}
            </TabsList>
          </div>

          {/* ─── BASICS TAB ───────────────────────────────────────── */}
          <TabsContent value="basics">
            <CourseBasicsTab
              course={course}
              title={title}
              setTitle={setTitle}
              courseId={courseId}
              setCourseId={setCourseId}
              description={description}
              setDescription={setDescription}
              slug={slug}
              setSlug={setSlug}
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
              copied={copied}
              setCopied={setCopied}
              handleCopyLink={handleCopyLink}
            />
          </TabsContent>

          {/* ─── CURRICULUM TAB ───────────────────────────────────── */}
          <TabsContent value="curriculum">
            <CurriculumTab course={course} initialItemId={itemId} />
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizTab courseId={courseId} userId={user.id} />
          </TabsContent>

          {/* ─── ADDITIONAL TAB ────────────────────────────────────── */}

          <TabsContent value="additional">
            <AdditionalTab
              isForumEnabled={isForumEnabled}
              setIsForumEnabled={setIsForumEnabled}
              isMailSendingEnabled={isMailSendingEnabled}
              setIsMailSendingEnabled={setIsMailSendingEnabled}
              isCertificateEnabled={isCertificateEnabled}
              setIsCertificateEnabled={setIsCertificateEnabled}
              isWelcomeMessageEnabled={isWelcomeMessageEnabled}
              setIsEnrollAnnouncementEnabled={setIsEnrollAnnouncementEnabled}
              courseId={course?.id}
              courseTitle={course?.title}
              customCertificateName={customCertificateName}
              setCustomCertificateName={setCustomCertificateName}
              isCourseCompletionEnabled={isCourseCompletionEnabled}
              setIsCourseCompletionEnabled={setIsCourseCompletionEnabled}
              onSave={saveAdditionalSettings}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CurriculumBuilderPage;

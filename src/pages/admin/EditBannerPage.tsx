import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Loader2, Plus, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { bannerService } from "@/services/bannerService";
import { courseService } from "@/services/courseService";
import { fileService } from "@/services/fileService";
import { BANNER_STATUS } from "@/constants";
import { BannerFormData } from "@/types/banner";
import { getDownloadURL } from "firebase/storage";
import { Switch } from "@/components/ui/switch";

export default function EditBannerPage() {
  const navigate = useNavigate();
  const { bannerId } = useParams<{ bannerId: string }>();

  const [formData, setFormData] = useState<BannerFormData>({
    title: "",
    description: "",
    ctaTitle: "",
    ctaLink: "",
    imageUrl: null,
    gradientColors: ["#3B82F6", "#8B5CF6"],
    courseIds: [],
    status: BANNER_STATUS.ACTIVE,
    showToAllUsers: false,
    showInDashboard: false,
  });

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");

  useEffect(() => {
    loadData();
  }, [bannerId]);

  const loadData = async () => {
    if (!bannerId) {
      toast({
        title: "Error",
        description: "Invalid banner ID",
        variant: "destructive",
      });
      navigate("/admin/banners");
      return;
    }

    setLoading(true);

    try {
      const [bannerResult, coursesData] = await Promise.all([
        bannerService.getBannerById(bannerId),
        courseService.getAllCourses(),
      ]);

      if (bannerResult.success && bannerResult.data) {
        const banner = bannerResult.data;
        setFormData({
          title: banner.title,
          description: banner.description,
          ctaTitle: banner.ctaTitle,
          ctaLink: banner.ctaLink,
          imageUrl: banner.imageUrl || null,
          gradientColors: banner.gradientColors,
          courseIds: banner.courseIds,
          status: banner.status,
          showToAllUsers: banner.showToAllUsers || false,
          showInDashboard: banner.showInDashboard || false,
        });
      } else {
        toast({
          title: "Error",
          description: "Banner not found",
          variant: "destructive",
        });
        navigate("/admin/banners");
        return;
      }

      setCourses(
        coursesData.map((course) => ({ id: course.id, title: course.title }))
      );
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load banner data",
        variant: "destructive",
      });
      navigate("/admin/banners");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 3 * 1024 * 1024; // 3MB
    if (file.size > MAX_SIZE) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 3MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadPath = `banners/${Date.now()}_${file.name}`;
      const uploadResult = fileService.startResumableUpload(uploadPath, file);

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error("Failed to start upload");
      }

      uploadResult.data.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload error:", error);
          toast({
            title: "Upload Failed",
            description: "Failed to upload image",
            variant: "destructive",
          });
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(
            uploadResult.data!.snapshot.ref
          );
          setFormData((prev) => ({ ...prev, imageUrl: downloadURL }));
          setIsUploading(false);
          toast({
            title: "Success",
            description: "Image uploaded successfully",
          });
        }
      );
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  const handleGradientColorChange = (index: number, value: string) => {
    const newColors = [...formData.gradientColors];
    newColors[index] = value;
    setFormData((prev) => ({ ...prev, gradientColors: newColors }));
  };

  const addGradientColor = () => {
    if (formData.gradientColors.length < 3) {
      setFormData((prev) => ({
        ...prev,
        gradientColors: [...prev.gradientColors, "#EC4899"],
      }));
    }
  };

  const removeGradientColor = (index: number) => {
    if (formData.gradientColors.length > 2) {
      const newColors = formData.gradientColors.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, gradientColors: newColors }));
    }
  };

  const toggleCourse = (courseId: string) => {
    setFormData((prev) => ({
      ...prev,
      courseIds: prev.courseIds.includes(courseId)
        ? prev.courseIds.filter((id) => id !== courseId)
        : [...prev.courseIds, courseId],
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: "Missing Required Field",
        description: "Title is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Missing Required Field",
        description: "Description is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.ctaTitle.trim()) {
      toast({
        title: "Missing Required Field",
        description: "CTA Title is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.ctaLink.trim()) {
      toast({
        title: "Missing Required Field",
        description: "CTA Link is required",
        variant: "destructive",
      });
      return false;
    }

    // Basic URL validation
    try {
      new URL(formData.ctaLink);
    } catch {
      // Check if it's a relative path
      if (!formData.ctaLink.startsWith("/")) {
        toast({
          title: "Invalid URL",
          description: "CTA Link must be a valid URL or start with /",
          variant: "destructive",
        });
        return false;
      }
    }

    // Validate gradient colors
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const color of formData.gradientColors) {
      if (!hexPattern.test(color)) {
        toast({
          title: "Invalid Color",
          description: `"${color}" is not a valid hex color code`,
          variant: "destructive",
        });
        return false;
      }
    }

    if (formData.courseIds.length === 0 && !formData.showToAllUsers) {
      toast({
        title: "No Courses Selected",
        description: "Please select at least one course to target",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !bannerId) return;

    setIsSubmitting(true);

    try {
      const result = await bannerService.updateBanner(bannerId, formData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Banner updated successfully",
        });
        navigate("/admin/banners");
      } else {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : "Failed to update banner",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating banner:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCourses = (() => {
    if (!courseSearch.trim()) return courses;

    try {
      const regex = new RegExp(courseSearch.trim(), "i");
      return courses.filter((c) => regex.test(c.title));
    } catch (error) {
      return courses;
    }
  })();

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/banners")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Banner</h1>
            <p className="text-muted-foreground mt-1">
              Update banner information
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter banner title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.title.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Enter banner description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/500 characters
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ctaTitle">
                      CTA Button Text <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ctaTitle"
                      placeholder="e.g., Learn More"
                      value={formData.ctaTitle}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ctaTitle: e.target.value,
                        }))
                      }
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ctaLink">
                      CTA Link <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ctaLink"
                      placeholder="/courses/example or https://..."
                      value={formData.ctaLink}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ctaLink: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="gap-2 flex items-center">
                  <Label htmlFor="show-to-all-users">Show to All Users (whether enrolled or not)</Label>
                  <Switch
                    id="show-to-all-users"
                    checked={formData.showToAllUsers}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, showToAllUsers: checked }))}
                    className="bg-gray-200 dark:bg-gray-700 dark:data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="gap-2 flex items-center">
                  <Label htmlFor="show-in-dashboard">Show in Dashboard</Label>
                  <Switch
                    id="show-in-dashboard"
                    checked={formData.showInDashboard}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, showInDashboard: checked }))}
                    className="bg-gray-200 dark:bg-gray-700 dark:data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, status: value as any }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BANNER_STATUS.ACTIVE}>Active</SelectItem>
                      <SelectItem value={BANNER_STATUS.INACTIVE}>
                        Inactive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Visual Design */}
            <Card>
              <CardHeader>
                <CardTitle>Visual Design</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image">Banner Image (Optional)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="flex-1"
                    />
                    {isUploading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                  {isUploading && (
                    <div className="space-y-1">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}
                  {formData.imageUrl && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                      <img
                        src={formData.imageUrl}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, imageUrl: null }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Maximum 3MB. Recommended aspect ratio: 21:9 or 16:9
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fallback Gradient Colors</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Used when no image is uploaded (2-3 colors)
                  </p>
                  <div className="space-y-2">
                    {formData.gradientColors.map((color, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) =>
                            handleGradientColorChange(index, e.target.value)
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={color}
                          onChange={(e) =>
                            handleGradientColorChange(index, e.target.value)
                          }
                          placeholder="#000000"
                          className="flex-1"
                          maxLength={7}
                        />
                        {formData.gradientColors.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGradientColor(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {formData.gradientColors.length < 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addGradientColor}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Color
                      </Button>
                    )}
                  </div>
                  <div
                    className="h-20 rounded-lg"
                    style={{
                      background: `linear-gradient(to right, ${formData.gradientColors.join(", ")})`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Target Courses */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Target Courses <span className="text-destructive">*</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select courses - banner will only show to users enrolled in these
                  courses
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="courseSearch">Search Courses</Label>
                  <Input
                    id="courseSearch"
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {filteredCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No courses found
                    </p>
                  ) : (
                    filteredCourses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={course.id}
                          checked={formData.courseIds.includes(course.id)}
                          onCheckedChange={() => toggleCourse(course.id)}
                        />
                        <label
                          htmlFor={course.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {course.title}
                        </label>
                      </div>
                    ))
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {formData.courseIds.length} course(s) selected
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/banners")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Banner"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

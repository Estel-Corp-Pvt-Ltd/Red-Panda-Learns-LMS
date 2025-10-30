import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  BUNDLE_STATUS,
  COURSE_STATUS,
  CURRENCY,
  PRICING_MODEL,
} from "@/constants";
import { useToast } from "@/hooks/use-toast";
import {
  useBundlePricingQuery,
  useBundleQuery,
  useUpdateBundleMutation,
} from "@/hooks/useBundleApi";
import { courseService } from "@/services/courseService";
import { instructorService } from "@/services/instructorService";
import { Course } from "@/types/course";
import { BundleStatus, PricingModel } from "@/types/general";
import { getFullName } from "@/utils/name";
import {
  ArrowLeft,
  DollarSign,
  Info,
  Loader2,
  Package,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type EditBundleFormData = {
  title: string;
  description: string;
  regularPrice: string;
  salePrice: string;
  pricingModel: PricingModel;
  status: BundleStatus;
};

export default function EditBundlePage() {
  const navigate = useNavigate();
  const { bundleId } = useParams<{ bundleId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourses] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructors, setInstructors] = useState<
    { id: string; name: string }[]
  >([]);

  // Fetch bundle data
  const {
    data: bundleData,
    isLoading: bundleLoading,
    error: bundleError,
  } = useBundleQuery(bundleId!);
  const { mutate: updateBundle } = useUpdateBundleMutation();

  const [formData, setFormData] = useState<EditBundleFormData>({
    title: "",
    description: "",
    regularPrice: "",
    salePrice: "",
    pricingModel: PRICING_MODEL.PAID,
    status: BUNDLE_STATUS.DRAFT,
  });

  // Fetch pricing for selected courses
  const { data: pricingData, isLoading: pricingLoading } =
    useBundlePricingQuery(selectedCourseIds);

  // Redirect if bundle ID is missing
  useEffect(() => {
    if (!bundleId) {
      toast({
        title: "Error",
        description: "Bundle ID is required.",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }
  }, [bundleId, navigate, toast]);

  // Handle bundle loading error
  useEffect(() => {
    if (bundleError) {
      toast({
        title: "Error",
        description: "Failed to load bundle data. Please try again.",
        variant: "destructive",
      });
      navigate("/admin");
    }
  }, [bundleError, navigate, toast]);

  useEffect(() => {
    const fetchInstructors = async () => {
      const result = await instructorService.getAllInstructors();

      if (result.success) {
        const formattedInstructors = result.data.map((instructor) => ({
          id: instructor.id,
          name: getFullName(
            instructor.firstName,
            instructor.middleName,
            instructor.lastName
          ),
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
  }, [toast]);

  // Load courses and bundle data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);
        await loadCourses();
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Populate form when bundle data is loaded
  useEffect(() => {
    if (bundleData && !bundleLoading) {
      setFormData({
        title: bundleData.title || "",
        description: bundleData.description || "",
        regularPrice: bundleData.regularPrice
          ? bundleData.regularPrice.toString()
          : "",
        salePrice: bundleData.salePrice ? bundleData.salePrice.toString() : "",
        pricingModel: bundleData.pricingModel || PRICING_MODEL.PAID,
        status: bundleData.status,
      });

      // Set selected courses
      if (bundleData.courses) {
        setSelectedCourses(bundleData.courses.map((course) => course.id));
      }

      setInstructorId(bundleData.instructorId || "");
      setInstructorName(bundleData.instructorName || "");

      // Set categories and tags
      setCategories(bundleData.categories || []);
      setTags(bundleData.tags || []);
    }
  }, [bundleData, bundleLoading]);

  const loadCourses = async () => {
    try {
      const coursesData = await courseService.getAllCourses();
      setCourses(
        coursesData.filter(
          (course) => course.status === COURSE_STATUS.PUBLISHED
        )
      );
    } catch (error) {
      console.error("Error loading courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Category handlers
  const handleCategoryChange = (category: string) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Tag handlers
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleUpdateBundle = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bundle title.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCourseIds.length < 2) {
      toast({
        title: "Error",
        description: "Please select at least 2 courses for the bundle.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bundle description.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const regularPrice = formData.regularPrice
        ? parseFloat(formData.regularPrice)
        : 0;
      const salePrice = formData.salePrice ? parseFloat(formData.salePrice) : 0;

      updateBundle(
        {
          bundleId: bundleId!,
          updatedData: {
            title: formData.title,
            description: formData.description,
            courses: courses
              .filter((course) => selectedCourseIds.includes(course.id!))
              .map((course) => ({ id: course.id, title: course.title })),
            regularPrice,
            salePrice,
            pricingModel: formData.pricingModel,
            instructorId,
            instructorName,
            categories,
            tags,
            status: formData.status,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Bundle updated successfully!",
            });
            navigate("/admin");
          },
          onError: (error) => {
            console.error("Error updating bundle:", error);
            toast({
              title: "Error",
              description: "Failed to update bundle. Please try again.",
              variant: "destructive",
            });
          },
          onSettled: () => {
            setLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error updating bundle:", error);
      toast({
        title: "Error",
        description: "Failed to update bundle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishBundle = async () => {
    if (
      !formData.title.trim() ||
      selectedCourseIds.length < 2 ||
      !formData.description.trim()
    ) {
      toast({
        title: "Error",
        description:
          "Please fill all required fields and select at least 2 courses.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const regularPrice = formData.regularPrice
        ? parseFloat(formData.regularPrice)
        : 0;
      const salePrice = formData.salePrice ? parseFloat(formData.salePrice) : 0;
      updateBundle(
        {
          bundleId: bundleId!,
          updatedData: {
            title: formData.title,
            description: formData.description,
            courses: courses
              .filter((course) => selectedCourseIds.includes(course.id!))
              .map((course) => ({ id: course.id, title: course.title })),
            regularPrice,
            salePrice,
            pricingModel: formData.pricingModel,
            instructorId,
            instructorName,
            categories,
            tags,
            status: formData.status,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Bundle updated successfully!",
            });
            navigate("/admin");
          },
          onError: (error) => {
            console.error("Error updating bundle:", error);
            toast({
              title: "Error",
              description: "Failed to update bundle. Please try again.",
              variant: "destructive",
            });
          },
          onSettled: () => {
            setLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error updating and publishing bundle:", error);
      toast({
        title: "Error",
        description: "Failed to update and publish bundle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

  const selectedCourses = courses.filter((course) =>
    selectedCourseIds.includes(course.id!)
  );

  // Show loading state while initial data loads
  if (initialLoading || bundleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading bundle data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header/>
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin")}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>

            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                Edit Bundle
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bundle Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Bundle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Bundle Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter bundle title..."
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what's included in this bundle..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Categories */}
                <div>
                  <Label>Categories</Label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {[
                      "AI/ML",
                      "Bootcamp",
                      "College-student",
                      "Data-Science",
                      "Generative-AI",
                    ].map((cat) => (
                      <div key={cat} className="flex items-center space-x-2">
                        <Checkbox
                          checked={categories.includes(cat)}
                          onCheckedChange={() => handleCategoryChange(cat)}
                        />
                        <Label>{cat}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Pricing Model */}
                <div>
                  <Label>Pricing Model</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="paid"
                        checked={formData.pricingModel === PRICING_MODEL.PAID}
                        onCheckedChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            pricingModel: PRICING_MODEL.PAID,
                          }))
                        }
                      />
                      <Label htmlFor="paid">Paid</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="free"
                        checked={formData.pricingModel === PRICING_MODEL.FREE}
                        onCheckedChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            pricingModel: PRICING_MODEL.FREE,
                          }))
                        }
                      />
                      <Label htmlFor="free">Free</Label>
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Instructor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={instructorName}
                      onValueChange={(val) => {
                        const selected = instructors.find(
                          (a) => a.name === val
                        );
                        setInstructorId(selected?.id || "");
                        setInstructorName(val);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an instructor" />
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
              </CardContent>
            </Card>

            {/* Course Selection */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Select Courses ({selectedCourseIds.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No courses available
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      You need published courses to create a bundle.
                    </p>
                    <Button onClick={() => navigate("/admin/create-course")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Course
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedCourseIds.includes(course.id!)}
                          onCheckedChange={() => handleCourseToggle(course.id!)}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{course.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {course.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(
                              course.salePrice || course.regularPrice
                            )}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {course.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pricing & Preview */}
          <div className="space-y-6">
            {/* Selected Courses Preview */}
            {selectedCourses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedCourses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-1">
                            {course.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatCurrency(
                              course.salePrice || course.regularPrice
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCourseToggle(course.id!)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Configuration */}
            {pricingData &&
              selectedCourseIds.length > 0 &&
              formData.pricingModel === PRICING_MODEL.PAID && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Bundle Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Individual Prices Total:</span>
                        <span className="font-medium">
                          {formatCurrency(pricingData.regularPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-success">
                        <span>Suggested Bundle Price:</span>
                        <span className="font-medium">
                          {formatCurrency(pricingData.suggestedPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Potential Savings:</span>
                        <span>
                          {formatCurrency(
                            pricingData.regularPrice -
                              pricingData.suggestedPrice
                          )}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="regularPrice">Regular Price *</Label>
                      <Input
                        id="regularPrice"
                        type="number"
                        placeholder={`Enter regular price`}
                        value={formData.regularPrice}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            regularPrice: e.target.value,
                          }))
                        }
                        min={pricingData.maxDiscount}
                        max={pricingData.regularPrice}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Range: {formatCurrency(pricingData.maxDiscount)} -{" "}
                        {formatCurrency(pricingData.regularPrice)}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="salePrice">Sale Price (Optional)</Label>
                      <Input
                        id="salePrice"
                        type="number"
                        placeholder="Enter sale price"
                        value={formData.salePrice}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            salePrice: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {formData.salePrice
                          ? `Sale price will be displayed instead of regular price.`
                          : `If you don't set a sale price, the regular price will be used.`}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

            {/* Bundle Status */}
            <Card>
              <CardHeader>
                <CardTitle>Bundle Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Status:</span>
                  <Badge
                    variant={
                      formData.status === BUNDLE_STATUS.PUBLISHED
                        ? "default"
                        : "secondary"
                    }
                  >
                    {formData.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleUpdateBundle}
                disabled={
                  loading ||
                  selectedCourseIds.length < 2 ||
                  !formData.title.trim() ||
                  !formData.description.trim()
                }
                className="w-full"
                variant="default"
              >
                {loading ? "Updating..." : "Update  Bundle"}
              </Button>

              {formData.status !== BUNDLE_STATUS.PUBLISHED && (
                <Button
                  onClick={handlePublishBundle}
                  disabled={
                    loading ||
                    selectedCourseIds.length < 2 ||
                    !formData.title.trim() ||
                    !formData.description.trim()
                  }
                  className="w-full"
                >
                  {loading ? "Publishing..." : "Update & Publish Bundle"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

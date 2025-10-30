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
  SORT_KEY,
  ATTRIBUTE_TYPE
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
import { BundleStatus, PricingModel , SortKey,AttributeType } from "@/types/general";
import { getFullName } from "@/utils/name";
import {
 
  Loader2,
 
  ArrowLeft, Package, Plus, Trash2, DollarSign, Info, X , Search, RefreshCcw, CheckCheck, XCircle, Filter, Check, ChevronDown 
} from "lucide-react";
import { useEffect, useState ,useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
type EditBundleFormData = {
  title: string;
  description: string;
  regularPrice: string;
  salePrice: string;
  pricingModel: PricingModel;
  status: BundleStatus;
};
import { Slider } from "@/components/ui/slider";
import { attributeService } from "@/services/attributeService";
import { Attribute } from "@/types/attribute";

interface Option {
  id: string;
  label: string;
}
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
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
const [targetAudienceOptions , settargetAudienceOptions ] = useState<Option[]>([]);
const [tagOptions, setTagOptions] = useState<Option[]>([]);

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


  
    // Helper to get a course's effective price (salePrice takes precedence)
  const getCoursePrice = (course: Course) =>
    Number(course.salePrice ?? course.regularPrice ?? 0);
  
  // Search (debounced)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      300
    );
    return () => clearTimeout(id);
  }, [search]);
  
  // Price range setup from current courses
  const prices = useMemo(() => courses.map(getCoursePrice), [courses]);
  const minCoursePrice = useMemo(
    () => (prices.length ? Math.min(...prices) : 0),
    [prices]
  );
  const maxCoursePrice = useMemo(
    () => (prices.length ? Math.max(...prices) : 0),
    [prices]
  );
  
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    setPriceRange([minCoursePrice, maxCoursePrice]);
  }, [minCoursePrice, maxCoursePrice]);
  
  const [sortBy, setSortBy] = useState<SortKey>(SORT_KEY.RELEVANCE);
  const [priceType, setPriceType] = useState<"all" | PricingModel >("all");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedCourseTags, setSelectedCourseTags] = useState<string[]>([]);
  const [selectedTargetAudienceIds, setSelectedTargetAudienceIds] = useState<string[]>([]);
  
  


useEffect(() => {
  const fetchInstructors = async () => {
    const result = await instructorService.getAllInstructors();
    if (result.success) {
      const formatted = result.data.map((i) => ({
        id: i.id,
        name: getFullName(i.firstName, i.middleName, i.lastName),
      }));
      setInstructors(formatted);
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

useEffect(() => {
  const fetchAttributes = async () => {
    try {
      const categoriesData = await attributeService.getAttributes(ATTRIBUTE_TYPE.CATEGORY);
      setCategoryOptions(categoriesData.map((a) => ({ id: a.id, label: a.name })));
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories.",
        variant: "destructive",
      });
    }

    try {
      const targetAudienceData = await attributeService.getAttributes(ATTRIBUTE_TYPE.TARGET_AUDIENCE);
      settargetAudienceOptions(targetAudienceData.map((a) => ({ id: a.id, label: a.name })));
    } catch (error) {
      console.error("Error fetching target audiences:", error);
      toast({
        title: "Error",
        description: "Failed to load target audiences.",
        variant: "destructive",
      });
    }
  };

  fetchAttributes();
}, [toast]);


useEffect(() => {
  const fetchTags = async () => {
    try {
      const tags = await courseService.getAllTags();


      const formattedTags = tags.map((t) => ({ id: t, label: t }));
      setTagOptions(formattedTags);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      toast({
        title: "Error",
        description: "Could not load tags.",
        variant: "destructive",
      });
    }
  };

  fetchTags();
}, [toast]);
  
  // Filtered + sorted list
  const filteredCourses = useMemo(() => {
    let list = [...courses];
  
    // search
    if (debouncedSearch) {
      list = list.filter((c) =>
        [c.title, c.description]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(debouncedSearch))
      );
    }
  
    // price type
    list = list.filter((c) => {
      const p = getCoursePrice(c);
      if (priceType === PRICING_MODEL.FREE) return p <= 0;
      if (priceType === PRICING_MODEL.PAID) return p > 0;
      return true;
    });
  
    // price range
    list = list.filter((c) => {
      const p = getCoursePrice(c);
      return p >= priceRange[0] && p <= priceRange[1];
    });
  
    // Advanced filters
    if (selectedInstructorIds.length) {
  list = list.filter((c) => {
    const instructorId = (c as any).instructorId as string;
    return selectedInstructorIds.includes(instructorId ?? "");
  });
}
    if (selectedCategoryIds.length) {
      list = list.filter((c) =>
        c.categoryIds?.some((id) => selectedCategoryIds.includes(id))
      );
    }
    if (selectedCourseTags.length) {
      list = list.filter((c) => c.tags?.some((t) => selectedCourseTags.includes(t)));
    }
    if (selectedTargetAudienceIds.length) {
      list = list.filter((c) =>
        c.targetAudienceIds?.some((id) => selectedTargetAudienceIds.includes(id))
      );
    }
  
    // show selected only
    if (showSelectedOnly) {
      list = list.filter((c) => selectedCourseIds.includes(c.id!));
    }
  
    // sort
    // sort
  switch (sortBy) {
    case SORT_KEY.PRICE_ASC:
      list.sort((a, b) => getCoursePrice(a) - getCoursePrice(b));
      break;
    case SORT_KEY.PRICE_DESC:
      list.sort((a, b) => getCoursePrice(b) - getCoursePrice(a));
      break;
    case SORT_KEY.TITLE_ASC:
      list.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case SORT_KEY.TITLE_DESC:
      list.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case SORT_KEY.RELEVANCE:
      default:
        list.sort((a, b) => {
          const as = selectedCourseIds.includes(a.id!);
          const bs = selectedCourseIds.includes(b.id!);
          if (as !== bs) return as ? -1 : 1;
          if (debouncedSearch) {
            const at = a.title?.toLowerCase().includes(debouncedSearch) ? 1 : 0;
            const bt = b.title?.toLowerCase().includes(debouncedSearch) ? 1 : 0;
            if (at !== bt) return bt - at;
          }
          return a.title.localeCompare(b.title);
        });
    }
  
    return list;
  }, [
    courses,
    debouncedSearch,
    priceType,
    priceRange,
    sortBy,
    showSelectedOnly,
    selectedCourseIds,
    selectedInstructorIds,
    selectedCategoryIds,
    selectedCourseTags,
    selectedTargetAudienceIds,
  ]);
  // Bulk actions + helpers
  const totalCount = courses.length;
  const filteredCount = filteredCourses.length;
  
  const handleSelectAllFiltered = () => {
    setSelectedCourses((prev) => {
      const toAdd = filteredCourses
        .map((c) => c.id!)
        .filter((id) => !prev.includes(id));
      return [...prev, ...toAdd];
    });
  };
  
  const handleClearSelectionFiltered = () => {
    setSelectedCourses((prev) =>
      prev.filter((id) => !filteredCourses.some((c) => c.id === id))
    );
  };
  
  const handleResetFilters = () => {
    setSearch("");
    setPriceType("all");
    setSortBy(SORT_KEY.RELEVANCE);
    setShowSelectedOnly(false);
    setPriceRange([minCoursePrice, maxCoursePrice]);
    setSelectedInstructorIds([]);
    setSelectedCategoryIds([]);
    setSelectedCourseTags([]);
    setSelectedTargetAudienceIds([]);
  };


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
      currency: CURRENCY.INR,
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
        <h3 className="text-lg font-medium mb-2">No courses available</h3>
        <p className="text-muted-foreground mb-4">
          You need published courses to create a bundle.
        </p>
        <Button onClick={() => navigate("/admin/create-course")}>
          <Plus className="mr-2 h-4 w-4" />
          Create First Course
        </Button>
      </div>
    ) : (
      <>
        {/* Filter toolbar */}
       {/* Filter toolbar */}
<div className="p-3 border rounded-lg bg-muted/20 space-y-3 mb-4">
  {/* Row 1: Search, Type, Sort */}
 <div className="flex flex-col lg:flex-row lg:items-end gap-3">
  {/* Search */}
  <div className="w-full lg:flex-1 space-y-1.5">
    <Label className="text-xs text-muted-foreground">Search</Label>
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-muted-foreground">
        <Search className="h-4 w-4" />
      </span>
      <Input
        className="pl-8"
        placeholder="Search by title or description..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  </div>

  {/* Type */}
  <div className="w-full lg:w-40 space-y-1.5">
    <Label className="text-xs text-muted-foreground">Type</Label>
    <Select
      value={priceType}
      onValueChange={(v) => setPriceType(v as "all" | PricingModel)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value={PRICING_MODEL.FREE}>Free</SelectItem>
        <SelectItem value={PRICING_MODEL.PAID}>Paid</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Sort by */}
  <div className="w-full lg:w-48 space-y-1.5">
    <Label className="text-xs text-muted-foreground">Sort by</Label>
    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Relevance" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SORT_KEY.RELEVANCE}>Relevance</SelectItem>
        <SelectItem value={SORT_KEY.PRICE_ASC}>Price: Low to High</SelectItem>
        <SelectItem value={SORT_KEY.PRICE_DESC}>Price: High to Low</SelectItem>
        <SelectItem value={SORT_KEY.TITLE_ASC}>Title: A → Z</SelectItem>
        <SelectItem value={SORT_KEY.TITLE_DESC}>Title: Z → A</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>

  {/* Row 2: Price Range */}
  <div className="w-full">
    <Label className="text-xs text-muted-foreground">Price range</Label>
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">
        {formatCurrency(priceRange[0] || 0)}
      </span>
      <Slider
        value={[priceRange[0], priceRange[1]]}
        onValueChange={(vals) => setPriceRange([vals[0], vals[1]])}
        min={minCoursePrice}
        max={maxCoursePrice}
        step={1}
        className="flex-1"
        disabled={minCoursePrice === maxCoursePrice}
      />
      <span className="text-sm font-medium">
        {formatCurrency(priceRange[1] || 0)}
      </span>
    </div>
  </div>

  {/* Row 3: Advanced filters */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
    {/* Instructor */}
  
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-between">
      <span>Instructor</span>
      <div className="flex items-center gap-2">
        {selectedInstructorIds.length > 0 && (
          <Badge variant="secondary">{selectedInstructorIds.length}</Badge>
        )}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </div>
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[280px] p-0">
    <Command>
      <CommandInput placeholder="Search instructors..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup>
          {instructors.map((opt) => {
            const selected = selectedInstructorIds.includes(opt.name);
            return (
              <CommandItem
                key={opt.id}
                value={`${opt.name} ${opt.id}`} // better search
                onSelect={() =>
                  setSelectedInstructorIds((prev) =>
                    selected ? prev.filter((id) => id !== opt.name) : [...prev, opt.name]
                  )
                }
                className="flex items-center gap-2"
              >
                <div
                  className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${
                    selected ? "bg-primary text-primary-foreground" : "opacity-50"
                  }`}
                >
                  {selected && <Check className="h-3 w-3" />}
                </div>
                <span>{opt.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
    <div className="flex justify-between items-center p-2 border-t">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setSelectedInstructorIds(instructors.map((o) => o.name))}
        disabled={
          instructors.length === 0 || selectedInstructorIds.length === instructors.length
        }
      >
        Select all
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setSelectedInstructorIds([])}
        disabled={selectedInstructorIds.length === 0}
      >
        Clear
      </Button>
    </div>
  </PopoverContent>
</Popover>

    {/* Categories */}
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>Categories</span>
          <div className="flex items-center gap-2">
            {selectedCategoryIds.length > 0 && (
              <Badge variant="secondary">{selectedCategoryIds.length}</Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {categoryOptions.map((opt) => {
                const selected = selectedCategoryIds.includes(opt.label);
                return (
                  <CommandItem
                    key={opt.id}
                    onSelect={() =>
                      setSelectedCategoryIds((prev) =>
                        selected ? prev.filter((id) => id !== opt.label) : [...prev, opt.label]
                      )
                    }
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${
                        selected ? "bg-primary text-primary-foreground" : "opacity-50"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex justify-between items-center p-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedCategoryIds(categoryOptions.map((o) => o.label))}
            disabled={
              categoryOptions.length === 0 ||
              selectedCategoryIds.length === categoryOptions.length
            }
          >
            Select all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedCategoryIds([])}
            disabled={selectedCategoryIds.length === 0}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>

    {/* Tags */}
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>Tags</span>
          <div className="flex items-center gap-2">
            {selectedCourseTags.length > 0 && (
              <Badge variant="secondary">{selectedCourseTags.length}</Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {tagOptions.map((opt) => {
                const selected = selectedCourseTags.includes(opt.label);
                return (
                  <CommandItem
                    key={opt.id}
                    onSelect={() =>
                      setSelectedCourseTags((prev) =>
                        selected ? prev.filter((t) => t !== opt.label) : [...prev, opt.label]
                      )
                    }
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${
                        selected ? "bg-primary text-primary-foreground" : "opacity-50"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex justify-between items-center p-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedCourseTags(tagOptions.map((o) => o.id))}
            disabled={
              tagOptions.length === 0 || selectedCourseTags.length === tagOptions.length
            }
          >
            Select all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedCourseTags([])}
            disabled={selectedCourseTags.length === 0}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>

    {/* Target Audience */}
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>Target Audience</span>
          <div className="flex items-center gap-2">
            {selectedTargetAudienceIds.length > 0 && (
              <Badge variant="secondary">{selectedTargetAudienceIds.length}</Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search audience..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {targetAudienceOptions.map((opt) => {
                const selected = selectedTargetAudienceIds.includes(opt.label);
                return (
                  <CommandItem
                    key={opt.id}
                    onSelect={() =>
                      setSelectedTargetAudienceIds((prev) =>
                        selected ? prev.filter((id) => id !== opt.label) : [...prev, opt.label]
                      )
                    }
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${
                        selected ? "bg-primary text-primary-foreground" : "opacity-50"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex justify-between items-center p-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setSelectedTargetAudienceIds(targetAudienceOptions.map((o) => o.label))
            }
            disabled={
              targetAudienceOptions.length === 0 ||
              selectedTargetAudienceIds.length === targetAudienceOptions.length
            }
          >
            Select all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedTargetAudienceIds([])}
            disabled={selectedTargetAudienceIds.length === 0}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>

  {/* Active filter chips */}
  {(selectedInstructorIds.length ||
    selectedCategoryIds.length ||
    selectedCourseTags.length ||
    selectedTargetAudienceIds.length) > 0 && (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Active filters:</span>

      {selectedInstructorIds.map((id) => {
        const name = instructors.find((o) => o.id === id)?.name || id;
        return (
          <Badge key={`if-${id}`} variant="secondary" className="flex items-center gap-1">
            {name}
            <button
              onClick={() =>
                setSelectedInstructorIds((prev) => prev.filter((x) => x !== id))
              }
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}

      {selectedInstructorIds.map((id) => {
  const name = instructors.find((o) => o.id === id)?.name ?? id;
  return (
    <Badge key={`if-${id}`} variant="secondary" className="flex items-center gap-1">
      {name}
      <button
        onClick={() =>
          setSelectedInstructorIds((prev) => prev.filter((x) => x !== id))
        }
        className="ml-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
})}

  {selectedCategoryIds.map((id) => {
  const label = categoryOptions.find((o) => o.id === id)?.label ?? id;
  return (
    <Badge key={`cf-${id}`} variant="secondary" className="flex items-center gap-1">
      {label}
      <button
        onClick={() => setSelectedCategoryIds((prev) => prev.filter((x) => x !== id))}
        className="ml-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
})}

{selectedTargetAudienceIds.map((id) => {
  const label = targetAudienceOptions.find((o) => o.id === id)?.label ?? id;
  return (
    <Badge key={`af-${id}`} variant="secondary" className="flex items-center gap-1">
      {label}
      <button
        onClick={() => setSelectedTargetAudienceIds((prev) => prev.filter((x) => x !== id))}
        className="ml-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
})}
      {selectedCourseTags.map((t) => (
        <Badge key={`tf-${t}`} variant="secondary" className="flex items-center gap-1">
          {t}
          <button
            onClick={() =>
              setSelectedCourseTags((prev) => prev.filter((x) => x !== t))
            }
            className="ml-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

    
    </div>
  )}

  {/* Row 4: Toggles + Bulk Actions */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <Checkbox
        id="selectedOnly"
        checked={showSelectedOnly}
        onCheckedChange={(checked) => setShowSelectedOnly(Boolean(checked))}
      />
      <Label htmlFor="selectedOnly" className="text-sm">
        Show selected only
      </Label>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleSelectAllFiltered}
        disabled={
          filteredCourses.length === 0 ||
          filteredCourses.every((c) => selectedCourseIds.includes(c.id!))
        }
      >
        <CheckCheck className="h-4 w-4 mr-1" />
        Select all (filtered)
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleClearSelectionFiltered}
        disabled={filteredCourses.every((c) => !selectedCourseIds.includes(c.id!))}
      >
        <XCircle className="h-4 w-4 mr-1" />
        Clear selection (filtered)
      </Button>

      <Button size="sm" variant="ghost" onClick={handleResetFilters}>
        <RefreshCcw className="h-4 w-4 mr-1" />
        Reset
      </Button>
    </div>
  </div>

  <div className="text-xs text-muted-foreground">
    Showing {filteredCount} of {totalCount} courses • Selected {selectedCourseIds.length}
  </div>
</div>

        {/* Filtered results */}
        <div className="space-y-3">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-start sm:items-center gap-3 flex-1">
                <Checkbox
                  checked={selectedCourseIds.includes(course.id!)}
                  onCheckedChange={() => handleCourseToggle(course.id!)}
                />
                <div className="flex-1">
                  <h4 className="font-medium">{course.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                    {course.description}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-semibold">
                  {formatCurrency(
                    course.salePrice ?? course.regularPrice ?? 0
                  )}
                </p>
                <Badge variant="outline" className="text-xs">
                  {course.status}
                </Badge>
              </div>
            </div>
          ))}
          {filteredCourses.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No courses match your filters.
            </div>
          )}
        </div>
      </>
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

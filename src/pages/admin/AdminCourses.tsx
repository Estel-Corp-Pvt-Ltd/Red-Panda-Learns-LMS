import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { courseService } from "@/services/courseService";
import { Course } from "@/types/course";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Filter,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { COURSE_STATUS, CURRENCY } from "@/constants";

import AdminLayout from "@/components/AdminLayout";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginatedCourses {
  data: Course[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

type COURSE_STATUS = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

type CoursePriceFilter = "Zero Price" | "Non Zero Price" | "All Prices";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const AdminCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<PaginatedCourses>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<COURSE_STATUS | "ALL">(
    "ALL"
  );
  const [searchField, setSearchField] = useState<
    "title" | "description" | "both"
  >("both");
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [useClientSearch, setUseClientSearch] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: "next" as "next" | "previous",
    currentPage: 1,
  });
  const [coursePriceFilterValue, setCoursePriceFilterValue] =
    useState<CoursePriceFilter>("All Prices");

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPaginationState((prev) => ({ ...prev, cursor: null, currentPage: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load all courses for client-side search
  useEffect(() => {
    if (useClientSearch) {
      loadAllCourses();
    }
  }, [useClientSearch]);

  // Load courses when filters or pagination change
  useEffect(() => {
    if (
      useClientSearch &&
      (searchQuery ||
        statusFilter !== "ALL" ||
        coursePriceFilterValue !== "All Prices")
    ) {
      performClientSearch();
    } else {
      loadCourses();
    }
  }, [
    searchQuery,
    statusFilter,
    coursePriceFilterValue,
    paginationState.cursor,
    paginationState.pageDirection,
    useClientSearch,
    itemsPerPage,
  ]);

    const isProbablyHtml = (text?: string | null) => {
  if (!text) return false;
  const trimmed = text.trim();
  // Simple heuristic: starts with '<' and has at least one closing tag
  return trimmed.startsWith('<') && /<\/[a-z][\s\S]*>/i.test(trimmed);
};

  const loadAllCourses = async () => {
    try {
      setIsLoading(true);
      const result = await courseService.getAllCourses();
      setAllCourses(result);
    } catch (error) {
      console.error("Error loading all courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performClientSearch = () => {
    setIsLoading(true);

    try {
      let filteredCourses = allCourses;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredCourses = filteredCourses.filter((course) => {
          const titleMatch = course.title?.toLowerCase().includes(query);
          const descriptionMatch = course.description
            ?.toLowerCase()
            .includes(query);

          if (searchField === "title") return titleMatch;
          if (searchField === "description") return descriptionMatch;
          return titleMatch || descriptionMatch;
        });
      }

      // Apply status filter
      if (statusFilter !== "ALL") {
        filteredCourses = filteredCourses.filter(
          (course) => course.status === statusFilter
        );
      }

      // Apply price filter
      if (coursePriceFilterValue !== "All Prices") {
        filteredCourses = filteredCourses.filter((course) =>
          coursePriceFilterValue === "Non Zero Price"
            ? course.salePrice > 0
            : course.salePrice === 0
        );
      }

      // Calculate pagination
      const startIndex = (paginationState.currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

      setCourses({
        data: paginatedCourses,
        hasNextPage: endIndex < filteredCourses.length,
        hasPreviousPage: paginationState.currentPage > 1,
        nextCursor: null,
        previousCursor: null,
        totalCount: filteredCourses.length,
      });
    } catch (error) {
      console.error("Error performing client search:", error);
      toast({
        title: "Error",
        description: "An error occurred while searching courses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      // Build filters array for server-side search
      const filters = [];

      // Add search filter if query exists
      if (searchQuery.trim() && !useClientSearch) {
        filters.push(
          {
            field: "title",
            op: ">=",
            value: searchQuery.toLowerCase(),
          },
          {
            field: "title",
            op: "<=",
            value: searchQuery.toLowerCase() + "\uf8ff",
          }
        );
      }

      // Add status filter if not 'ALL'
      if (statusFilter !== "ALL") {
        filters.push({
          field: "status",
          op: "==",
          value: statusFilter,
        });
      }

      const result = await courseService.getCourses(filters, {
        limit: itemsPerPage,
        orderBy: { field: "createdAt", direction: "desc" },
        cursor: paginationState.cursor,
        pageDirection: paginationState.pageDirection,
      });

      if (result.success && result.data) {
        let finalCourses = result.data.data;

        // Apply client-side filtering for better search when using server-side base
        if (searchQuery.trim() && !useClientSearch) {
          const query = searchQuery.toLowerCase();
          finalCourses = finalCourses.filter((course) => {
            const titleMatch = course.title?.toLowerCase().includes(query);
            const descriptionMatch = course.description
              ?.toLowerCase()
              .includes(query);

            if (searchField === "title") return titleMatch;
            if (searchField === "description") return descriptionMatch;
            return titleMatch || descriptionMatch;
          });
        }

        // Apply price filter client-side for server-side results
        if (coursePriceFilterValue !== "All Prices") {
          finalCourses = finalCourses.filter((course) =>
            coursePriceFilterValue === "Non Zero Price"
              ? course.salePrice > 0
              : course.salePrice === 0
          );
        }

        setCourses({
          data: finalCourses,
          hasNextPage: result.data.hasNextPage,
          hasPreviousPage: result.data.hasPreviousPage,
          nextCursor: result.data.nextCursor,
          previousCursor: result.data.previousCursor,
          totalCount: result.data.totalCount,
        });
      } else {
        console.error("Failed to load courses:", result.error);
        toast({
          title: "Error",
          description: "Failed to load courses",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading courses:", error);
      toast({
        title: "Error",
        description: "An error occurred while loading courses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setPaginationState((prev) => ({
      ...prev,
      cursor: null,
      currentPage: 1,
    }));
  };

  const handleNextPage = () => {
    if (!courses.hasNextPage || isLoading) return;

    if (
      useClientSearch &&
      (searchQuery ||
        statusFilter !== "ALL" ||
        coursePriceFilterValue !== "All Prices")
    ) {
      // Client-side pagination
      setPaginationState((prev) => ({
        ...prev,
        currentPage: prev.currentPage + 1,
        cursor: null,
      }));
    } else {
      // Server-side pagination
      setPaginationState((prev) => ({
        cursor: courses.nextCursor,
        pageDirection: "next",
        currentPage: prev.currentPage + 1,
      }));
    }
  };

  const handlePreviousPage = () => {
    if (!courses.hasPreviousPage || isLoading) return;

    if (
      useClientSearch &&
      (searchQuery ||
        statusFilter !== "ALL" ||
        coursePriceFilterValue !== "All Prices")
    ) {
      // Client-side pagination
      setPaginationState((prev) => ({
        ...prev,
        currentPage: prev.currentPage - 1,
        cursor: null,
      }));
    } else {
      // Server-side pagination
      setPaginationState((prev) => ({
        cursor: courses.previousCursor,
        pageDirection: "previous",
        currentPage: prev.currentPage - 1,
      }));
    }
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);

    // Reset pagination when search changes
    setPaginationState((prev) => ({
      ...prev,
      currentPage: 1,
      cursor: null,
    }));

    // Switch to client-side search for complex filtering
    if (value.trim().length > 0) {
      setUseClientSearch(true);
    } else if (
      value.trim().length === 0 &&
      statusFilter === "ALL" &&
      coursePriceFilterValue === "All Prices"
    ) {
      setUseClientSearch(false);
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPaginationState((prev) => ({
      ...prev,
      currentPage: 1,
      cursor: null,
    }));

    // Only switch back to server-side if no other filters are active
    if (statusFilter === "ALL" && coursePriceFilterValue === "All Prices") {
      setUseClientSearch(false);
    }
  };

  const handleStatusFilter = (status: COURSE_STATUS | "ALL") => {
    setStatusFilter(status);
    setPaginationState((prev) => ({
      ...prev,
      cursor: null,
      currentPage: 1,
    }));

    // Use client-side search when filtering by status
    if (status !== "ALL") {
      setUseClientSearch(true);
    } else if (searchQuery === "" && coursePriceFilterValue === "All Prices") {
      setUseClientSearch(false);
    }
  };

  const handlePriceFilter = (priceFilter: CoursePriceFilter) => {
    setCoursePriceFilterValue(priceFilter);
    setPaginationState((prev) => ({
      ...prev,
      cursor: null,
      currentPage: 1,
    }));

    // Use client-side search when filtering by price
    if (priceFilter !== "All Prices") {
      setUseClientSearch(true);
    } else if (searchQuery === "" && statusFilter === "ALL") {
      setUseClientSearch(false);
    }
  };

  const handleSearchFieldChange = (field: "title" | "description" | "both") => {
    setSearchField(field);
    // Trigger new search when field changes
    if (searchQuery) {
      setPaginationState((prev) => ({
        ...prev,
        cursor: null,
        currentPage: 1,
      }));
    }
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("ALL");
    setCoursePriceFilterValue("All Prices");
    setUseClientSearch(false);
    setItemsPerPage(10);
    setPaginationState({
      cursor: null,
      pageDirection: "next",
      currentPage: 1,
    });
  };

  const deleteCourse = async () => {
    if (!selectedCourse) return;

    try {
      const result = await courseService.deleteCourse(selectedCourse.id);
      if (!result.success) {
        toast({
          title: "Error",
          description: "Failed to delete course",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Course deleted successfully",
      });

      // Reload courses to reflect deletion
      if (useClientSearch) {
        await loadAllCourses();
        performClientSearch();
      } else {
        await loadCourses();
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the course",
        variant: "destructive",
      });
    } finally {
      setConfirmOpen(false);
      setSelectedCourse(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: CURRENCY.INR,
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: COURSE_STATUS) => {
    switch (status) {
      case COURSE_STATUS.PUBLISHED:
        return "default";
      case COURSE_STATUS.DRAFT:
        return "secondary";
      case COURSE_STATUS.ARCHIVED:
        return "outline";
      default:
        return "outline";
    }
  };

  // Determine if we're in filtered state
  const isFiltered =
    searchQuery ||
    statusFilter !== "ALL" ||
    coursePriceFilterValue !== "All Prices";

  if (isLoading && courses.data.length === 0) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="flex justify-center items-center py-8">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-2">Loading courses...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Courses</CardTitle>
              <CardDescription>
                Manage your courses and their settings.
                {courses.totalCount > 0 &&
                  ` (Page ${paginationState.currentPage})`}
              </CardDescription>
            </div>
            <Button
              variant="pill"
              size="sm"
              onClick={() => navigate("/admin/create-course")}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Create Course
            </Button>
          </div>

          {/* Enhanced Search and Filter Controls */}
          <div className="flex flex-col gap-4 mt-4">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search courses by title or description..."
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Search Field Selector */}
              {searchInput && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Search in:
                  </span>
                  <select
                    value={searchField}
                    onChange={(e) =>
                      handleSearchFieldChange(
                        e.target.value as "title" | "description" | "both"
                      )
                    }
                    className="border border-input rounded-md px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground"
                  >
                    <option value="both">Title & Description</option>
                    <option value="title">Title Only</option>
                    <option value="description">Description Only</option>
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    handleStatusFilter(e.target.value as COURSE_STATUS | "ALL")
                  }
                  className="border border-input rounded-md px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground"
                >
                  <option value="ALL">All Status</option>
                  <option value={COURSE_STATUS.DRAFT}>Draft</option>
                  <option value={COURSE_STATUS.PUBLISHED}>Published</option>
                  <option value={COURSE_STATUS.ARCHIVED}>Archived</option>
                </select>
              </div>

              <Select
                value={coursePriceFilterValue}
                onValueChange={handlePriceFilter}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Select Pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"All Prices"}>All Prices</SelectItem>
                  <SelectItem value={"Zero Price"}>Zero Price</SelectItem>
                  <SelectItem value={"Non Zero Price"}>
                    Non Zero Price
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {courses.data.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {isFiltered ? "No courses found" : "No courses"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isFiltered
                  ? "Try adjusting your search or filters."
                  : "Get started by creating your first course."}
              </p>
              {isFiltered && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              )}
              {!isFiltered && (
                <div className="mt-4">
                  <Button
                    variant="pill"
                    size="sm"
                    onClick={() => navigate("/admin/create-course")}
                    className="inline-flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create Course
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Items Per Page Selector and Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="text-sm text-muted-foreground">
                  Showing {courses.data.length} of {courses.totalCount} total
                  courses
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Show:
                  </span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    per page
                  </span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>CourseId</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.data.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                           {isProbablyHtml(course.description) ? (
    <div
      className="prose prose-sm max-w-none dark:prose-invert line-clamp-2"
      dangerouslySetInnerHTML={{ __html: course.description || '' }}
    />
  ) : (
    <span>{course.description}</span>
  )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(course.status)}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          course.salePrice || course.regularPrice
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {course.updatedAt?.toString?.() || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/admin/edit-course/${course.id}`)
                            }
                            title="Edit course"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/courses/${course.slug}`)}
                            title="View course"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCourse(course);
                              setConfirmOpen(true);
                            }}
                            title="Delete course"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  Page {paginationState.currentPage} of{" "}
                  {Math.ceil(courses.totalCount / itemsPerPage)}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={
                      !courses.hasPreviousPage ||
                      paginationState.currentPage === 1 ||
                      isLoading
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!courses.hasNextPage || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedCourse(null);
        }}
        onConfirm={deleteCourse}
        title="Delete Course"
        body={`Are you sure you want to delete "${selectedCourse?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </AdminLayout>
  );
};

export default AdminCourses;

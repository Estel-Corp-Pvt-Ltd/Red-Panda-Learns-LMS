import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { courseService } from "@/services/courseService";
import { useDebounce } from "@/hooks/useDebounce";
import { Course } from "@/types/course";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  MessageSquare,
  Star,
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
import Leaderboard from "@/components/Leaderboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/utils/date-time";

// Leaderboard Modal Component
function LeaderboardModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  currentUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  currentUserId?: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{courseName} - Leaderboard</DialogTitle>
        </DialogHeader>
        <Leaderboard courseId={courseId} currentUserId={currentUserId} itemsPerPage={15} />
      </DialogContent>
    </Dialog>
  );
}

interface PaginatedCourses {
  data: Course[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState<COURSE_STATUS | "ALL">("ALL");
  const [coursePriceFilterValue, setCoursePriceFilterValue] =
    useState<CoursePriceFilter>("All Prices");
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  // Leaderboard modal state
  const [leaderboardModal, setLeaderboardModal] = useState<{
    isOpen: boolean;
    courseId: string;
    courseName: string;
  }>({
    isOpen: false,
    courseId: "",
    courseName: "",
  });

  // Track previous filter values to detect filter changes vs page changes
  const [prevFilters, setPrevFilters] = useState({
    searchQuery,
    statusFilter,
    coursePriceFilterValue,
    itemsPerPage,
  });

  useEffect(() => {
    const filtersChanged =
      prevFilters.searchQuery !== searchQuery ||
      prevFilters.statusFilter !== statusFilter ||
      prevFilters.coursePriceFilterValue !== coursePriceFilterValue ||
      prevFilters.itemsPerPage !== itemsPerPage;

    if (filtersChanged) {
      setPrevFilters({ searchQuery, statusFilter, coursePriceFilterValue, itemsPerPage });
      if (currentPage !== 1) {
        setCurrentPage(1);
        return; // performSearch will be called when currentPage updates
      }
    }

    performSearch();
  }, [searchQuery, statusFilter, coursePriceFilterValue, currentPage, itemsPerPage]);

  const isProbablyHtml = (text?: string | null) => {
    if (!text) return false;
    const trimmed = text.trim();
    return trimmed.startsWith("<") && /<\/[a-z][\s\S]*>/i.test(trimmed);
  };

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const filters: string[] = [];
      if (statusFilter !== "ALL") {
        filters.push(`status = "${statusFilter}"`);
      }
      if (coursePriceFilterValue === "Non Zero Price") {
        filters.push("salePrice > 0");
      } else if (coursePriceFilterValue === "Zero Price") {
        filters.push("salePrice = 0");
      }

      const offset = (currentPage - 1) * itemsPerPage;
      const result = await courseService.searchCourses(searchQuery, {
        limit: itemsPerPage,
        offset,
        filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      });

      if (result.success && result.data) {
        setCourses({
          data: result.data.data,
          hasNextPage: result.data.hasNextPage,
          hasPreviousPage: result.data.hasPreviousPage,
          totalCount: result.data.totalCount,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to search courses",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching courses:", error);
      toast({
        title: "Error",
        description: "An error occurred while searching courses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLeaderboard = (courseId: string, courseName: string) => {
    setLeaderboardModal({
      isOpen: true,
      courseId,
      courseName,
    });
  };

  const handleCloseLeaderboard = () => {
    setLeaderboardModal({
      isOpen: false,
      courseId: "",
      courseName: "",
    });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
  };

  const handleNextPage = () => {
    if (!courses.hasNextPage || isLoading) return;
    setCurrentPage((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    if (!courses.hasPreviousPage || isLoading) return;
    setCurrentPage((prev) => prev - 1);
  };

  const clearSearch = () => {
    setSearchInput("");
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setStatusFilter("ALL");
    setCoursePriceFilterValue("All Prices");
    setItemsPerPage(10);
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

      await performSearch();
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
    searchQuery || statusFilter !== "ALL" || coursePriceFilterValue !== "All Prices";

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Courses</CardTitle>
              <CardDescription>
                Manage your courses and their settings.
                {courses.totalCount > 0 && ` (Page ${currentPage})`}
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

          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search courses by title or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
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

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as COURSE_STATUS | "ALL")}
                  className="border border-input rounded-md px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground"
                >
                  <option value="ALL">All Status</option>
                  <option value={COURSE_STATUS.DRAFT}>Draft</option>
                  <option value={COURSE_STATUS.PUBLISHED}>Published</option>
                  <option value={COURSE_STATUS.ARCHIVED}>Archived</option>
                </select>
              </div>

              {/* Price Filter */}
              <Select
                value={coursePriceFilterValue}
                onValueChange={(v) => setCoursePriceFilterValue(v as CoursePriceFilter)}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Select Pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"All Prices"}>All Prices</SelectItem>
                  <SelectItem value={"Zero Price"}>Zero Price</SelectItem>
                  <SelectItem value={"Non Zero Price"}>Non Zero Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-2">Loading courses...</p>
              </div>
            </div>
          ) : courses.data.length === 0 ? (
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
                <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
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
                  Showing {courses.data.length} of {courses.totalCount} total courses
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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
                  <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
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
                                dangerouslySetInnerHTML={{ __html: course.description || "" }}
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
                        {formatCurrency(course.salePrice || course.regularPrice)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {course.updatedAt ? formatDate(course.updatedAt) : "N/A"}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-center gap-2">
                          {/* Leaderboard */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLeaderboard(course.id, course.title)}
                            title="View Leaderboard"
                          >
                            <Star className="h-4 w-4 text-yellow-500" />
                          </Button>

                          {/* Edit course */}
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/admin/edit-course/${course.id}`} title="Edit course">
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* View course */}
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/courses/${course.slug}`} title="View course">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* Delete */}
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

                          {/* Forum */}
                          {course.isForumEnabled && (
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/courses/${course.slug}/forum`} title="View Forum">
                                <MessageSquare className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(courses.totalCount / itemsPerPage)}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!courses.hasPreviousPage || currentPage === 1 || isLoading}
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
      {leaderboardModal.isOpen && (
        <LeaderboardModal
          isOpen={leaderboardModal.isOpen}
          onClose={handleCloseLeaderboard}
          courseId={leaderboardModal.courseId}
          courseName={leaderboardModal.courseName}
          currentUserId={user?.id || undefined}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCourses;

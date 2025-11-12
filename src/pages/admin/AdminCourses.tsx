import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '@/services/courseService';
import { Course } from '@/types/course';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COURSE_STATUS, CURRENCY } from '@/constants';

import AdminLayout from '@/components/AdminLayout';
import { toast } from '@/hooks/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaginatedCourses {
  data: Course[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
};

type COURSE_STATUS = typeof COURSE_STATUS[keyof typeof COURSE_STATUS];

type CoursePriceFilter = "Zero Price" | "Non Zero Price" | "All Prices";

const AdminCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<PaginatedCourses>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<COURSE_STATUS | 'ALL'>('ALL');
  const [searchField, setSearchField] = useState<'title' | 'description' | 'both'>('both');
  const [allCourses, setAllCourses] = useState<Course[]>([]); // For client-side search
  const [useClientSearch, setUseClientSearch] = useState(false);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });
  const [coursePriceFilterValue, setCoursePriceFilterValue] = useState<CoursePriceFilter>("All Prices");

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPaginationState(prev => ({ ...prev, cursor: null, currentPage: 1 }));
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
    if (useClientSearch && searchQuery) {
      // Use client-side search
      performClientSearch();
    } else {
      // Use server-side search
      loadCourses();
    }
  }, [searchQuery, statusFilter, paginationState.cursor, paginationState.pageDirection, useClientSearch]);

  const loadAllCourses = async () => {
    try {
      const result = await courseService.getAllCourses();
      setAllCourses(result);
    } catch (error) {
      console.error('Error loading all courses:', error);
    }
  };

  const performClientSearch = () => {
    setIsLoading(true);

    try {
      let filteredCourses = allCourses;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredCourses = filteredCourses.filter(course => {
          const titleMatch = course.title?.toLowerCase().includes(query);
          const descriptionMatch = course.description?.toLowerCase().includes(query);

          if (searchField === 'title') return titleMatch;
          if (searchField === 'description') return descriptionMatch;
          return titleMatch || descriptionMatch;
        });
      }

      // Apply status filter
      if (statusFilter !== 'ALL') {
        filteredCourses = filteredCourses.filter(course => course.status === statusFilter);
      }

      // Apply pagination
      const startIndex = (paginationState.currentPage - 1) * 10;
      const paginatedCourses = filteredCourses.slice(startIndex, startIndex + 10);

      setCourses({
        data: paginatedCourses,
        hasNextPage: startIndex + 10 < filteredCourses.length,
        hasPreviousPage: paginationState.currentPage > 1,
        totalCount: filteredCourses.length
      });
    } catch (error) {
      console.error('Error performing client search:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while searching courses',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourses = async (options = {}) => {
    setIsLoading(true);
    try {
      // Build filters array for server-side search
      const filters = [];

      // Add search filter if query exists (server-side approach)
      if (searchQuery.trim() && !useClientSearch) {
        // For server-side, we'll use title search as Firestore doesn't support case-insensitive well
        filters.push({
          field: 'title',
          op: '>=',
          value: searchQuery.toLowerCase()
        }, {
          field: 'title',
          op: '<=',
          value: searchQuery.toLowerCase() + '\uf8ff'
        });
      }

      // Add status filter if not 'ALL'
      if (statusFilter !== 'ALL') {
        filters.push({
          field: 'status',
          op: '==',
          value: statusFilter
        });
      }

      const result = await courseService.getCourses(filters, {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        cursor: paginationState.cursor,
        pageDirection: paginationState.pageDirection,
        ...options
      });

      if (result.success) {
        // If we have a search query, perform case-insensitive filtering on client side
        let finalCourses = result.data.data;

        if (searchQuery.trim() && !useClientSearch) {
          const query = searchQuery.toLowerCase();
          finalCourses = finalCourses.filter(course => {
            const titleMatch = course.title?.toLowerCase().includes(query);
            const descriptionMatch = course.description?.toLowerCase().includes(query);

            if (searchField === 'title') return titleMatch;
            if (searchField === 'description') return descriptionMatch;
            return titleMatch || descriptionMatch;
          });
        }

        setCourses({
          ...result.data,
          data: finalCourses,
          totalCount: finalCourses.length
        });
      } else {
        console.error('Failed to load courses:', result.error);
        toast({
          title: 'Error',
          description: 'Failed to load courses',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while loading courses',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!courses.hasNextPage) return;

    if (useClientSearch && searchQuery) {
      setPaginationState(prev => ({
        ...prev,
        currentPage: prev.currentPage + 1
      }));
    } else {
      setPaginationState(prev => ({
        cursor: courses.nextCursor,
        pageDirection: 'next',
        currentPage: prev.currentPage + 1
      }));
    }
  };

  const handlePreviousPage = async () => {
    if (!courses.hasPreviousPage) return;

    if (useClientSearch && searchQuery) {
      setPaginationState(prev => ({
        ...prev,
        currentPage: prev.currentPage - 1
      }));
    } else {
      setPaginationState(prev => ({
        cursor: courses.previousCursor,
        pageDirection: 'previous',
        currentPage: prev.currentPage - 1
      }));
    }
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);

    // Switch to client-side search for better case-insensitive support
    if (value.trim().length > 0 && !useClientSearch) {
      setUseClientSearch(true);
    } else if (value.trim().length === 0 && useClientSearch) {
      setUseClientSearch(false);
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setUseClientSearch(false);
  };

  const handleStatusFilter = (status: COURSE_STATUS | 'ALL') => {
    setStatusFilter(status);
    setPaginationState(prev => ({ ...prev, cursor: null, currentPage: 1 }));
  };

  const handleSearchFieldChange = (field: 'title' | 'description' | 'both') => {
    setSearchField(field);
    // Trigger new search when field changes
    if (searchQuery) {
      setPaginationState(prev => ({ ...prev, cursor: null, currentPage: 1 }));
    }
  };

  const deleteCourse = async () => {
    if (!selectedCourse) return;

    const result = await courseService.deleteCourse(selectedCourse.id);
    if (!result.success) {
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Course deleted successfully',
    });

    // Reload courses to reflect deletion
    if (useClientSearch) {
      loadAllCourses();
      performClientSearch();
    } else {
      await loadCourses();
    }
    setConfirmOpen(false);
    setSelectedCourse(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: CURRENCY.INR
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
                {courses.totalCount > 0 && ` (Page ${paginationState.currentPage})`}
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
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Search in:</span>
                  <select
                    value={searchField}
                    onChange={(e) => handleSearchFieldChange(e.target.value as 'title' | 'description' | 'both')}
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
                  onChange={(e) => handleStatusFilter(e.target.value as COURSE_STATUS | 'ALL')}
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
                onValueChange={(val) => setCoursePriceFilterValue(val as CoursePriceFilter)}
              >
                <SelectTrigger className='w-fit'>
                  <SelectValue placeholder="Select Pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"All"}>
                    ALL
                  </SelectItem>
                  <SelectItem value={"Zero Price"}>
                    ZERO
                  </SelectItem>
                  <SelectItem value={"Non Zero Price"}>
                    NON ZERO
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
                {searchQuery || statusFilter !== 'ALL' ? 'No courses found' : 'No courses'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by creating your first course.'
                }
              </p>
              {(searchQuery || statusFilter !== 'ALL') && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchInput('');
                    setStatusFilter('ALL');
                    setUseClientSearch(false);
                  }}
                >
                  Clear all filters
                </Button>
              )}
              {!searchQuery && statusFilter === 'ALL' && (
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.data.filter(course => coursePriceFilterValue === "All Prices" ? true : (
                    coursePriceFilterValue === "Non Zero Price" ? course.salePrice > 0 : course.salePrice === 0
                  )).map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {course.title}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(course.status)}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(course.regularPrice)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {course.updatedAt?.toString?.() || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/edit-course/${course.id}`)}
                            title="Edit course"
                          >
                            <Edit className="h-4 w-4" />
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
                  Showing {courses.data.length} of {courses.totalCount} courses
                  {courses.totalCount > courses.data.length &&
                    ` (page ${paginationState.currentPage})`
                  }
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!courses.hasPreviousPage || isLoading}
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

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LESSON_TYPE } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { lessonService } from "@/services/lessonService";
import { courseService } from "@/services/courseService";
import { Course } from "@/types/course";
import { logError } from "@/utils/logger";
import { Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type ImportCourseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (courses: Course[]) => void;
};

interface PaginatedCourses {
  data: Course[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export const ImportCourseModal = ({
  isOpen,
  onClose,
  onImport,
}: ImportCourseModalProps) => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<PaginatedCourses>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [selectedCourses, setSelectedCourses] = useState<Set<Course>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPaginationState(prev => ({ ...prev, cursor: null, currentPage: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load courses when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      loadCourses();
    }
  }, [isOpen, searchQuery, paginationState.cursor, paginationState.pageDirection, itemsPerPage]);

  // Add scroll management
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Reset state when modal closes
      setSelectedCourses(new Set());
      setSearchInput('');
      setSearchQuery('');
      setPaginationState({
        cursor: null,
        pageDirection: 'next',
        currentPage: 1
      });
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const filters = [];

      // Add search filter if query exists
      if (searchQuery.trim()) {
        filters.push({
          field: 'title',
          op: '>=',
          value: searchQuery
        }, {
          field: 'title',
          op: '<=',
          value: searchQuery + '\uf8ff'
        });
      }

      const result = await courseService.getCourses(filters, {
        limit: itemsPerPage,
        orderBy: { field: 'title', direction: 'asc' },
        cursor: paginationState.cursor,
        pageDirection: paginationState.pageDirection,
      });

      if (result.success && result.data) {
        setCourses({
          data: result.data.data,
          hasNextPage: result.data.hasNextPage,
          hasPreviousPage: result.data.hasPreviousPage,
          nextCursor: result.data.nextCursor,
          previousCursor: result.data.previousCursor,
          totalCount: result.data.totalCount || result.data.data.length
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load courses",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: "Error",
        description: "An error occurred while loading courses",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setPaginationState(prev => ({
      ...prev,
      cursor: null,
      currentPage: 1
    }));
  };

  const handleNextPage = () => {
    if (!courses.hasNextPage || isLoading) return;
    setPaginationState(prev => ({
      cursor: courses.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));
  };

  const handlePreviousPage = () => {
    if (!courses.hasPreviousPage || isLoading) return;
    setPaginationState(prev => ({
      cursor: courses.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setPaginationState(prev => ({
      ...prev,
      cursor: null,
      currentPage: 1
    }));
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPaginationState(prev => ({
      ...prev,
      cursor: null,
      currentPage: 1
    }));
  };

  const toggleCourseSelection = (course: Course) => {
    const newSelection = new Set(selectedCourses);
    if (newSelection.has(course)) {
      newSelection.delete(course);
    } else {
      newSelection.add(course);
    }
    setSelectedCourses(newSelection);
  };

  const handleImport = async () => {
    try {
      onImport && onImport(Array.from(selectedCourses));
      toast({
        title: "Success",
        description: `${selectedCourses.size} course(s) imported successfully`
      });
      onClose();
    } catch (error) {
      console.error('Error importing courses:', error);
      toast({
        title: "Error",
        description: "Failed to import courses",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Courses</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select courses to import into your bundle. The current course is excluded from the list.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-none shadow-none bg-transparent flex-1 flex flex-col overflow-hidden">
          <CardContent className="pt-2 flex-1 overflow-hidden overflow-y-scroll h-full flex flex-col">
            {/* Search and Controls */}
            <div className="space-y-4 mb-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search courses by title..."
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

              {/* Items Per Page and Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {courses.totalCount > 0 ? (
                    <>
                      Showing {courses.data.length} of {courses.totalCount} courses
                      {selectedCourses.size > 0 && ` • ${selectedCourses.size} selected`}
                    </>
                  ) : (
                    "No courses found"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Show:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map(option => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Courses List */}
            <div className="flex-1 h-full overflow-y-scroll overflow-hidden border rounded-lg">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading courses...</span>
                </div>
              ) : courses.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? `No courses found matching "${searchQuery}"` : 'No courses available to import'}
                </div>
              ) : (
                <div >
                  {courses.data.map((course) => (
                    <div
                      key={course.id}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${selectedCourses.has(course) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      onClick={() => toggleCourseSelection(course)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={selectedCourses.has(course)}
                              onChange={() => toggleCourseSelection(course)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <h3 className="font-medium text-sm">{course.title}</h3>
                          </div>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {course.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Price: {formatCurrency(course.salePrice || course.regularPrice)}</span>
                            <span>Status: {course.status}</span>
                            <span>Instructor: {course.instructorName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {courses.data.length > 0 && (
              <div className="flex items-center justify-between space-x-2 pt-4 border-t">
                <div className="flex-1 text-sm text-muted-foreground">
                  Page {paginationState.currentPage} of {Math.ceil(courses.totalCount / itemsPerPage)}
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
            )}
          </CardContent>

          <CardFooter className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              disabled={selectedCourses.size === 0 || isLoading}
              onClick={handleImport}
            >
              Import Selected Courses ({selectedCourses.size})
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

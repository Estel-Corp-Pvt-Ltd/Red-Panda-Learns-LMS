import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '@/services/courseService';
import { Course } from '@/types/course';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2, PlusCircle, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COURSE_STATUS, CURRENCY } from '@/constants';
import AdminLayout from '@/components/AdminLayout';
import { toast } from '@/hooks/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';

interface PaginatedCourses {
  data: Course[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

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
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  const loadCourses = async (options = {}) => {
    setIsLoading(true);
    try {
      const result = await courseService.getCourses([], {
        limit: 5,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setCourses(prev => ({
          ...result.data,
          totalCount: result.data.data.length // You might want to get actual total count from your API
        }));
      } else {
        console.error('Failed to load courses:', result.error);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!courses.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: courses.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadCourses({
      cursor: courses.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!courses.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: courses.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadCourses({
      cursor: courses.previousCursor,
      pageDirection: 'previous'
    });
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
    await loadCourses();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: CURRENCY.INR
    }).format(amount);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  if (isLoading) {
    return (
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
              onClick={() => navigate("/admin/create-course")}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Create Course
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {courses.data.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No courses
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first course.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => navigate("/admin/create-course")}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Course
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.data.map((course) => (
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
                        <Badge
                          variant={
                            course.status === COURSE_STATUS.PUBLISHED
                              ? "default"
                              : course.status === COURSE_STATUS.DRAFT
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(course.regularPrice)}
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
                  Showing {courses.data.length} courses
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
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          deleteCourse();
          setConfirmOpen(false);
        }}
        title="Delete"
        body="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </AdminLayout>
  );
};

export default AdminCourses;

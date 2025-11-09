import AdminLayout from '@/components/AdminLayout';
import { enrollmentService } from '@/services/enrollmentService';
import { courseService } from '@/services/courseService';
import { userService } from '@/services/userService';
import { Course } from '@/types/course';
import { User } from '@/types/user';
import { PaginatedResult } from '@/utils/pagination';
import { Search, Mail, BookOpen, CheckCircle, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { COURSE_STATUS } from '@/constants';
import { WhereFilterOp } from 'firebase/firestore';

const EnrollStudent: React.FC = () => {
  const [studentEmail, setStudentEmail] = useState('');
  const [student, setStudent] = useState<User | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [paginatedCourses, setPaginatedCourses] = useState<PaginatedResult<Course>>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    nextCursor: null,
    previousCursor: null
  });
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });
  const [loadingAllCourses, setLoadingAllCourses] = useState(false);

  // Load all courses for comprehensive search
  useEffect(() => {
    if (courseSearch.trim()) {
      loadAllCourses();
    } else {
      loadPaginatedCourses();
    }
  }, [courseSearch, paginationState.cursor, paginationState.pageDirection]);

  const loadAllCourses = async () => {
    setLoadingAllCourses(true);
    try {
      const filters: { field: keyof Course; op: WhereFilterOp; value: any }[] = [
        { field: 'status', op: '==', value: COURSE_STATUS.PUBLISHED }
      ];

      // Load all published courses without pagination for comprehensive search
      let allCoursesData: Course[] = [];
      let hasMore = true;
      let currentCursor = null;

      while (hasMore) {
        const result = await courseService.getCourses(filters, {
          limit: 50,
          orderBy: { field: 'title', direction: 'asc' },
          cursor: currentCursor,
          pageDirection: 'next',
        });

        if (result.success && result.data) {
          allCoursesData = [...allCoursesData, ...result.data.data];
          hasMore = result.data.hasNextPage;
          currentCursor = result.data.nextCursor;
        } else {
          hasMore = false;
        }
      }

      setAllCourses(allCoursesData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load courses', variant: 'destructive' });
    } finally {
      setLoadingAllCourses(false);
    }
  };

  const loadPaginatedCourses = async () => {
    setLoading(true);
    try {
      const filters: { field: keyof Course; op: WhereFilterOp; value: any }[] = [
        { field: 'status', op: '==', value: COURSE_STATUS.PUBLISHED }
      ];

      const result = await courseService.getCourses(filters, {
        limit: 10,
        orderBy: { field: 'title', direction: 'asc' },
        cursor: paginationState.cursor,
        pageDirection: paginationState.pageDirection,
      });

      if (result.success && result.data) {
        setPaginatedCourses(result.data);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load courses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (!paginatedCourses.hasNextPage) return;
    setPaginationState(prev => ({
      cursor: paginatedCourses.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));
  };

  const handlePreviousPage = () => {
    if (!paginatedCourses.hasPreviousPage) return;
    setPaginationState(prev => ({
      cursor: paginatedCourses.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));
  };

  const findStudent = async () => {
    if (!studentEmail.trim()) {
      toast({ title: 'Error', description: 'Enter student email', variant: 'destructive' });
      return;
    }

    setSearching(true);
    try {
      const result = await userService.getUserByEmail(studentEmail.trim());
      if (result.success && result.data) {
        setStudent(result.data);
        toast({ title: 'Success', description: 'Student found' });
      } else {
        setStudent(null);
        toast({ title: 'Error', description: 'Student not found', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Search failed', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const enrollStudent = async () => {
    if (!student) {
      toast({ title: 'Error', description: 'Find student first', variant: 'destructive' });
      return;
    }
    if (selectedCourses.length === 0) {
      toast({ title: 'Error', description: 'Select at least one course', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await enrollmentService.enrollUser(student.email, selectedCourses);
      if (result.success) {
        toast({ title: 'Success', description: 'Student enrolled successfully' });
        // Reset form
        setSelectedCourses([]);
        setStudent(null);
        setStudentEmail('');
      } else {
        throw new Error('Enrollment failed');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Enrollment failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string, selected: boolean) => {
    setSelectedCourses(prev =>
      selected ? [...prev, courseId] : prev.filter(id => id !== courseId)
    );
  };

  const clearCourseSearch = () => {
    setCourseSearch('');
    setPaginationState(prev => ({ ...prev, cursor: null, currentPage: 1 }));
  };

  const getStudentName = (user: User) => {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  };

  // Client-side search filtering across all courses
  const filteredCourses = courseSearch.trim()
    ? allCourses.filter(course => {
      const searchTerm = courseSearch.toLowerCase();
      const titleMatch = course.title?.toLowerCase().includes(searchTerm);
      const descriptionMatch = course.description?.toLowerCase().includes(searchTerm);
      return titleMatch || descriptionMatch;
    })
    : paginatedCourses.data;

  const isSearching = courseSearch.trim().length > 0;
  const displayCourses = isSearching ? filteredCourses : paginatedCourses.data;
  const isLoading = loading || (isSearching && loadingAllCourses);

  return (
    <AdminLayout>
      <div className="mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Enroll Student</h1>
          <p className="text-muted-foreground">Manually enroll students in courses</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Student email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && findStudent()}
                  className="flex-1"
                />
                <Button onClick={findStudent} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </div>

              {student && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{getStudentName(student)}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {student.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Student:</span>
                  <span className="font-medium">{student ? getStudentName(student) : 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Courses Selected:</span>
                  <span className="font-medium">{selectedCourses.length}</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={enrollStudent}
                disabled={!student || selectedCourses.length === 0 || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Enroll Student
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Course Selection */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Available Courses
                {displayCourses.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({displayCourses.length} {isSearching ? 'found' : 'courses'})
                  </span>
                )}
              </CardTitle>

              <div className="flex items-center gap-4">
                {/* Course Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search courses by title or description..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="pl-10 pr-10 w-64"
                  />
                  {courseSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCourseSearch}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">
                  {isSearching ? 'Searching all courses...' : 'Loading courses...'}
                </span>
              </div>
            ) : displayCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isSearching
                  ? `No courses found matching "${courseSearch}"`
                  : 'No published courses available'
                }
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {displayCourses.map((course) => (
                    <div key={course.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Checkbox
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={(checked) => toggleCourse(course.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{course.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {course.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls - Only show when not searching */}
                {!isSearching && paginatedCourses.data.length > 0 && (
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                      Page {paginationState.currentPage}
                      {paginatedCourses.hasNextPage && ` (${paginatedCourses.data.length} of many)`}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={!paginatedCourses.hasPreviousPage || loading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={!paginatedCourses.hasNextPage || loading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EnrollStudent;

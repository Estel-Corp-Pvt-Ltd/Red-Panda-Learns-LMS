import AdminLayout from '@/components/AdminLayout';
import { enrollmentService } from '@/services/enrollmentService';
import { courseService } from '@/services/courseService';
import { userService } from '@/services/userService';
import { bundleService } from '@/services/bundleService';
import { Course } from '@/types/course';
import { User } from '@/types/user';
import { Bundle } from '@/types/bundle';
import { PaginatedResult } from '@/utils/pagination';
import { Search, Mail, BookOpen, CheckCircle, Loader2, X, ChevronLeft, ChevronRight, Package, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { COURSE_STATUS, BUNDLE_STATUS } from '@/constants';
import { WhereFilterOp } from 'firebase/firestore';
import { TransactionLineItem } from '@/types/transaction';

const EnrollStudent: React.FC = () => {
  const [studentEmail, setStudentEmail] = useState('');
  const [student, setStudent] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [selectedBundles, setSelectedBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [bundleSearch, setBundleSearch] = useState('');
  const [pagination, setPagination] = useState({
    hasNextPage: false,
    hasPreviousPage: false,
    nextCursor: null as any,
    previousCursor: null as any,
    currentPage: 1
  });

  // Load courses and bundles
  useEffect(() => {
    loadCourses();
    loadBundles();
  }, [courseSearch, bundleSearch, pagination.currentPage]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const filters: { field: keyof Course; op: WhereFilterOp; value: any }[] = [
        { field: 'status', op: '==', value: COURSE_STATUS.PUBLISHED }
      ];

      if (courseSearch.trim()) {
        filters.push({ field: 'title', op: '>=', value: courseSearch });
        filters.push({ field: 'title', op: '<=', value: courseSearch + '\uf8ff' });
      }

      const result = await courseService.getCourses(filters, {
        limit: 10,
        orderBy: { field: 'title', direction: 'asc' },
        cursor: courseSearch.trim() ? null : pagination.nextCursor || pagination.previousCursor,
        pageDirection: pagination.nextCursor ? 'next' : 'previous',
      });

      if (result.success && result.data) {
        setCourses(result.data.data);
        setPagination(prev => ({
          ...prev,
          hasNextPage: result.data!.hasNextPage,
          hasPreviousPage: result.data!.hasPreviousPage,
          nextCursor: result.data!.nextCursor,
          previousCursor: result.data!.previousCursor
        }));
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast({ title: 'Error', description: 'Failed to load courses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadBundles = async () => {
    try {
      const filters: { field: keyof Bundle; op: WhereFilterOp; value: any }[] = [
        { field: 'status', op: '==', value: BUNDLE_STATUS.PUBLISHED }
      ];

      if (bundleSearch.trim()) {
        filters.push({ field: 'title', op: '>=', value: bundleSearch });
        filters.push({ field: 'title', op: '<=', value: bundleSearch + '\uf8ff' });
      }

      const result = await bundleService.getBundles(filters, {
        limit: 10,
        orderBy: { field: 'title', direction: 'asc' },
        cursor: null,
        pageDirection: 'next',
      });

      if (result.success && result.data) {
        setBundles(result.data.data);
      }
    } catch (error) {
      console.error('Failed to load bundles:', error);
      toast({ title: 'Error', description: 'Failed to load bundles', variant: 'destructive' });
    }
  };

  const handleNextPage = () => {
    if (!pagination.hasNextPage || loading) return;
    setPagination(prev => ({
      ...prev,
      currentPage: prev.currentPage + 1
    }));
  };

  const handlePreviousPage = () => {
    if (!pagination.hasPreviousPage || loading) return;
    setPagination(prev => ({
      ...prev,
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
      console.error('Student search failed:', error);
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
    if (selectedCourses.length === 0 && selectedBundles.length === 0) {
      toast({ title: 'Error', description: 'Select at least one course or bundle', variant: 'destructive' });
      return;
    }

    const items: TransactionLineItem[] = [];
    selectedCourses.forEach(course => items.push({ itemId: course.id, itemType: 'COURSE', amount: 0, name: course.title }));
    selectedBundles.forEach(bundle => items.push({ itemId: bundle.id, itemType: 'BUNDLE', amount: 0, name: bundle.title }));

    setLoading(true);
    try {
      const result = await enrollmentService.enrollUser(
        student.email,
        items,
      );
      if (result.success) {
        toast({ title: 'Success', description: 'Student enrolled successfully' });
        // Reset form
        setSelectedCourses([]);
        setSelectedBundles([]);
        setStudent(null);
        setStudentEmail('');
      } else {
        throw new Error('Enrollment failed');
      }
    } catch (error) {
      console.error('Enrollment failed:', error);
      toast({ title: 'Error', description: 'Enrollment failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (course: Course, selected: boolean) => {
    setSelectedCourses(prev =>
      selected ? [...prev, course] : prev.filter(c => c.id !== course.id)
    );
  };

  const toggleBundle = (bundle: Bundle, selected: boolean) => {
    setSelectedBundles(prev =>
      selected ? [...prev, bundle] : prev.filter(b => b.id !== bundle.id)
    );
  };

  const removeCourse = (courseId: string) => {
    setSelectedCourses(prev => prev.filter(c => c.id !== courseId));
  };

  const removeBundle = (bundleId: string) => {
    setSelectedBundles(prev => prev.filter(b => b.id !== bundleId));
  };

  const clearCourseSearch = () => {
    setCourseSearch('');
    setPagination({
      hasNextPage: false,
      hasPreviousPage: false,
      nextCursor: null,
      previousCursor: null,
      currentPage: 1
    });
  };

  const clearBundleSearch = () => {
    setBundleSearch('');
  };

  const handleCourseSearchChange = (searchTerm: string) => {
    setCourseSearch(searchTerm);
    if (searchTerm !== courseSearch) {
      setPagination({
        hasNextPage: false,
        hasPreviousPage: false,
        nextCursor: null,
        previousCursor: null,
        currentPage: 1
      });
    }
  };

  const handleBundleSearchChange = (searchTerm: string) => {
    setBundleSearch(searchTerm);
  };

  const getStudentName = (user: User) => {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  };

  const getTotalSelected = () => {
    return selectedCourses.length + selectedBundles.length;
  };

  return (
    <AdminLayout>
      <div className="mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Enroll Student</h1>
          <p className="text-muted-foreground">Manually enroll students in courses and bundles</p>
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
                  <span>Total Items:</span>
                  <span className="font-bold">{getTotalSelected()}</span>
                </div>
              </div>

              {/* Selected Courses List */}
              {selectedCourses.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Selected Courses
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedCourses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span className="truncate flex-1">{course.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCourse(course.id)}
                          className="h-6 w-6 p-0 ml-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Bundles List */}
              {selectedBundles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Selected Bundles
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedBundles.map((bundle) => (
                      <div key={bundle.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span className="truncate flex-1">{bundle.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBundle(bundle.id)}
                          className="h-6 w-6 p-0 ml-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={enrollStudent}
                disabled={!student || getTotalSelected() === 0 || loading}
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

        {/* Course and Bundle Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Courses Column */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Available Courses
                </CardTitle>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search courses..."
                      value={courseSearch}
                      onChange={(e) => handleCourseSearchChange(e.target.value)}
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
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading courses...</span>
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {courseSearch
                    ? `No courses found matching "${courseSearch}"`
                    : 'No published courses available'
                  }
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Checkbox
                          checked={selectedCourses.some(c => c.id === course.id)}
                          onCheckedChange={(checked) => toggleCourse(course, checked as boolean)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{course.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </div>
                          <div className="text-sm text-green-600 font-medium mt-1">
                            ₹{course.salePrice || course.regularPrice}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!courseSearch && courses.length > 0 && (
                    <div className="flex items-center justify-between space-x-2 py-4">
                      <div className="flex-1 text-sm text-muted-foreground">
                        Page {pagination.currentPage}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={!pagination.hasPreviousPage || loading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={!pagination.hasNextPage || loading}
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

          {/* Bundles Column */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Available Bundles
                </CardTitle>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search bundles..."
                      value={bundleSearch}
                      onChange={(e) => handleBundleSearchChange(e.target.value)}
                      className="pl-10 pr-10 w-64"
                    />
                    {bundleSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearBundleSearch}
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
              {bundles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {bundleSearch
                    ? `No bundles found matching "${bundleSearch}"`
                    : 'No published bundles available'
                  }
                </div>
              ) : (
                <div className="space-y-3">
                  {bundles.map((bundle) => (
                    <div key={bundle.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Checkbox
                        checked={selectedBundles.some(b => b.id === bundle.id)}
                        onCheckedChange={(checked) => toggleBundle(bundle, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{bundle.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {bundle.description}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-sm text-green-600 font-medium">
                            ₹{bundle.salePrice}
                          </div>
                          {bundle.regularPrice > bundle.salePrice && (
                            <div className="text-sm text-muted-foreground line-through">
                              ₹{bundle.regularPrice}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            • {bundle.courses?.length || 0} courses
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EnrollStudent;

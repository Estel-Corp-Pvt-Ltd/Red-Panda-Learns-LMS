import AdminLayout from '@/components/AdminLayout';
import { enrollmentService } from '@/services/enrollmentService';
import { courseService } from '@/services/courseService';
import { userService } from '@/services/userService';
import { bundleService } from '@/services/bundleService';
import { Course } from '@/types/course';
import { User } from '@/types/user';
import { Bundle } from '@/types/bundle';
import { Search, Mail, BookOpen, CheckCircle, Loader2, X, ChevronLeft, ChevronRight, Package, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { TransactionLineItem } from '@/types/transaction';

const ITEMS_PER_PAGE = 10;

const EnrollStudent: React.FC = () => {
  const [studentEmail, setStudentEmail] = useState('');
  const [student, setStudent] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [selectedBundles, setSelectedBundles] = useState<Bundle[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [searching, setSearching] = useState(false);

  // Course search
  const [courseSearchInput, setCourseSearchInput] = useState('');
  const courseSearch = useDebounce(courseSearchInput, 400);
  const [courseLoading, setCourseLoading] = useState(false);
  const [coursePage, setCoursePage] = useState(1);
  const [courseTotalCount, setCourseTotalCount] = useState(0);
  const [courseHasNext, setCourseHasNext] = useState(false);
  const [courseHasPrev, setCourseHasPrev] = useState(false);
  const prevCourseSearch = useRef(courseSearch);

  // Bundle search
  const [bundleSearchInput, setBundleSearchInput] = useState('');
  const bundleSearch = useDebounce(bundleSearchInput, 400);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundlePage, setBundlePage] = useState(1);
  const [bundleTotalCount, setBundleTotalCount] = useState(0);
  const [bundleHasNext, setBundleHasNext] = useState(false);
  const [bundleHasPrev, setBundleHasPrev] = useState(false);
  const prevBundleSearch = useRef(bundleSearch);

  // Load courses via Meilisearch
  useEffect(() => {
    if (prevCourseSearch.current !== courseSearch) {
      prevCourseSearch.current = courseSearch;
      if (coursePage !== 1) {
        setCoursePage(1);
        return;
      }
    }
    searchCourses();
  }, [courseSearch, coursePage]);

  // Load bundles via Meilisearch
  useEffect(() => {
    if (prevBundleSearch.current !== bundleSearch) {
      prevBundleSearch.current = bundleSearch;
      if (bundlePage !== 1) {
        setBundlePage(1);
        return;
      }
    }
    searchBundles();
  }, [bundleSearch, bundlePage]);

  const searchCourses = async () => {
    setCourseLoading(true);
    try {
      const offset = (coursePage - 1) * ITEMS_PER_PAGE;
      const result = await courseService.searchCourses(courseSearch, {
        limit: ITEMS_PER_PAGE,
        offset,
        filter: 'status = "PUBLISHED"',
      });

      if (result.success && result.data) {
        setCourses(result.data.data);
        setCourseHasNext(result.data.hasNextPage);
        setCourseHasPrev(result.data.hasPreviousPage);
        setCourseTotalCount(result.data.totalCount || 0);
      }
    } catch (error) {
      console.error('Failed to search courses:', error);
      toast({ title: 'Error', description: 'Failed to load courses', variant: 'destructive' });
    } finally {
      setCourseLoading(false);
    }
  };

  const searchBundles = async () => {
    setBundleLoading(true);
    try {
      const offset = (bundlePage - 1) * ITEMS_PER_PAGE;
      const result = await bundleService.searchBundles(bundleSearch, {
        limit: ITEMS_PER_PAGE,
        offset,
        filter: 'status = "PUBLISHED"',
      });

      if (result.success && result.data) {
        setBundles(result.data.data);
        setBundleHasNext(result.data.hasNextPage);
        setBundleHasPrev(result.data.hasPreviousPage);
        setBundleTotalCount(result.data.totalCount || 0);
      }
    } catch (error) {
      console.error('Failed to search bundles:', error);
      toast({ title: 'Error', description: 'Failed to load bundles', variant: 'destructive' });
    } finally {
      setBundleLoading(false);
    }
  };

  const isProbablyHtml = (text?: string | null) => {
    if (!text) return false;
    const trimmed = text.trim();
    return trimmed.startsWith('<') && /<\/[a-z][\s\S]*>/i.test(trimmed);
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

    setEnrolling(true);
    try {
      const result = await enrollmentService.enrollUser(
        student.email,
        items,
      );
      if (result.success) {
        toast({ title: 'Success', description: 'Student enrolled successfully' });
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
      setEnrolling(false);
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

  const getStudentName = (user: User) => {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  };

  const getTotalSelected = () => {
    return selectedCourses.length + selectedBundles.length;
  };

  const courseTotalPages = Math.ceil(courseTotalCount / ITEMS_PER_PAGE);
  const bundleTotalPages = Math.ceil(bundleTotalCount / ITEMS_PER_PAGE);

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
                  onKeyDown={(e) => e.key === 'Enter' && findStudent()}
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
                disabled={!student || getTotalSelected() === 0 || enrolling}
              >
                {enrolling ? (
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

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search courses..."
                    value={courseSearchInput}
                    onChange={(e) => setCourseSearchInput(e.target.value)}
                    className="pl-10 pr-9 w-64"
                  />
                  {courseSearchInput && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCourseSearchInput('')}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {courseLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading courses...</span>
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {courseSearchInput
                    ? `No courses found matching "${courseSearchInput}"`
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
                            {isProbablyHtml(course.description) ? (
                              <div
                                className="prose prose-sm max-w-none dark:prose-invert line-clamp-2"
                                dangerouslySetInnerHTML={{ __html: course.description || '' }}
                              />
                            ) : (
                              <span>{course.description}</span>
                            )}
                          </div>
                          <div className="text-sm text-green-600 font-medium mt-1">
                            ₹{course.salePrice || course.regularPrice}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {courseTotalPages > 1 && (
                    <div className="flex items-center justify-between space-x-2 py-4">
                      <div className="flex-1 text-sm text-muted-foreground">
                        Page {coursePage} of {courseTotalPages} ({courseTotalCount} courses)
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCoursePage(p => p - 1)}
                          disabled={!courseHasPrev || courseLoading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCoursePage(p => p + 1)}
                          disabled={!courseHasNext || courseLoading}
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

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search bundles..."
                    value={bundleSearchInput}
                    onChange={(e) => setBundleSearchInput(e.target.value)}
                    className="pl-10 pr-9 w-64"
                  />
                  {bundleSearchInput && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBundleSearchInput('')}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {bundleLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading bundles...</span>
                </div>
              ) : bundles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {bundleSearchInput
                    ? `No bundles found matching "${bundleSearchInput}"`
                    : 'No published bundles available'
                  }
                </div>
              ) : (
                <>
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

                  {bundleTotalPages > 1 && (
                    <div className="flex items-center justify-between space-x-2 py-4">
                      <div className="flex-1 text-sm text-muted-foreground">
                        Page {bundlePage} of {bundleTotalPages} ({bundleTotalCount} bundles)
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBundlePage(p => p - 1)}
                          disabled={!bundleHasPrev || bundleLoading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBundlePage(p => p + 1)}
                          disabled={!bundleHasNext || bundleLoading}
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
      </div>
    </AdminLayout>
  );
};

export default EnrollStudent;

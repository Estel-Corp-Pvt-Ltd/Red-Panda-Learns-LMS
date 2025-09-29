import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle,
  Edit,
  Trash2,
  DollarSign,
  Users,
  UserPlus,
  BookOpen,
  Loader2,
  Calendar,
  GraduationCap,
  Eye,
  Plus,
  Gift,
} from "lucide-react";

import { courseService } from "@/services/courseService";
import { cohortService } from "@/services/cohortService";
import { bundleService } from "@/services/bundleService";
import { lessonService } from "@/services/lessonService";
import { authorService } from "@/services/authorService";

import { Cohort } from "@/types/course";
import { statisticsService, DashboardStats } from "@/services/statisticsService";
import { userService } from "@/services/userService";
import { Bundle } from "@/types/bundle";
import { Course } from "@/types/course";
import { Lesson } from "@/types/lesson";
import { User } from "@/types/user";

// import { useCourseQuery } from "@/hooks/useFirebaseApi";
import { useLocation } from "react-router-dom";
import { useCouponByCodeQuery, useCouponByIdQuery, useCouponPrefetch, useCouponsQuery } from "@/hooks/useCouponApi";
import { Coupon, CouponStatus } from "@/types/coupon.";
import { useBundleQuery } from "@/hooks/useBundleApi";
import { couponService } from "@/services/couponService";

// const course = useCourseQuery() =;
const statsData = {
  totalRevenue: 45231,
  activeStudents: 2350,
  newEnrollments: 180,
  totalCourses: 12,
  activeCohorts: 5,
  totalCohortStudents: 420
};

import {
  BUNDLE_STATUS,
  COURSE_STATUS,
  USER_ROLE,
  USER_STATUS
} from "@/constants";

import { Header } from "@/components/Header";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [authors, setAuthors] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [authorsLoading, setAuthorsLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [bundlesLoading, setBundlesLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (location.pathname === '/admin') {
      loadCourses();
      loadCohorts();
      loadBundles();
      loadLessons();
      loadAuthors();
      loadUsers();
      loadStatistics();
    }
  }, [location.pathname]);

  // 🔹 Load STATISTICS
  const loadStatistics = async () => {
    try {
      const stats = await statisticsService.getDashboardStats();
      setStatsData(stats);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive"
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // 🔹 Load USERS

  const loadUsers = async () => {
    try {
      const usersList = await userService.getAllUsers();
      setUsers(usersList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  // 🔹 Load COURSES
  const loadCourses = async () => {
    try {
      const coursesList = await courseService.getAllCourses();
      setCourses(coursesList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Load COHORTS
  const loadCohorts = async () => {
    try {
      const cohortsList = await cohortService.getAllCohorts();
      setCohorts(cohortsList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load cohorts",
        variant: "destructive"
      });
    } finally {
      setCohortsLoading(false);
    }
  };

  // 🔹 Load BUNDLES
  const loadBundles = async () => {
    try {
      const bundlesList = await bundleService.getAllBundles();
      setBundles(bundlesList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load bundles",
        variant: "destructive"
      });
    } finally {
      setBundlesLoading(false);
    }
  };

  const { data: coupons = [], isLoading } = useCouponsQuery();

  const loadLessons = async () => {
    try {
      const lessonsList = await lessonService.getAllLessons();
      setLessons(lessonsList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load lessons",
        variant: "destructive"
      });
    } finally {
      setLessonsLoading(false);
    }
  };

  // 🔹 Load AUTHORS
  const loadAuthors = async () => {
    try {
      const authorsList = await authorService.getAllAuthors();
      setAuthors(authorsList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load authors",
        variant: "destructive"
      });
    } finally {
      setAuthorsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };

  const deleteCourse = async (courseId: string) => {
    try {
      await courseService.deleteCourse(courseId);
      setCourses((prev) => prev.filter((course) => course.id !== courseId));
      toast({
        title: "Success",
        description: "Course deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive"
      });
    }
  };

  const deleteCohort = async (cohortId: string) => {
    try {
      await cohortService.deleteCohort(cohortId);
      setCohorts((prev) => prev.filter((cohort) => cohort.id !== cohortId));
      toast({
        title: "Success",
        description: "Cohort deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete cohort",
        variant: "destructive"
      });
    }
  };

  const deleteCoupon = async (couponid: string) => {

  }

  const deleteBundle = async (bundleId: string) => {
    try {
      await bundleService.deleteBundle(bundleId);
      setBundles((prev) => prev.filter((bundle) => bundle.id !== bundleId));
      toast({
        title: "Success",
        description: "Bundle deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bundle",
        variant: "destructive"
      });
    }
  };

  const deleteLesson = async (lessonId: string) => {
    try {
      await lessonService.deleteLesson(lessonId);
      setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
      toast({
        title: "Success",
        description: "Lesson deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lesson",
        variant: "destructive"
      });
    }
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(statsData.totalRevenue),
      description: "+20.1% from last month",
      icon: DollarSign,
    },
    {
      title: "Active Students",
      value: statsData.activeStudents?.toLocaleString(),
      description: "+180.1% from last month",
      icon: Users,
    },
    {
      title: "New Enrollments",
      value: statsData.newEnrollments.toString(),
      description: "+19% from last month",
      icon: UserPlus,
    },
    {
      title: "Total Courses",
      value: courses.length.toString(),
      description: `${courses.length} courses available`,
      icon: BookOpen,
    },

    {
      title: "Cohort Students",
      value: statsData.cohortStudents.toString(),
      description: "Students in cohorts",
      icon: Calendar,
    },
  ];

  if (loading || cohortsLoading || bundlesLoading || lessonsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
     <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
       <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
  <div>
    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
      Admin Dashboard
    </h1>
    <p className="text-muted-foreground">
      Manage your courses, cohorts, and students
    </p>
  </div>

  {/*  Buttons stack on mobile, row on larger screens */}
<div className="flex flex-row gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
  <Button onClick={() => navigate("/admin/create-lesson")} className="flex-shrink-0">
    <PlusCircle className="mr-2 h-4 w-4" />
    Create New Lesson
  </Button>
  <Button onClick={() => navigate("/admin/create-course")} className="flex-shrink-0">
    <PlusCircle className="mr-2 h-4 w-4" />
    Create New Course
  </Button>
  <Button onClick={() => navigate("/admin/create-bundle")} className="flex-shrink-0">
    <PlusCircle className="mr-2 h-4 w-4" />
    Create Course Bundle
  </Button>
  <Button onClick={() => navigate("/admin/create-cohort")} className="flex-shrink-0">
    <Calendar className="mr-2 h-4 w-4" />
    Create New Cohort
  </Button>
</div>
</div>

        <div className="space-y-8">
          <Tabs defaultValue="courses" className="space-y-4">
         <TabsList
  className="
    flex
    overflow-x-auto sm:overflow-x-visible  /* allow scrolling only on small */
    whitespace-nowrap
    gap-2 sm:gap-4
    no-scrollbar 
    w-full
    justify-start sm:justify-center lg:justify-start /* flex behavior by screen size */
  "
>
  <TabsTrigger value="courses" className="flex-shrink-0">
    Courses
  </TabsTrigger>
  <TabsTrigger value="lessons" className="flex-shrink-0">
    Lessons
  </TabsTrigger>
  <TabsTrigger value="bundles" className="flex-shrink-0">
    Bundles
  </TabsTrigger>
  <TabsTrigger value="cohorts" className="flex-shrink-0">
    Cohorts
  </TabsTrigger>
  <TabsTrigger value="statistics" className="flex-shrink-0">
    Statistics
  </TabsTrigger>
  <TabsTrigger value="authors" className="flex-shrink-0">
    Authors
  </TabsTrigger>
  <TabsTrigger value="users" className="flex-shrink-0">
    Users
  </TabsTrigger>
  <TabsTrigger value="coupons" className="flex-shrink-0">
    Coupon
  </TabsTrigger>
</TabsList>


            {/*  show STATISTICS cards */}
          <TabsContent value="statistics">
  {statsLoading ? (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ) : statsData ? (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(statsData.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            +{statsData.revenueGrowth}% from last month
          </p>
        </CardContent>
      </Card>

      {/* Active Students */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.activeStudents.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            +{statsData.activeStudentGrowth}% from last month
          </p>
        </CardContent>
      </Card>

      {/* New Enrollments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Enrollments</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.newEnrollments}</div>
          <p className="text-xs text-muted-foreground">
            +{statsData.enrollmentGrowth}% from last month
          </p>
        </CardContent>
      </Card>

      {/* Total Courses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.totalCourses}</div>
          <p className="text-xs text-muted-foreground">
            {statsData.totalCourses} courses available
          </p>
        </CardContent>
      </Card>

      {/* Active Cohorts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Cohorts</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.activeCohorts}</div>
          <p className="text-xs text-muted-foreground">Currently active cohorts</p>
        </CardContent>
      </Card>

      {/* Cohort Students */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cohort Students</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.totalCohortStudents}</div>
          <p className="text-xs text-muted-foreground">Students across cohorts</p>
        </CardContent>
      </Card>
    </div>
  ) : (
    <p className="text-muted-foreground">No statistics available</p>
  )}
</TabsContent>

            <TabsContent value="lessons">
              <Card>
                <CardHeader>
                  <CardTitle>Lessons</CardTitle>
                  <CardDescription>
                    Manage all your individual lessons here.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lessons.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No lessons</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first lesson.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => navigate("/admin/create-lesson")}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create Lesson
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>

                        {lessons.map((lesson) => (
                          <TableRow key={lesson.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{lesson.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {lesson.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{lesson.type}</TableCell>
                            <TableCell>
                              {lesson.durationSeconds
                                ? `${Math.floor(lesson.durationSeconds / 60)} min`
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const course = courses.find(course =>
                                      course.topics?.some(topic =>
                                        topic.items?.some(item => item.id === lesson.id)
                                      )
                                    );

                                    if (!course) {
                                      toast({
                                        title: "Course not found",
                                        description: `No course found for lesson "${lesson.title}"`,
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    navigate(`/admin/course/${course.id}/lesson/${lesson.id}`);
                                  }}
                                  title="View Lesson"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/edit-lesson/${lesson.id}`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteLesson(lesson.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="courses">
              <Card>
                <CardHeader>
                  <CardTitle>Courses</CardTitle>
                  <CardDescription>
                    Manage your courses and their settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No courses</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first course.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => navigate("/admin/create-course")}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create Course
                        </Button>
                      </div>
                    </div>
                  ) : (
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
                        {courses.map((course) => (

                          <TableRow key={course.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{course.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {course.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={course.status === COURSE_STATUS.PUBLISHED ? 'default' : 'secondary'}>
                                {course.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(course.regularPrice)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  // onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                                  onClick={() => navigate(`/admin/edit-course/${course.id}`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/create-cohort?courseId=${course.id}`)}
                                  title="Create Cohort"
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCourse(course.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bundles">
              <Card>
                <CardHeader>
                  <CardTitle>Course Bundles</CardTitle>
                  <CardDescription>
                    Manage your course bundles and bundle enrollments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bundles.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No bundles</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first course bundle.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => navigate("/admin/create-bundle")}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create Bundle
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bundle</TableHead>
                          <TableHead>Courses</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bundles.map((bundle) => (
                          <TableRow key={bundle.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{bundle.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {bundle.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{bundle.courses.map(c => c.title).join(" | ")}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatCurrency(bundle.salePrice)}
                                <div className="text-xs text-muted-foreground">
                                  Original: {formatCurrency(bundle.regularPrice)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={bundle.status === BUNDLE_STATUS.PUBLISHED ? 'default' : 'secondary'}>
                                {bundle.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`edit-bundle/${bundle.id}`)}
                                  title="Edit Bundle"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/bundle/${bundle.id}`)}
                                  title="View Bundle"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBundle(bundle.id)}
                                  title="Delete Bundle"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cohorts">
              <Card>
                <CardHeader>
                  <CardTitle>Cohorts</CardTitle>
                  <CardDescription>
                    Manage your cohort-based learning programs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cohorts.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No cohorts</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first cohort.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => navigate("/admin/create-cohort")}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create Cohort
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cohort</TableHead>
                          <TableHead>Max Students</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cohorts.map(cohort => (
                          <TableRow key={cohort.id}>
                            {/* Cohort title & description */}
                            <TableCell>
                              <div>
                                <div className="font-medium">{cohort.title}</div>
                                <div className="text-sm text-muted-foreground">{cohort.description || '-'}</div>
                              </div>
                            </TableCell>

                            {/* Start date */}
                            <TableCell>
                              <div className="text-sm">
                                {cohort.maxStudents}
                              </div>
                            </TableCell>

                            {/* End date */}
                            <TableCell>
                              <div className="text-sm">
                                {cohort.startDate ? (new Date(cohort.startDate), "Invalid Date") : "No start date"}
                              </div>
                            </TableCell>

                            {/* Enrollment open status */}
                            <TableCell>
                              <Badge variant={cohort.enrollmentOpen ? 'secondary' : 'destructive'}>
                                {cohort.enrollmentOpen ? 'Open' : 'Closed'}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <Badge variant={cohort.enrollmentOpen ? 'secondary' : 'destructive'}>
                                {cohort.enrollmentOpen ? 'Open' : 'Closed'}
                              </Badge>
                            </TableCell>

                            {/* Actions: view, edit, delete */}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/cohort/${cohort.id}`)}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/cohort/${cohort.id}/edit`)}
                                  title="Edit Cohort"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCohort(cohort.id)}
                                  title="Delete Cohort"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>

                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="authors">
              <Card>
                <CardHeader>
                  <CardTitle>Authors</CardTitle>
                  <CardDescription>
                    Manage all authors.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {authors.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No authors</h3>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {authors.map((author) => (
                          <TableRow key={author.id}>
                            <TableCell>
                              {author.firstName} {author.middleName} {author.lastName}
                            </TableCell>
                            <TableCell>{author.email}</TableCell>
                            <TableCell>
                              <Badge variant={author.role === USER_ROLE.ADMIN ? "destructive" : "default"}>
                                {author.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={author.status === USER_STATUS.ACTIVE ? "default" : "secondary"}>
                                {author.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                No actions available
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Manage platform users, their roles, and statuses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No users</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by inviting or creating a user.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => navigate("/admin/create-user")}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add User
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              {user.firstName} {user.middleName} {user.lastName}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === USER_ROLE.ADMIN
                                    ? "destructive"
                                    : user.role === USER_ROLE.STUDENT
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.status === USER_STATUS.ACTIVE
                                    ? "default"
                                    : user.status === USER_STATUS.INACTIVE
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/edit-user/${user.id}`)}
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteUser(user.id)}
                                  title="Delete User"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coupons">
              <Card>
                <CardHeader>
                  <CardTitle>Coupons</CardTitle>
                  <CardDescription>
                    Manage discount codes, their usage, and validity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {coupons.length === 0 && !isLoading ? (
                    <div className="text-center py-8">
                      <Gift className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No coupons</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating a coupon code.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => navigate('/admin/create-coupon')}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Coupon
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupons.map((coupon) => (
                          <TableRow key={coupon.id}>
                            <TableCell className="font-medium">{coupon.code}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  coupon.status === CouponStatus.ACTIVE
                                    ? 'default'
                                    : coupon.status === CouponStatus.EXPIRED
                                      ? 'secondary'
                                      : 'outline'
                                }
                              >
                                {coupon.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {coupon.discountPercentage}
                            </TableCell>
                            <TableCell>
                              {coupon.usageLimit}
                            </TableCell>
                            <TableCell>
                              {coupon.expiryDate
                                ? new Date(coupon.expiryDate.seconds * 1000).toLocaleDateString()
                                : 'No expiry'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/edit-coupon/${coupon.id}`)}
                                  title="Edit Coupon"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Optionally implement delete logic here
                                  }}
                                  title="Delete Coupon"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {/* {statCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          {card.title}
                        </CardTitle>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground">
                          {card.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })} */}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
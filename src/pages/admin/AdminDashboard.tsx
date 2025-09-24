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
  Eye
} from "lucide-react";

import { courseService } from "@/services/courseService";
import { cohortService } from "@/services/cohortService";
import { bundleService } from "@/services/bundleService";
import { lessonService } from "@/services/lessonService";
import { authorService } from "@/services/authorService";
import { statisticsService, DashboardStats } from "@/services/statisticsService";
import { userService } from "@/services/userService";

import { Cohort } from "@/types/cohort";
import { Bundle } from "@/types/bundle";
import { Course } from "@/types/course";
import { Lesson } from "@/types/lesson";
import { User } from "@/types/user";
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
    loadCourses();
    loadCohorts();
    loadBundles();
    loadLessons();
    loadAuthors();
    loadUsers();
    loadStatistics();
  }, []);

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

  // 🔹 Load LESSONS
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

  // ✅ Dashboard Statistics Cards
  const statCards = statsData
    ? [
        {
          title: "Total Revenue",
          value: formatCurrency(statsData.totalRevenue),
          description: `${statsData.revenueGrowth}% from last month`,
          icon: DollarSign
        },
        {
          title: "Active Students",
          value: statsData.activeStudents?.toLocaleString(),
          description: `${statsData.activeStudentGrowth}% from last month`,
          icon: Users
        },
        {
          title: "New Enrollments",
          value: statsData.newEnrollments.toString(),
          description: `${statsData.enrollmentGrowth}% from last month`,
          icon: UserPlus
        },
        {
          title: "Total Courses",
          value: statsData.totalCourses.toString(),
          description: `${statsData.totalCourses} courses available`,
          icon: BookOpen
        },
        {
          title: "Active Cohorts",
          value: statsData.activeCohorts.toString(),
          description: `${statsData.totalCohorts} cohorts running`,
          icon: GraduationCap
        },
        {
          title: "Cohort Students",
          value: statsData.cohortStudents.toString(),
          description: "Students in cohorts",
          icon: Calendar
        }
      ]
    : [];

  if (
    loading ||
    cohortsLoading ||
    bundlesLoading ||
    lessonsLoading ||
    authorsLoading ||
    usersLoading ||
    statsLoading
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your courses, cohorts, and students
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => navigate("/admin/create-lesson")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Lesson
            </Button>
            <Button onClick={() => navigate("/admin/create-course")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Course
            </Button>
            <Button onClick={() => navigate("/admin/create-bundle")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Course Bundle
            </Button>
            <Button onClick={() => navigate("/admin/create-cohort")}>
              <Calendar className="mr-2 h-4 w-4" />
              Create New Cohort
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          <Tabs defaultValue="courses" className="space-y-4">
            <TabsList>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="bundles">Bundles</TabsTrigger>
              <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="authors">Authors</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            {/* ✅ show STATISTICS cards */}
            <TabsContent value="statistics">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {statCards.map((card, index) => {
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
                })}
              </div>
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
                          <TableHead>Course</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cohorts.map((cohort) => {
                          const course = courses.find(c => c.id === cohort.courseId);
                          return (
                            <TableRow key={cohort.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{cohort.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {cohort.description}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {course?.title || 'Unknown Course'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(cohort.startDate).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {cohort.currentEnrollments}/{cohort.maxStudents}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  cohort.status === 'in-progress' ? 'default' :
                                    cohort.status === 'open' ? 'secondary' :
                                      cohort.status === 'completed' ? 'outline' : 'destructive'
                                }>
                                  {cohort.status}
                                </Badge>
                              </TableCell>
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
                          );
                        })}
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

            {/* other tabs (lessons, courses, bundles, cohorts, authors, users) remain unchanged */}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
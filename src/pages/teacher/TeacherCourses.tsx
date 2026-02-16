import TeacherLayout from "@/components/TeacherLayout";
import { ClassDivisionFilter } from "@/components/teacher/ClassDivisionFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { courseService } from "@/services/courseService";
import { teacherService } from "@/services/teacherService";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";
import { LearningProgress } from "@/types/learning-progress";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  HelpCircle,
  Loader2,
  Search,
  TableIcon,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "@/types/user";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";

// --- Helper functions ---

function getTotalLessons(course: Course): number {
  return course.topics.reduce((total, topic) => total + topic.items.length, 0);
}

function getCompletionPercent(
  progress: LearningProgress | undefined,
  totalLessons: number
): number {
  if (!progress || totalLessons === 0) return 0;
  const completed = Object.values(progress.lessonHistory || {}).filter(
    (entry) => entry.markedAsComplete
  ).length;
  return Math.round((completed / totalLessons) * 100);
}

function getCompletedLessonsCount(progress: LearningProgress | undefined): number {
  if (!progress) return 0;
  return Object.values(progress.lessonHistory || {}).filter((entry) => entry.markedAsComplete)
    .length;
}

function getTotalTimeSpent(progress: LearningProgress | undefined): number {
  if (!progress) return 0;
  return Object.values(progress.lessonHistory || {}).reduce(
    (total, entry) => total + (entry.timeSpent || 0),
    0
  );
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return seconds > 0 ? `${seconds}s` : "0m";
}

function getLastAccessed(progress: LearningProgress | undefined): Date | null {
  if (!progress || !progress.lastAccessed) return null;
  if (progress.lastAccessed instanceof Date) return progress.lastAccessed;
  return (progress.lastAccessed as any)?.toDate?.() || null;
}

function getProgressColor(percent: number) {
  if (percent > 70)
    return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (percent > 40) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

function getProgressHsl(percent: number): string {
  if (percent > 70) return "hsl(142, 76%, 36%)";
  if (percent > 40) return "hsl(48, 96%, 53%)";
  return "hsl(0, 84%, 60%)";
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
  ACTIVE:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  DROPPED:
    "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-200 dark:border-red-800",
};

// --- Types ---

interface CourseWithStats extends Course {
  enrolledStudents: number;
}

interface StudentProgressRow {
  enrollment: Enrollment;
  progress: LearningProgress | undefined;
  completionPercent: number;
  completedLessons: number;
  totalLessons: number;
  totalTimeSpent: number;
  lastAccessed: Date | null;
}

type SortField = "name" | "progress" | "lessons" | "time" | "status" | "lastAccessed";

// --- Component ---

const TeacherCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CourseWithStats | null>(null);
  const [courseEnrollments, setCourseEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [progressMap, setProgressMap] = useState<Map<string, LearningProgress>>(new Map());
  const [activeView, setActiveView] = useState<"table" | "graph">("table");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const handleFilterChange = useCallback(
    (cls: string | null, div: string | null) => {
      setSelectedClass(cls);
      setSelectedDivision(div);
    },
    []
  );

  // Build a set of student IDs matching class/division filter
  const classFilteredStudentIds = useMemo(() => {
    if (!selectedClass && !selectedDivision) return null;
    return new Set(
      allStudents
        .filter((s) => {
          if (selectedClass && s.class !== selectedClass) return false;
          if (selectedDivision && s.division !== selectedDivision) return false;
          return true;
        })
        .map((s) => s.id)
    );
  }, [allStudents, selectedClass, selectedDivision]);

  useEffect(() => {
    fetchCourses();
  }, [user?.organizationId]);

  const fetchCourses = async () => {
    if (!user?.organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [coursesResult, enrollmentsResult, studentsResult] = await Promise.all([
        courseService.getPublishedCourses(),
        teacherService.getOrganizationEnrollments(user.organizationId),
        teacherService.getAllOrganizationStudents(user.organizationId),
      ]);

      if (studentsResult.success && studentsResult.data) {
        setAllStudents(studentsResult.data);
      }

      if (coursesResult) {
        const orgEnrollments = enrollmentsResult.success ? enrollmentsResult.data || [] : [];
        setAllEnrollments(orgEnrollments);

        const courseEnrollmentCounts: Record<string, number> = {};
        orgEnrollments.forEach((enrollment) => {
          const key = enrollment.courseId;
          courseEnrollmentCounts[key] = (courseEnrollmentCounts[key] || 0) + 1;
        });

        const coursesWithStats = coursesResult.map((course) => ({
          ...course,
          enrolledStudents: courseEnrollmentCounts[course.id] || 0,
        }));

        coursesWithStats.sort((a, b) => b.enrolledStudents - a.enrolledStudents);
        setCourses(coursesWithStats);
      } else {
        toast({
          title: "Error",
          description: "Failed to load courses",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const viewCourseDetails = async (course: CourseWithStats) => {
    if (!user?.organizationId) return;

    setSelectedCourse(course);
    setLoadingEnrollments(true);
    setActiveView("table");

    try {
      const [enrollmentsResult, progressResult] = await Promise.all([
        teacherService.getOrganizationEnrollments(user.organizationId, course.id),
        teacherService.getOrganizationCourseProgress(user.organizationId, course.id),
      ]);

      const enrollments = enrollmentsResult.success ? enrollmentsResult.data || [] : [];
      const progressList = progressResult.success ? progressResult.data || [] : [];

      setCourseEnrollments(enrollments);

      const pMap = new Map<string, LearningProgress>();
      progressList.forEach((p) => pMap.set(p.userId, p));
      setProgressMap(pMap);
    } catch (error) {
      console.error("Failed to fetch course details:", error);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // When class/division filter is active, recompute enrollment counts and hide courses with 0 filtered students
  const coursesWithFilteredStats = useMemo(() => {
    if (!classFilteredStudentIds) return courses;

    const filteredEnrollments = allEnrollments.filter((e) =>
      classFilteredStudentIds.has(e.userId)
    );
    const counts: Record<string, number> = {};
    filteredEnrollments.forEach((e) => {
      counts[e.courseId] = (counts[e.courseId] || 0) + 1;
    });

    return courses
      .map((c) => ({ ...c, enrolledStudents: counts[c.id] || 0 }))
      .filter((c) => c.enrolledStudents > 0)
      .sort((a, b) => b.enrolledStudents - a.enrolledStudents);
  }, [courses, allEnrollments, classFilteredStudentIds]);

  const filteredCourses = coursesWithFilteredStats.filter((course) =>
    course.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Derived data ---

  const { studentRows, summaryStats } = useMemo(() => {
    if (!selectedCourse || courseEnrollments.length === 0) {
      return { studentRows: [], summaryStats: null };
    }

    const totalLessons = getTotalLessons(selectedCourse);

    const filteredEnrollments = classFilteredStudentIds
      ? courseEnrollments.filter((e) => classFilteredStudentIds.has(e.userId))
      : courseEnrollments;

    const rows: StudentProgressRow[] = filteredEnrollments.map((enrollment) => {
      const progress = progressMap.get(enrollment.userId);
      return {
        enrollment,
        progress,
        completionPercent: getCompletionPercent(progress, totalLessons),
        completedLessons: getCompletedLessonsCount(progress),
        totalLessons,
        totalTimeSpent: getTotalTimeSpent(progress),
        lastAccessed: getLastAccessed(progress),
      };
    });

    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.enrollment.userName || "").localeCompare(b.enrollment.userName || "");
          break;
        case "progress":
          cmp = a.completionPercent - b.completionPercent;
          break;
        case "lessons":
          cmp = a.completedLessons - b.completedLessons;
          break;
        case "time":
          cmp = a.totalTimeSpent - b.totalTimeSpent;
          break;
        case "status":
          cmp = (a.enrollment.status || "").localeCompare(b.enrollment.status || "");
          break;
        case "lastAccessed":
          cmp = (a.lastAccessed?.getTime() || 0) - (b.lastAccessed?.getTime() || 0);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    const avgCompletion =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.completionPercent, 0) / rows.length)
        : 0;
    const totalTime = rows.reduce((s, r) => s + r.totalTimeSpent, 0);
    const avgLessonsCompleted =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.completedLessons, 0) / rows.length)
        : 0;
    const statusCounts = {
      ACTIVE: rows.filter((r) => r.enrollment.status === "ACTIVE").length,
      COMPLETED: rows.filter((r) => r.enrollment.status === "COMPLETED").length,
      DROPPED: rows.filter((r) => r.enrollment.status === "DROPPED").length,
    };

    return {
      studentRows: rows,
      summaryStats: {
        avgCompletion,
        totalTime,
        avgLessonsCompleted,
        statusCounts,
        totalLessons,
      },
    };
  }, [courseEnrollments, progressMap, selectedCourse, sortField, sortDirection, classFilteredStudentIds]);

  // --- Chart data ---

  const completionBarData = useMemo(() => {
    const data = studentRows.map((row) => ({
      name: row.enrollment.userName?.split(" ")[0] || row.enrollment.userId.slice(0, 8),
      fullName: row.enrollment.userName || row.enrollment.userId,
      completion: row.completionPercent,
      fill: getProgressHsl(row.completionPercent),
    }));
    // Show top 20 if too many students
    if (data.length > 20) {
      return data.sort((a, b) => b.completion - a.completion).slice(0, 20);
    }
    return data;
  }, [studentRows]);

  const statusPieData = useMemo(() => {
    if (!summaryStats) return [];
    return [
      {
        name: "Active",
        value: summaryStats.statusCounts.ACTIVE,
        fill: "hsl(217, 91%, 60%)",
      },
      {
        name: "Completed",
        value: summaryStats.statusCounts.COMPLETED,
        fill: "hsl(142, 76%, 36%)",
      },
      {
        name: "Dropped",
        value: summaryStats.statusCounts.DROPPED,
        fill: "hsl(0, 84%, 60%)",
      },
    ].filter((d) => d.value > 0);
  }, [summaryStats]);

  const timeSpentData = useMemo(() => {
    return [...studentRows]
      .sort((a, b) => b.totalTimeSpent - a.totalTimeSpent)
      .slice(0, 10)
      .map((row) => ({
        name: row.enrollment.userName?.split(" ")[0] || row.enrollment.userId.slice(0, 8),
        fullName: row.enrollment.userName || row.enrollment.userId,
        timeSpent: Math.round(row.totalTimeSpent / 60),
        timeFormatted: formatTime(row.totalTimeSpent),
      }));
  }, [studentRows]);

  // --- Chart configs ---

  const completionBarConfig: ChartConfig = {
    completion: { label: "Completion %", color: "hsl(142, 76%, 36%)" },
  };

  const statusPieConfig: ChartConfig = {
    Active: { label: "Active", color: "hsl(217, 91%, 60%)" },
    Completed: { label: "Completed", color: "hsl(142, 76%, 36%)" },
    Dropped: { label: "Dropped", color: "hsl(0, 84%, 60%)" },
  };

  const timeSpentConfig: ChartConfig = {
    timeSpent: { label: "Time Spent (min)", color: "hsl(262, 83%, 58%)" },
  };

  // --- Render helpers ---

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  // --- No organization guard ---

  if (!user?.organizationId) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
          <h2 className="text-2xl font-bold">Not Assigned to an Organization</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Please contact your administrator to get assigned to an organization.
          </p>
        </div>
      </TeacherLayout>
    );
  }

  // --- Course detail view ---

  if (selectedCourse) {
    return (
      <TeacherLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCourse(null);
                setProgressMap(new Map());
                setCourseEnrollments([]);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </div>

          <div>
            <h1 className="text-2xl font-bold">{selectedCourse.title}</h1>
            <p className="text-muted-foreground">
              {selectedCourse.enrolledStudents} student
              {selectedCourse.enrolledStudents !== 1 ? "s" : ""} from your organization enrolled
            </p>
          </div>

          {/* Class/Division Filter */}
          {user?.organizationId && (
            <ClassDivisionFilter
              organizationId={user.organizationId}
              onFilterChange={handleFilterChange}
              students={allStudents}
            />
          )}

          {loadingEnrollments ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading student progress...</span>
            </div>
          ) : courseEnrollments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students from your organization are enrolled in this course</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              {summaryStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Average Completion */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <ChartContainer
                          config={{
                            completion: {
                              label: "Completion",
                              color: getProgressHsl(summaryStats.avgCompletion),
                            },
                          }}
                          className="h-[100px] w-[100px] shrink-0"
                        >
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="100%"
                            startAngle={90}
                            endAngle={-270}
                            data={[
                              {
                                name: "completion",
                                value: summaryStats.avgCompletion,
                              },
                            ]}
                          >
                            <PolarAngleAxis
                              type="number"
                              domain={[0, 100]}
                              angleAxisId={0}
                              tick={false}
                            />
                            <RadialBar
                              dataKey="value"
                              fill="var(--color-completion)"
                              cornerRadius={10}
                              background
                            />
                            <text
                              x="50%"
                              y="50%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="fill-foreground text-xl font-bold"
                            >
                              {summaryStats.avgCompletion}%
                            </text>
                          </RadialBarChart>
                        </ChartContainer>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Completion</p>
                          <p className="text-2xl font-bold">{summaryStats.avgCompletion}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Total Time Spent */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                          <Clock className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Time Spent</p>
                          <p className="text-2xl font-bold">{formatTime(summaryStats.totalTime)}</p>
                          <p className="text-xs text-muted-foreground">
                            across {courseEnrollments.length} students
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Status Distribution */}
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-3">Student Status</p>
                      <div className="flex flex-wrap gap-2">
                        {summaryStats.statusCounts.ACTIVE > 0 && (
                          <Badge className={cn("text-sm px-3 py-1", STATUS_STYLES.ACTIVE)}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {summaryStats.statusCounts.ACTIVE} Active
                          </Badge>
                        )}
                        {summaryStats.statusCounts.COMPLETED > 0 && (
                          <Badge className={cn("text-sm px-3 py-1", STATUS_STYLES.COMPLETED)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {summaryStats.statusCounts.COMPLETED} Completed
                          </Badge>
                        )}
                        {summaryStats.statusCounts.DROPPED > 0 && (
                          <Badge className={cn("text-sm px-3 py-1", STATUS_STYLES.DROPPED)}>
                            <XCircle className="h-3 w-3 mr-1" />
                            {summaryStats.statusCounts.DROPPED} Dropped
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 4: Average Lessons */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                          <GraduationCap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Avg Lessons Done</p>
                          <p className="text-2xl font-bold">
                            {summaryStats.avgLessonsCompleted}
                            <span className="text-sm font-normal text-muted-foreground">
                              {" "}
                              / {summaryStats.totalLessons}
                            </span>
                          </p>
                          <Progress
                            value={
                              summaryStats.totalLessons > 0
                                ? (summaryStats.avgLessonsCompleted / summaryStats.totalLessons) *
                                  100
                                : 0
                            }
                            className="h-2 mt-2"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* View Toggle */}
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "table" | "graph")}>
                <TabsList>
                  <TabsTrigger value="table" className="gap-2">
                    <TableIcon className="h-4 w-4" />
                    Table View
                  </TabsTrigger>
                  <TabsTrigger value="graph" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Graph View
                  </TabsTrigger>
                </TabsList>

                {/* ===== TABLE VIEW ===== */}
                <TabsContent value="table" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Student Progress
                      </CardTitle>
                      <CardDescription>Detailed progress for each enrolled student</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>
                                <SortableHeader field="name">Student</SortableHeader>
                              </TableHead>
                              <TableHead>
                                <SortableHeader field="progress">Progress</SortableHeader>
                              </TableHead>
                              <TableHead>
                                <SortableHeader field="lessons">Lessons</SortableHeader>
                              </TableHead>
                              <TableHead>
                                <SortableHeader field="time">Time Spent</SortableHeader>
                              </TableHead>
                              <TableHead>
                                <SortableHeader field="status">Status</SortableHeader>
                              </TableHead>
                              <TableHead>
                                <SortableHeader field="lastAccessed">Last Active</SortableHeader>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentRows.map((row) => {
                              const colors = getProgressColor(row.completionPercent);
                              return (
                                <TableRow key={row.enrollment.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">
                                        {row.enrollment.userName || row.enrollment.userId}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {row.enrollment.userEmail || "N/A"}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3 min-w-[160px]">
                                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                                        <div
                                          className={cn(
                                            "h-2.5 rounded-full transition-all duration-500",
                                            colors.bar
                                          )}
                                          style={{
                                            width: `${Math.min(row.completionPercent, 100)}%`,
                                          }}
                                        />
                                      </div>
                                      <span
                                        className={cn(
                                          "text-sm font-semibold tabular-nums w-12 text-right",
                                          colors.text
                                        )}
                                      >
                                        {row.completionPercent}%
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="tabular-nums">
                                      {row.completedLessons}
                                      <span className="text-muted-foreground">
                                        {" "}
                                        / {row.totalLessons}
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="tabular-nums">
                                    {formatTime(row.totalTimeSpent)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={cn(
                                        "text-xs",
                                        STATUS_STYLES[row.enrollment.status] || ""
                                      )}
                                    >
                                      {row.enrollment.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {row.lastAccessed
                                      ? row.lastAccessed.toLocaleDateString()
                                      : "Never"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ===== GRAPH VIEW ===== */}
                <TabsContent value="graph" className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart 1: Student Completion Bar Chart (full width) */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          Student Completion Progress
                        </CardTitle>
                        <CardDescription>
                          Percentage of course content completed by each student
                          {studentRows.length > 20 && ` (showing top 20 of ${studentRows.length})`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {completionBarData.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">
                            No data available
                          </p>
                        ) : (
                          <ChartContainer config={completionBarConfig} className="h-[350px] w-full">
                            <BarChart data={completionBarData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 100]}
                                tickFormatter={(v) => `${v}%`}
                              />
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    labelFormatter={(_, payload) =>
                                      payload?.[0]?.payload?.fullName || ""
                                    }
                                  />
                                }
                              />
                              <Bar dataKey="completion" radius={[4, 4, 0, 0]} name="Completion %">
                                {completionBarData.map((entry, index) => (
                                  <Cell key={index} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Chart 2: Status Distribution Donut */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Status Distribution
                        </CardTitle>
                        <CardDescription>Breakdown of student enrollment statuses</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {statusPieData.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">
                            No data available
                          </p>
                        ) : (
                          <ChartContainer config={statusPieConfig} className="h-[300px] w-full">
                            <PieChart>
                              <Pie
                                data={statusPieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, value }) => `${name}: ${value}`}
                              >
                                {statusPieData.map((entry, index) => (
                                  <Cell key={index} fill={entry.fill} />
                                ))}
                              </Pie>
                              <ChartTooltip content={<ChartTooltipContent />} />
                            </PieChart>
                          </ChartContainer>
                        )}
                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 mt-2">
                          {statusPieData.map((item) => (
                            <div key={item.name} className="flex items-center gap-1.5 text-sm">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: item.fill }}
                              />
                              <span className="text-muted-foreground">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Chart 3: Top Students by Time Spent */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-violet-500" />
                          Top Students by Time Spent
                        </CardTitle>
                        <CardDescription>
                          Most engaged students by total time (in minutes)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {timeSpentData.length === 0 ||
                        timeSpentData.every((d) => d.timeSpent === 0) ? (
                          <p className="text-center py-8 text-muted-foreground">
                            No time data recorded yet
                          </p>
                        ) : (
                          <ChartContainer config={timeSpentConfig} className="h-[300px] w-full">
                            <BarChart data={timeSpentData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis
                                type="number"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `${v}m`}
                              />
                              <YAxis
                                type="category"
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                width={80}
                                fontSize={12}
                              />
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    labelFormatter={(_, payload) =>
                                      payload?.[0]?.payload?.fullName || ""
                                    }
                                  />
                                }
                              />
                              <Bar
                                dataKey="timeSpent"
                                fill="var(--color-timeSpent)"
                                radius={[0, 4, 4, 0]}
                                name="Time Spent (min)"
                              />
                            </BarChart>
                          </ChartContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </TeacherLayout>
    );
  }

  // --- Course list view ---

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Courses</h1>
              <p className="text-muted-foreground">
                View all courses and track your organization's student progress
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>
                Click on a course to see which students from your organization are enrolled and
                their progress.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Class/Division Filter */}
        {user?.organizationId && (
          <ClassDivisionFilter
            organizationId={user.organizationId}
            onFilterChange={handleFilterChange}
            students={allStudents}
          />
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading courses...</span>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No courses found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => viewCourseDetails(course)}
              >
                {course.thumbnail && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
                  {course.description && (
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {course.enrolledStudents} org student
                        {course.enrolledStudents !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {course.enrolledStudents > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Has students
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherCourses;

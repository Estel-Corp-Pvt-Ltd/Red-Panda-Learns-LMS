import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeacherLayout from "@/components/TeacherLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { commentService } from "@/services/commentService";
import { courseService } from "@/services/courseService";
import { enrollmentService } from "@/services/enrollmentService";
import { teacherService } from "@/services/teacherService";
import { userService } from "@/services/userService";
import { Comment } from "@/types/comment";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";
import { LearningProgress } from "@/types/learning-progress";
import { User } from "@/types/user";
import { AssignmentSubmission } from "@/types/assignment";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

// --- Helpers ---

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return seconds > 0 ? `${seconds}s` : "0m";
}

function getTotalLessons(course: Course): number {
  return course.topics.reduce((total, topic) => total + topic.items.length, 0);
}

function getCompletionPercent(
  progress: LearningProgress | null,
  totalLessons: number
): number {
  if (!progress || totalLessons === 0) return 0;
  const completed = Object.values(progress.lessonHistory || {}).filter(
    (e) => e.markedAsComplete
  ).length;
  return Math.round((completed / totalLessons) * 100);
}

function getCompletedLessonsCount(
  progress: LearningProgress | null
): number {
  if (!progress) return 0;
  return Object.values(progress.lessonHistory || {}).filter(
    (e) => e.markedAsComplete
  ).length;
}

function getTotalTimeSpent(progress: LearningProgress | null): number {
  if (!progress) return 0;
  return Object.values(progress.lessonHistory || {}).reduce(
    (total, entry) => total + (entry.timeSpent || 0),
    0
  );
}

function getProgressHsl(percent: number): string {
  if (percent > 70) return "hsl(142, 76%, 36%)";
  if (percent > 40) return "hsl(48, 96%, 53%)";
  return "hsl(0, 84%, 60%)";
}

function getProgressColor(percent: number) {
  if (percent > 70)
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    };
  if (percent > 40)
    return {
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
  ACTIVE:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  DROPPED:
    "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-200 dark:border-red-800",
};

const COMMENT_STATUS_STYLES: Record<string, string> = {
  APPROVED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  DELETED:
    "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
};

// --- Types ---

interface CourseProgressData {
  enrollment: Enrollment;
  course: Course | undefined;
  progress: LearningProgress | null;
  completionPercent: number;
  completedLessons: number;
  totalLessons: number;
  totalTimeSpent: number;
  lastAccessed: Date | null;
}

// --- Component ---

const TeacherStudentDetail = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<
    Map<string, LearningProgress | null>
  >(new Map());
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentStats, setCommentStats] = useState<{
    totalComments: number;
    approvedComments: number;
    pendingComments: number;
    totalUpvotes: number;
  } | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("courses");

  useEffect(() => {
    if (!studentId || !user?.organizationId) return;
    fetchAllData();
  }, [studentId, user?.organizationId]);

  const fetchAllData = async () => {
    if (!studentId || !user?.organizationId) return;

    setLoading(true);
    try {
      // Fetch student info, enrollments, courses, comments, submissions in parallel
      const [
        studentResult,
        enrollmentsResult,
        coursesResult,
        commentsResult,
        commentStatsResult,
        submissionsResult,
      ] = await Promise.all([
        userService.getUserById(studentId),
        enrollmentService.getUserEnrollments(studentId, "ALL"),
        courseService.getPublishedCourses(),
        commentService.getCommentsByUser(studentId),
        commentService.getUserCommentStats(studentId),
        teacherService.getOrganizationSubmissions(user!.organizationId!),
      ]);

      if (studentResult.success && studentResult.data) {
        setStudent(studentResult.data);
      } else {
        toast({
          title: "Error",
          description: "Student not found",
          variant: "destructive",
        });
        return;
      }

      const studentEnrollments =
        enrollmentsResult.success && enrollmentsResult.data
          ? enrollmentsResult.data
          : [];
      setEnrollments(studentEnrollments);

      const publishedCourses = coursesResult || [];
      setCourses(publishedCourses);

      if (commentsResult.success && commentsResult.data) {
        setComments(commentsResult.data);
      }

      if (commentStatsResult.success && commentStatsResult.data) {
        setCommentStats(commentStatsResult.data);
      }

      if (submissionsResult.success && submissionsResult.data) {
        setSubmissions(
          submissionsResult.data.filter((s) => s.studentId === studentId)
        );
      }

      // Fetch progress for each enrollment
      const progressEntries = await Promise.all(
        studentEnrollments.map(async (enrollment) => {
          const result = await teacherService.getStudentCourseProgress(
            studentId,
            enrollment.courseId
          );
          return [
            enrollment.courseId,
            result.success ? result.data : null,
          ] as const;
        })
      );

      const pMap = new Map<string, LearningProgress | null>();
      progressEntries.forEach(([courseId, progress]) => {
        pMap.set(courseId, progress ?? null);
      });
      setProgressMap(pMap);
    } catch (error) {
      console.error("Failed to fetch student details:", error);
      toast({
        title: "Error",
        description: "Failed to load student details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Derived data ---

  const courseProgressData: CourseProgressData[] = useMemo(() => {
    return enrollments.map((enrollment) => {
      const course = courses.find((c) => c.id === enrollment.courseId);
      const progress = progressMap.get(enrollment.courseId) ?? null;
      const totalLessons = course ? getTotalLessons(course) : 0;
      const lastAccessedRaw = progress?.lastAccessed;
      let lastAccessed: Date | null = null;
      if (lastAccessedRaw) {
        if (lastAccessedRaw instanceof Date) lastAccessed = lastAccessedRaw;
        else
          lastAccessed =
            (lastAccessedRaw as any)?.toDate?.() || null;
      }

      return {
        enrollment,
        course,
        progress,
        completionPercent: getCompletionPercent(progress, totalLessons),
        completedLessons: getCompletedLessonsCount(progress),
        totalLessons,
        totalTimeSpent: getTotalTimeSpent(progress),
        lastAccessed,
      };
    });
  }, [enrollments, courses, progressMap]);

  const totalLessonsCompleted = useMemo(
    () => courseProgressData.reduce((sum, c) => sum + c.completedLessons, 0),
    [courseProgressData]
  );

  const totalTimeSpent = useMemo(
    () => courseProgressData.reduce((sum, c) => sum + c.totalTimeSpent, 0),
    [courseProgressData]
  );

  // Chart data
  const courseBarData = useMemo(() => {
    return courseProgressData
      .filter((c) => c.course)
      .map((c) => ({
        name:
          c.enrollment.courseName?.length > 20
            ? c.enrollment.courseName.slice(0, 20) + "..."
            : c.enrollment.courseName || c.enrollment.courseId,
        fullName: c.enrollment.courseName || c.enrollment.courseId,
        completion: c.completionPercent,
        fill: getProgressHsl(c.completionPercent),
      }));
  }, [courseProgressData]);

  const commentPieData = useMemo(() => {
    if (!commentStats) return [];
    return [
      {
        name: "Approved",
        value: commentStats.approvedComments,
        fill: "hsl(142, 76%, 36%)",
      },
      {
        name: "Pending",
        value: commentStats.pendingComments,
        fill: "hsl(48, 96%, 53%)",
      },
    ].filter((d) => d.value > 0);
  }, [commentStats]);

  const courseBarConfig: ChartConfig = {
    completion: { label: "Completion %", color: "hsl(142, 76%, 36%)" },
  };

  const commentPieConfig: ChartConfig = {
    Approved: { label: "Approved", color: "hsl(142, 76%, 36%)" },
    Pending: { label: "Pending", color: "hsl(48, 96%, 53%)" },
  };

  // Monthly Lesson Completions
  const monthlyLessonData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    courseProgressData.forEach((cpd) => {
      if (!cpd.progress?.lessonHistory) return;
      Object.values(cpd.progress.lessonHistory).forEach((entry) => {
        if (!entry.markedAsComplete || !entry.completedAt) return;
        let date: Date | null = null;
        if (entry.completedAt instanceof Date) date = entry.completedAt;
        else date = (entry.completedAt as any)?.toDate?.() || null;
        if (!date) return;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
      });
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [year, m] = month.split("-");
        const date = new Date(parseInt(year), parseInt(m) - 1);
        return {
          month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          lessons: count,
        };
      });
  }, [courseProgressData]);

  const monthlyLessonsConfig: ChartConfig = {
    lessons: { label: "Lessons Completed", color: "hsl(217, 91%, 60%)" },
  };

  // Weekly Consistency Data
  const consistencyData = useMemo(() => {
    const weekMap: Record<string, number> = {};
    courseProgressData.forEach((cpd) => {
      if (!cpd.progress?.lessonHistory) return;
      Object.values(cpd.progress.lessonHistory).forEach((entry) => {
        if (!entry.markedAsComplete || !entry.completedAt) return;
        let date: Date | null = null;
        if (entry.completedAt instanceof Date) date = entry.completedAt;
        else date = (entry.completedAt as any)?.toDate?.() || null;
        if (!date) return;
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        const key = d.toISOString().split("T")[0];
        weekMap[key] = (weekMap[key] || 0) + 1;
      });
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([weekStart, count]) => {
        const date = new Date(weekStart);
        return {
          week: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          lessons: count,
        };
      });
  }, [courseProgressData]);

  const consistencyConfig: ChartConfig = {
    lessons: { label: "Lessons", color: "hsl(199, 89%, 48%)" },
  };

  // Graded vs Ungraded Pie
  const submissionPieData = useMemo(() => {
    const graded = submissions.filter(
      (s) => s.marks !== null && s.marks !== undefined
    ).length;
    const ungraded = submissions.length - graded;
    return [
      { name: "Graded", value: graded, fill: "hsl(142, 76%, 36%)" },
      { name: "Ungraded", value: ungraded, fill: "hsl(48, 96%, 53%)" },
    ].filter((d) => d.value > 0);
  }, [submissions]);

  const submissionPieConfig: ChartConfig = {
    Graded: { label: "Graded", color: "hsl(142, 76%, 36%)" },
    Ungraded: { label: "Ungraded", color: "hsl(48, 96%, 53%)" },
  };

  // Graded Scores Line Data
  const gradedScoresData = useMemo(() => {
    return submissions
      .filter((s) => s.marks !== null && s.marks !== undefined)
      .sort((a, b) => {
        const dateA = a.createdAt
          ? (a.createdAt as any)?.toDate?.() || new Date(a.createdAt as any)
          : new Date(0);
        const dateB = b.createdAt
          ? (b.createdAt as any)?.toDate?.() || new Date(b.createdAt as any)
          : new Date(0);
        return dateA.getTime() - dateB.getTime();
      })
      .map((s) => {
        const date = s.createdAt
          ? (s.createdAt as any)?.toDate?.() || new Date(s.createdAt as any)
          : null;
        return {
          name:
            (s.assignmentTitle || s.assignmentId).length > 15
              ? (s.assignmentTitle || s.assignmentId).slice(0, 15) + "..."
              : s.assignmentTitle || s.assignmentId,
          fullName: s.assignmentTitle || s.assignmentId,
          score: s.marks!,
          date: date
            ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "N/A",
        };
      });
  }, [submissions]);

  const gradedScoresConfig: ChartConfig = {
    score: { label: "Score", color: "hsl(262, 83%, 58%)" },
  };

  // --- Guards ---

  if (!user?.organizationId) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
          <h2 className="text-2xl font-bold">Not Assigned to an Organization</h2>
        </div>
      </TeacherLayout>
    );
  }

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading student details...
          </span>
        </div>
      </TeacherLayout>
    );
  }

  if (!student) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
          <h2 className="text-2xl font-bold">Student Not Found</h2>
          <Button variant="outline" onClick={() => navigate("/teacher/students")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
        </div>
      </TeacherLayout>
    );
  }

  // --- Render ---

  return (
    <TeacherLayout>
      <div className="space-y-5">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/teacher/students")}
          className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Button>

        {/* Student Header - Bento Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-background via-background to-muted/30 p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-3xl font-bold text-primary">
                {student.firstName?.[0]}
                {student.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {student.firstName}{" "}
                {student.middleName ? `${student.middleName} ` : ""}
                {student.lastName}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{student.email}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {student.class && (
                  <Badge variant="secondary" className="rounded-lg text-xs font-medium">
                    Class: {student.class}
                  </Badge>
                )}
                {student.division && (
                  <Badge variant="secondary" className="rounded-lg text-xs font-medium">
                    Division: {student.division}
                  </Badge>
                )}
                <Badge
                  className={cn(
                    "rounded-lg text-xs font-medium",
                    student.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : student.status === "SUSPENDED"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                        : ""
                  )}
                >
                  {student.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="group rounded-2xl border bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/40 dark:to-blue-900/10 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600/80 dark:text-blue-400/80">
                  Courses
                </p>
                <p className="text-3xl font-bold mt-1.5 text-blue-900 dark:text-blue-100">
                  {enrollments.length}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/40 dark:to-emerald-900/10 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">
                  Lessons Done
                </p>
                <p className="text-3xl font-bold mt-1.5 text-emerald-900 dark:text-emerald-100">
                  {totalLessonsCompleted}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-amber-950/40 dark:to-amber-900/10 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600/80 dark:text-amber-400/80">
                  Comments
                </p>
                <p className="text-3xl font-bold mt-1.5 text-amber-900 dark:text-amber-100">
                  {commentStats?.totalComments || 0}
                </p>
                {commentStats && commentStats.totalUpvotes > 0 && (
                  <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60 mt-0.5">
                    {commentStats.totalUpvotes} upvotes
                  </p>
                )}
              </div>
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border bg-gradient-to-br from-violet-50 to-violet-100/30 dark:from-violet-950/40 dark:to-violet-900/10 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600/80 dark:text-violet-400/80">
                  Time Spent
                </p>
                <p className="text-3xl font-bold mt-1.5 text-violet-900 dark:text-violet-100">
                  {formatTime(totalTimeSpent)}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-violet-500/10 dark:bg-violet-400/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-5 w-5 text-violet-500 dark:text-violet-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="courses" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
              <BookOpen className="h-4 w-4" />
              Courses ({enrollments.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              Submissions ({submissions.length})
            </TabsTrigger>
          </TabsList>

          {/* === COURSES TAB === */}
          <TabsContent value="courses" className="mt-6">
            {courseProgressData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 opacity-40" />
                </div>
                <p className="font-medium">Not enrolled in any courses yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Progress Across Courses - Large Bento Card */}
                {courseBarData.length > 0 && (
                  <div className="lg:col-span-7 rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Progress Across Courses</h3>
                        <p className="text-xs text-muted-foreground">Completion % per course</p>
                      </div>
                    </div>
                    <ChartContainer config={courseBarConfig} className="h-[280px] w-full mt-2">
                      <BarChart data={courseBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={160} fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""} />} />
                        <Bar dataKey="completion" radius={[0, 6, 6, 0]} name="Completion %">
                          {courseBarData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                )}

                {/* Monthly Lesson Completions */}
                {monthlyLessonData.length > 0 && (
                  <div className="lg:col-span-5 rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Monthly Completions</h3>
                        <p className="text-xs text-muted-foreground">Lessons completed each month</p>
                      </div>
                    </div>
                    <ChartContainer config={monthlyLessonsConfig} className="h-[280px] w-full mt-2">
                      <BarChart data={monthlyLessonData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="lessons" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} name="Lessons Completed" />
                      </BarChart>
                    </ChartContainer>
                  </div>
                )}

                {/* Course Progress Cards - Compact List */}
                <div className="lg:col-span-5 space-y-3">
                  {courseProgressData.map((cpd) => {
                    const colors = getProgressColor(cpd.completionPercent);
                    return (
                      <div key={cpd.enrollment.id} className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm truncate">
                              {cpd.enrollment.courseName || cpd.enrollment.courseId}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(cpd.totalTimeSpent)}
                              </span>
                              {cpd.lastAccessed && (
                                <span>Last: {cpd.lastAccessed.toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <Badge className={cn("text-[10px] shrink-0 rounded-md", STATUS_STYLES[cpd.enrollment.status] || "")}>
                            {cpd.enrollment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-muted/50 rounded-full h-2">
                            <div
                              className={cn("h-2 rounded-full transition-all duration-500", colors.bar)}
                              style={{ width: `${Math.min(cpd.completionPercent, 100)}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-bold tabular-nums", colors.text)}>
                            {cpd.completionPercent}%
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {cpd.completedLessons}/{cpd.totalLessons}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Learning Consistency - Wide Card */}
                {consistencyData.length > 0 && (
                  <div className="lg:col-span-7 rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-cyan-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Learning Consistency</h3>
                        <p className="text-xs text-muted-foreground">Weekly activity (last 12 weeks)</p>
                      </div>
                    </div>
                    <ChartContainer config={consistencyConfig} className="h-[280px] w-full mt-2">
                      <BarChart data={consistencyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="lessons" fill="hsl(199, 89%, 48%)" radius={[6, 6, 0, 0]} name="Lessons" />
                      </BarChart>
                    </ChartContainer>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* === COMMENTS TAB === */}
          <TabsContent value="comments" className="mt-6 space-y-4">
            {commentStats && commentStats.totalComments > 0 && commentPieData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Comment Pie - Bento Card */}
                <div className="lg:col-span-5 rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-sm">Status Breakdown</h3>
                  </div>
                  <ChartContainer config={commentPieConfig} className="h-[180px] w-full">
                    <PieChart>
                      <Pie data={commentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                        {commentPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    {commentPieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comment Summary - Bento Card */}
                <div className="lg:col-span-7 rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-violet-500" />
                    </div>
                    <h3 className="font-semibold text-sm">Comment Summary</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-3xl font-bold">{commentStats.totalComments}</p>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Total</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-800/30">
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{commentStats.approvedComments}</p>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Approved</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/30">
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{commentStats.pendingComments}</p>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Pending</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/30 dark:border-blue-800/30">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{commentStats.totalUpvotes}</p>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Upvotes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Table */}
            {comments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 opacity-40" />
                </div>
                <p className="font-medium">No comments yet</p>
              </div>
            ) : (
              <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">All Comments</h3>
                    <Badge variant="secondary" className="rounded-md text-[10px] ml-1">
                      {comments.length}
                    </Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider">Course</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider">Lesson</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider max-w-[300px]">Comment</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comments.map((comment) => (
                        <TableRow key={comment.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium text-sm">
                            {comment.courseName || comment.courseId}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {comment.lessonName || comment.lessonId}
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <p className="line-clamp-2 text-sm">{comment.content}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[10px] rounded-md", COMMENT_STATUS_STYLES[comment.status] || "")}>
                              {comment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {comment.createdAt
                              ? new Date(comment.createdAt as any).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* === SUBMISSIONS TAB === */}
          <TabsContent value="submissions" className="mt-6 space-y-4">
            {submissions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 opacity-40" />
                </div>
                <p className="font-medium">No submissions yet</p>
              </div>
            ) : (
              <>
                {/* Bento Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Grading Status Pie - Bento Card */}
                  {submissionPieData.length > 0 && (
                    <div className="lg:col-span-5 rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Grading Status</h3>
                          <p className="text-xs text-muted-foreground">Graded vs ungraded</p>
                        </div>
                      </div>
                      <ChartContainer config={submissionPieConfig} className="h-[200px] w-full">
                        <PieChart>
                          <Pie data={submissionPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                            {submissionPieData.map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="flex items-center justify-center gap-4 mt-2">
                        {submissionPieData.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-muted-foreground">{item.name} ({item.value})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Graded Scores Line - Bento Card */}
                  {gradedScoresData.length > 0 && (
                    <div className="lg:col-span-7 rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-violet-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Score Progression</h3>
                          <p className="text-xs text-muted-foreground">Graded assignment scores</p>
                        </div>
                      </div>
                      <ChartContainer config={gradedScoresConfig} className="h-[220px] w-full">
                        <LineChart data={gradedScoresData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""} />} />
                          <Line type="monotone" dataKey="score" stroke="hsl(262, 83%, 58%)" strokeWidth={2.5} dot={{ fill: "hsl(262, 83%, 58%)", r: 4, strokeWidth: 2, stroke: "hsl(262, 83%, 70%)" }} activeDot={{ r: 6, strokeWidth: 0 }} name="Score" />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  )}
                </div>

                {/* Submissions Table - Bento Card */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">All Submissions</h3>
                      <Badge variant="secondary" className="rounded-md text-[10px] ml-1">
                        {submissions.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider">Assignment</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider">Marks</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider">Feedback</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((submission) => {
                          const isGraded = submission.marks !== null && submission.marks !== undefined;
                          return (
                            <TableRow key={submission.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell>
                                <p className="font-medium text-sm">
                                  {submission.assignmentTitle || submission.assignmentId}
                                </p>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    "text-[10px] rounded-md",
                                    isGraded
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                  )}
                                >
                                  {isGraded ? "Graded" : "Ungraded"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold tabular-nums">
                                {isGraded ? submission.marks : "-"}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                  {submission.feedback || "-"}
                                </p>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {submission.createdAt
                                  ? new Date(submission.createdAt as any).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TeacherLayout>
  );
};

export default TeacherStudentDetail;

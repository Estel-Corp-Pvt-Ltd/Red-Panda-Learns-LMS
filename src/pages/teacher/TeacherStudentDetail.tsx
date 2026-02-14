import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeacherLayout from "@/components/TeacherLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/teacher/students")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>

        {/* Student Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-primary">
                  {student.firstName?.[0]}
                  {student.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold truncate">
                  {student.firstName}{" "}
                  {student.middleName ? `${student.middleName} ` : ""}
                  {student.lastName}
                </h1>
                <p className="text-muted-foreground">{student.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {student.class && (
                    <Badge variant="secondary">Class: {student.class}</Badge>
                  )}
                  {student.division && (
                    <Badge variant="secondary">
                      Division: {student.division}
                    </Badge>
                  )}
                  <Badge
                    className={cn(
                      "text-xs",
                      student.status === "ACTIVE"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : student.status === "SUSPENDED"
                          ? "bg-red-100 text-red-800"
                          : ""
                    )}
                    variant={
                      student.status === "ACTIVE"
                        ? "default"
                        : student.status === "SUSPENDED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {student.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Courses Enrolled
                  </p>
                  <p className="text-2xl font-bold">{enrollments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Lessons Completed
                  </p>
                  <p className="text-2xl font-bold">{totalLessonsCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comments</p>
                  <p className="text-2xl font-bold">
                    {commentStats?.totalComments || 0}
                  </p>
                  {commentStats && commentStats.totalUpvotes > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {commentStats.totalUpvotes} upvotes
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Time Spent
                  </p>
                  <p className="text-2xl font-bold">
                    {formatTime(totalTimeSpent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Courses ({enrollments.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <FileText className="h-4 w-4" />
              Submissions ({submissions.length})
            </TabsTrigger>
          </TabsList>

          {/* === COURSES TAB === */}
          <TabsContent value="courses" className="mt-4 space-y-6">
            {courseProgressData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Not enrolled in any courses yet</p>
              </div>
            ) : (
              <>
                {/* Course Progress Cards */}
                <div className="grid gap-4">
                  {courseProgressData.map((cpd) => {
                    const colors = getProgressColor(cpd.completionPercent);
                    return (
                      <Card key={cpd.enrollment.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold truncate">
                                {cpd.enrollment.courseName ||
                                  cpd.enrollment.courseId}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTime(cpd.totalTimeSpent)}
                                </span>
                                {cpd.lastAccessed && (
                                  <span>
                                    Last active:{" "}
                                    {cpd.lastAccessed.toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge
                              className={cn(
                                "text-xs shrink-0",
                                STATUS_STYLES[cpd.enrollment.status] || ""
                              )}
                            >
                              {cpd.enrollment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                              <div
                                className={cn(
                                  "h-3 rounded-full transition-all duration-500",
                                  colors.bar
                                )}
                                style={{
                                  width: `${Math.min(cpd.completionPercent, 100)}%`,
                                }}
                              />
                            </div>
                            <span
                              className={cn(
                                "text-sm font-semibold tabular-nums w-12 text-right",
                                colors.text
                              )}
                            >
                              {cpd.completionPercent}%
                            </span>
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {cpd.completedLessons}/{cpd.totalLessons} lessons
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Progress Chart */}
                {courseBarData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Progress Across Courses
                      </CardTitle>
                      <CardDescription>
                        Completion percentage for each enrolled course
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={courseBarConfig}
                        className="h-[300px] w-full"
                      >
                        <BarChart data={courseBarData} layout="vertical">
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={160}
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
                            dataKey="completion"
                            radius={[0, 4, 4, 0]}
                            name="Completion %"
                          >
                            {courseBarData.map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* === COMMENTS TAB === */}
          <TabsContent value="comments" className="mt-4 space-y-6">
            {/* Comment stats mini chart */}
            {commentStats &&
              commentStats.totalComments > 0 &&
              commentPieData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Comment Status Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={commentPieConfig}
                        className="h-[200px] w-full"
                      >
                        <PieChart>
                          <Pie
                            data={commentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {commentPieData.map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="flex items-center justify-center gap-4 mt-2">
                        {commentPieData.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center gap-1.5 text-sm"
                          >
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-muted-foreground">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Comment Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold">
                            {commentStats.totalComments}
                          </p>
                          <p className="text-sm text-muted-foreground">Total</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold text-emerald-600">
                            {commentStats.approvedComments}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Approved
                          </p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold text-amber-600">
                            {commentStats.pendingComments}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Pending
                          </p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold text-blue-600">
                            {commentStats.totalUpvotes}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Upvotes
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            {/* Comments Table */}
            {comments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No comments yet</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    All Comments
                  </CardTitle>
                  <CardDescription>
                    {comments.length} comment
                    {comments.length !== 1 ? "s" : ""} by this student
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course</TableHead>
                          <TableHead>Lesson</TableHead>
                          <TableHead className="max-w-[300px]">
                            Comment
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comments.map((comment) => (
                          <TableRow key={comment.id}>
                            <TableCell className="font-medium">
                              {comment.courseName || comment.courseId}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {comment.lessonName || comment.lessonId}
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <p className="line-clamp-2 text-sm">
                                {comment.content}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  COMMENT_STATUS_STYLES[comment.status] || ""
                                )}
                              >
                                {comment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {comment.createdAt
                                ? new Date(
                                    comment.createdAt as any
                                  ).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* === SUBMISSIONS TAB === */}
          <TabsContent value="submissions" className="mt-4">
            {submissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No submissions yet</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    All Submissions
                  </CardTitle>
                  <CardDescription>
                    {submissions.length} submission
                    {submissions.length !== 1 ? "s" : ""} by this student
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Marks</TableHead>
                          <TableHead>Feedback</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((submission) => {
                          const isGraded =
                            submission.marks !== null &&
                            submission.marks !== undefined;
                          return (
                            <TableRow key={submission.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {submission.assignmentTitle ||
                                      submission.assignmentId}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    isGraded
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                  )}
                                >
                                  {isGraded ? "Graded" : "Ungraded"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold">
                                {isGraded ? submission.marks : "-"}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                  {submission.feedback || "-"}
                                </p>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {submission.createdAt
                                  ? new Date(
                                      submission.createdAt as any
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TeacherLayout>
  );
};

export default TeacherStudentDetail;

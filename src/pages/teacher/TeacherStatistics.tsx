import { useCallback, useEffect, useMemo, useState } from "react";
import TeacherLayout from "@/components/TeacherLayout";
import { ClassDivisionFilter } from "@/components/teacher/ClassDivisionFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { teacherService } from "@/services/teacherService";
import { User } from "@/types/user";
import {
  AlertTriangle,
  BarChart3,
  Calendar as CalendarIcon,
  Loader2,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

type DatePreset = "month" | "quarter" | "halfyear" | "year" | "custom";

interface ProgressStatistics {
  totalLessonsCompleted: number;
  monthlyBreakdown: Array<{
    month: string;
    completions: number;
    avgCompletionsPerStudent: number;
  }>;
  studentProgress: Array<{
    studentId: string;
    lessonsCompleted: number;
    totalTimeSpent: number;
  }>;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return seconds > 0 ? `${seconds}s` : "0m";
}

const PRESET_LABELS: Record<DatePreset, string> = {
  month: "This Month",
  quarter: "Last 3 Months",
  halfyear: "Last 6 Months",
  year: "This Year",
  custom: "Custom Range",
};

const TeacherStatistics = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("quarter");
  const [startDate, setStartDate] = useState<Date>(
    startOfMonth(subMonths(new Date(), 3))
  );
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<ProgressStatistics | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const handleFilterChange = useCallback(
    (cls: string | null, div: string | null) => {
      setSelectedClass(cls);
      setSelectedDivision(div);
    },
    []
  );

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.organizationId) {
        setStudentsLoading(false);
        return;
      }
      try {
        const result = await teacherService.getAllOrganizationStudents(
          user.organizationId
        );
        if (result.success && result.data) {
          setAllStudents(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [user?.organizationId]);

  // Filter students by class/division
  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      if (selectedClass && student.class !== selectedClass) return false;
      if (selectedDivision && student.division !== selectedDivision)
        return false;
      return true;
    });
  }, [allStudents, selectedClass, selectedDivision]);

  // Fetch statistics when filters or date range changes
  useEffect(() => {
    const fetchStatistics = async () => {
      if (!user?.organizationId || filteredStudents.length === 0) {
        setStatistics(null);
        return;
      }

      setLoading(true);
      try {
        const studentIds = filteredStudents.map((s) => s.id);
        const result = await teacherService.getProgressStatistics(
          studentIds,
          startDate,
          endDate
        );

        if (result.success && result.data) {
          setStatistics(result.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to load statistics",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to fetch statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!studentsLoading) {
      fetchStatistics();
    }
  }, [user?.organizationId, filteredStudents, startDate, endDate, studentsLoading]);

  // Handle date preset change
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    switch (preset) {
      case "month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "quarter":
        setStartDate(startOfMonth(subMonths(now, 3)));
        setEndDate(endOfMonth(now));
        break;
      case "halfyear":
        setStartDate(startOfMonth(subMonths(now, 6)));
        setEndDate(endOfMonth(now));
        break;
      case "year":
        setStartDate(startOfYear(now));
        setEndDate(endOfMonth(now));
        break;
      case "custom":
        break;
    }
  };

  // Chart data
  const monthlyChartData = useMemo(() => {
    if (!statistics?.monthlyBreakdown) return [];
    return statistics.monthlyBreakdown.map((item) => ({
      month: format(new Date(item.month + "-01"), "MMM yy"),
      completions: item.completions,
      avg: item.avgCompletionsPerStudent,
    }));
  }, [statistics]);

  // Top performers
  const topPerformers = useMemo(() => {
    if (!statistics?.studentProgress) return [];
    return [...statistics.studentProgress]
      .sort((a, b) => b.lessonsCompleted - a.lessonsCompleted)
      .slice(0, 10)
      .map((sp, idx) => {
        const student = allStudents.find((s) => s.id === sp.studentId);
        return {
          ...sp,
          rank: idx + 1,
          studentName: student
            ? `${student.firstName} ${student.lastName}`
            : "Unknown",
          studentEmail: student?.email || "",
          studentClass: student?.class || "",
          studentDivision: student?.division || "",
        };
      });
  }, [statistics, allStudents]);

  const completionsConfig: ChartConfig = {
    completions: { label: "Total Completions", color: "hsl(142, 76%, 36%)" },
  };

  const avgConfig: ChartConfig = {
    avg: { label: "Avg per Student", color: "hsl(217, 91%, 60%)" },
  };

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

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Learning Statistics</h1>
              <p className="text-muted-foreground">
                Track student progress and performance over time
              </p>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Class/Division Filter */}
          <ClassDivisionFilter
            organizationId={user.organizationId}
            onFilterChange={handleFilterChange}
            students={allStudents}
          />

          {/* Date Range Picker */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <CardTitle className="text-base">Time Period</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRESET_LABELS) as DatePreset[]).map((preset) => (
                  <Button
                    key={preset}
                    variant={datePreset === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetChange(preset)}
                  >
                    {PRESET_LABELS[preset]}
                  </Button>
                ))}
              </div>

              {datePreset === "custom" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("justify-start text-left font-normal")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("justify-start text-left font-normal")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Showing data from {format(startDate, "MMM d, yyyy")} to{" "}
                {format(endDate, "MMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {loading || studentsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Loading statistics...
            </span>
          </div>
        ) : !statistics || filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No data available</p>
            <p className="text-sm mt-1">
              {filteredStudents.length === 0
                ? "No students match the selected filters"
                : "No progress data found for the selected period"}
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Completions
                      </p>
                      <p className="text-2xl font-bold">
                        {statistics.totalLessonsCompleted}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Students Tracked
                      </p>
                      <p className="text-2xl font-bold">
                        {filteredStudents.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                      <BarChart3 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avg per Student
                      </p>
                      <p className="text-2xl font-bold">
                        {filteredStudents.length > 0
                          ? Math.round(
                              statistics.totalLessonsCompleted /
                                filteredStudents.length
                            )
                          : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        lessons completed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                      <CalendarIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Monthly Avg
                      </p>
                      <p className="text-2xl font-bold">
                        {statistics.monthlyBreakdown.length > 0
                          ? Math.round(
                              statistics.totalLessonsCompleted /
                                statistics.monthlyBreakdown.length
                            )
                          : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        completions/month
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Completions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Monthly Lesson Completions
                  </CardTitle>
                  <CardDescription>
                    Total lessons completed each month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyChartData.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No completion data in this period
                    </p>
                  ) : (
                    <ChartContainer
                      config={completionsConfig}
                      className="h-[300px] w-full"
                    >
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                        />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="completions"
                          fill="var(--color-completions)"
                          radius={[4, 4, 0, 0]}
                          name="Total Completions"
                        />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Avg Completions per Student */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Average Progress per Student
                  </CardTitle>
                  <CardDescription>
                    Average lessons completed per student each month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyChartData.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No data in this period
                    </p>
                  ) : (
                    <ChartContainer
                      config={avgConfig}
                      className="h-[300px] w-full"
                    >
                      <LineChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                        />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="avg"
                          stroke="var(--color-avg)"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="Avg per Student"
                        />
                      </LineChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>
                  Top 10 students by lessons completed in this period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topPerformers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No progress data available
                  </p>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Division</TableHead>
                          <TableHead>Lessons Completed</TableHead>
                          <TableHead>Time Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topPerformers.map((performer) => (
                          <TableRow key={performer.studentId}>
                            <TableCell>
                              {performer.rank <= 3 ? (
                                <Badge
                                  className={cn(
                                    "text-xs w-7 h-7 rounded-full flex items-center justify-center p-0",
                                    performer.rank === 1 &&
                                      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                                    performer.rank === 2 &&
                                      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
                                    performer.rank === 3 &&
                                      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                  )}
                                >
                                  {performer.rank}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm pl-2">
                                  {performer.rank}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {performer.studentName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {performer.studentEmail}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {performer.studentClass || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {performer.studentDivision || "-"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {performer.lessonsCompleted}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatTime(performer.totalTimeSpent)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherStatistics;

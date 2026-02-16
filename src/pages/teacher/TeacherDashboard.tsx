import TeacherLayout from "@/components/TeacherLayout";
import { ClassDivisionFilter } from "@/components/teacher/ClassDivisionFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { organizationService } from "@/services/organizationService";
import { teacherService } from "@/services/teacherService";
import { courseService } from "@/services/courseService";
import { User } from "@/types/user";
import { AlertTriangle, BookOpen, HelpCircle, Loader2, MessageSquareText, NotepadText, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingSubmissions: 0,
    pendingComments: 0,
    activeCourses: 0,
  });

  const handleFilterChange = useCallback(
    (cls: string | null, div: string | null) => {
      setSelectedClass(cls);
      setSelectedDivision(div);
    },
    []
  );

  const filteredStudentCount = useMemo(() => {
    if (!selectedClass && !selectedDivision) return allStudents.length;
    return allStudents.filter((s) => {
      if (selectedClass && s.class !== selectedClass) return false;
      if (selectedDivision && s.division !== selectedDivision) return false;
      return true;
    }).length;
  }, [allStudents, selectedClass, selectedDivision]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.organizationId) {
        setLoading(false);
        return;
      }

      try {
        const [orgResult, statsResult, coursesResult, studentsResult] = await Promise.all([
          organizationService.getOrganizationById(user.organizationId),
          teacherService.getDashboardStats(user.organizationId),
          courseService.getPublishedCourses(),
          teacherService.getAllOrganizationStudents(user.organizationId),
        ]);

        if (orgResult.success && orgResult.data) {
          setOrgName(orgResult.data.name);
        }

        if (studentsResult.success && studentsResult.data) {
          setAllStudents(studentsResult.data);
        }

        if (statsResult.success && statsResult.data) {
          setStats((prev) => ({
            ...prev,
            totalStudents: statsResult.data.totalStudents,
            pendingSubmissions: statsResult.data.pendingSubmissions,
            pendingComments: statsResult.data.pendingComments,
          }));
        }

        if (coursesResult.success && coursesResult.data) {
          setStats((prev) => ({
            ...prev,
            activeCourses: coursesResult.data.length,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.organizationId]);

  if (!user?.organizationId) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
          <h2 className="text-2xl font-bold">Not Assigned to an Organization</h2>
          <p className="text-muted-foreground text-center max-w-md">
            You have not been assigned to an organization yet. Please contact your administrator to get assigned to an organization before you can use the Teacher Dashboard.
          </p>
        </div>
      </TeacherLayout>
    );
  }

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
        </div>
      </TeacherLayout>
    );
  }

  const statCards = [
    {
      title: "Total Students",
      value: selectedClass || selectedDivision ? filteredStudentCount : stats.totalStudents,
      icon: <Users className="h-6 w-6" />,
      description: "Students in your organization",
      tooltip: "The total number of students currently assigned to your organization",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Pending Submissions",
      value: stats.pendingSubmissions,
      icon: <NotepadText className="h-6 w-6" />,
      description: "Assignments awaiting grading",
      tooltip: "Assignment submissions from your students that haven't been graded yet",
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: "Pending Comments",
      value: stats.pendingComments,
      icon: <MessageSquareText className="h-6 w-6" />,
      description: "Comments awaiting moderation",
      tooltip: "Comments from your students that need to be approved or rejected",
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Active Courses",
      value: stats.activeCourses,
      icon: <BookOpen className="h-6 w-6" />,
      description: "Published courses available",
      tooltip: "Total number of published courses available on the platform",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950",
    },
  ];

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! You are managing{" "}
            <span className="font-semibold text-foreground">{orgName}</span>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.title} className="relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{card.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Tips</CardTitle>
            <CardDescription>Get the most out of your Teacher Dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Users className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Manage Students</p>
                  <p className="text-xs text-muted-foreground">
                    View all students in your organization, track their enrollment status and course progress from the Students page.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <NotepadText className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Grade Assignments</p>
                  <p className="text-xs text-muted-foreground">
                    Review and grade assignment submissions. You can give marks and provide feedback to help students improve.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <MessageSquareText className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Moderate Comments</p>
                  <p className="text-xs text-muted-foreground">
                    Approve or remove comments posted by your students. Keep discussions productive and on-topic.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <BookOpen className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Bulk Upload</p>
                  <p className="text-xs text-muted-foreground">
                    Quickly add multiple students by uploading a CSV file. Students will be automatically assigned to your organization.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;

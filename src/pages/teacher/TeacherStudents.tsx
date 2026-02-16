import TeacherLayout from "@/components/TeacherLayout";
import { ClassDivisionFilter } from "@/components/teacher/ClassDivisionFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { USER_STATUS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { enrollmentService } from "@/services/enrollmentService";
import { teacherService } from "@/services/teacherService";
import { Enrollment } from "@/types/enrollment";
import { User } from "@/types/user";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const TeacherStudents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Record<string, Enrollment[]>>({});
  const [loadingEnrollments, setLoadingEnrollments] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const handleFilterChange = useCallback((cls: string | null, div: string | null) => {
    setSelectedClass(cls);
    setSelectedDivision(div);
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.organizationId) {
        setLoading(false);
        return;
      }

      try {
        const result = await teacherService.getOrganizationStudents(user.organizationId, {
          limit: 100,
        });
        console.log("API response for students:", result);
        if (result.success && result.data) {
          setStudents(result.data.data);
          console.log("Fetched students:", result.data.data[1].class);
        } else {
          toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
        toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user?.organizationId]);

  const toggleStudentExpand = async (studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
      return;
    }

    setExpandedStudentId(studentId);

    if (!studentEnrollments[studentId]) {
      setLoadingEnrollments(studentId);
      try {
        const result = await enrollmentService.getUserEnrollments(studentId);
        if (result.success && result.data) {
          setStudentEnrollments((prev) => ({
            ...prev,
            [studentId]: result.data,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch enrollments:", error);
      } finally {
        setLoadingEnrollments(null);
      }
    }
  };

  const filteredStudents = students.filter((student) => {
    if (selectedClass && student.class !== selectedClass) return false;
    if (selectedDivision && student.division !== selectedDivision) return false;
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const email = student.email?.toLowerCase() || "";
    const q = searchQuery.toLowerCase();
    return fullName.includes(q) || email.includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case USER_STATUS.ACTIVE:
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </Badge>
        );
      case USER_STATUS.INACTIVE:
        return <Badge variant="secondary">Inactive</Badge>;
      case USER_STATUS.SUSPENDED:
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Students</h1>
              <p className="text-muted-foreground">
                View all students in your organization and track their progress
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
                Click on any student row to expand and view their course enrollments and progress
                details.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Class/Division Filter */}
        {user?.organizationId && (
          <ClassDivisionFilter
            organizationId={user.organizationId}
            onFilterChange={handleFilterChange}
            students={students}
          />
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Students</CardTitle>
            <CardDescription>
              {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading students...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students found</p>
                <p className="text-sm mt-1">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "No students are assigned to your organization yet"}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <>
                        <TableRow
                          key={student.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/teacher/students/${student.id}`)}
                        >
                          <TableCell className="w-8">
                            {expandedStudentId === student.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {student.firstName} {student.middleName ? `${student.middleName} ` : ""}
                            {student.lastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{student.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {student.class || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {student.division || "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(student.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {student.createdAt
                              ? new Date(student.createdAt as any).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                        </TableRow>

                        {/* Expanded enrollments */}
                        {expandedStudentId === student.id && (
                          <TableRow key={`${student.id}-expand`}>
                            <TableCell colSpan={7} className="bg-muted/30 p-4">
                              {loadingEnrollments === student.id ? (
                                <div className="flex items-center gap-2 py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm text-muted-foreground">
                                    Loading enrollments...
                                  </span>
                                </div>
                              ) : studentEnrollments[student.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Course Enrollments ({studentEnrollments[student.id].length})
                                  </p>
                                  <div className="grid gap-2">
                                    {studentEnrollments[student.id].map((enrollment) => (
                                      <div
                                        key={enrollment.id}
                                        className="flex items-center justify-between p-3 bg-background rounded-lg border"
                                      >
                                        <div>
                                          <p className="text-sm font-medium">
                                            {enrollment.courseName || enrollment.courseId}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Enrolled:{" "}
                                            {enrollment.enrollmentDate
                                              ? new Date(
                                                  enrollment.enrollmentDate as any
                                                ).toLocaleDateString()
                                              : "N/A"}
                                          </p>
                                        </div>
                                        <Badge
                                          variant={
                                            enrollment.status === "COMPLETED"
                                              ? "default"
                                              : enrollment.status === "ACTIVE"
                                                ? "secondary"
                                                : "outline"
                                          }
                                        >
                                          {enrollment.status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground py-2">
                                  This student is not enrolled in any courses yet.
                                </p>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
};

export default TeacherStudents;

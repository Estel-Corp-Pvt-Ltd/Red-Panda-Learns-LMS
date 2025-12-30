// src/components/admin/AssignStudentsTab.tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Mail,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  Bell,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import { enrollmentService } from "@/services/enrollmentService";
import { courseService } from "@/services/courseService";
import React, { useState, useEffect, useCallback } from "react";
import { USER_ROLE, USER_STATUS, ENROLLMENT_STATUS } from "@/constants";
import { authService } from "@/services/authService";
import { User } from "@/types/user";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";
import { BACKEND_URL } from "@/config";
import { DocumentSnapshot } from "firebase/firestore";

interface PaginatedEnrollments {
  data: Enrollment[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: DocumentSnapshot | null;
  previousCursor?: DocumentSnapshot | null;
  totalCount: number;
}

interface StudentWithEnrollment {
  id: string;
  odooId:string;
  odooAddress:string;
  odooCity:string;
  odooCountryCode:string;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  photoURL?: string;
  status: string;
  enrollment: Enrollment;
}

interface AssignStudentsTabProps {
  assignedStudentIds: Set<string>;
  onStudentsAssigned: (studentIds: string[]) => void;
}

const AssignStudentsTab: React.FC<AssignStudentsTabProps> = ({
  assignedStudentIds,
  onStudentsAssigned,
}) => {
  const { user: adminUser } = useAuth();
  const adminId = adminUser?.id;

  // Course state
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  // Students state
  const [students, setStudents] = useState<StudentWithEnrollment[]>([]);
  const [enrollments, setEnrollments] = useState<PaginatedEnrollments>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    nextCursor: null,
    previousCursor: null,
    totalCount: 0,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Notification email state
  const [notificationEmail, setNotificationEmail] = useState(
    adminUser?.email || ""
  );
  const [emailError, setEmailError] = useState("");

  // Validate email format
  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setEmailError("Notification email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  // ----------------- Load Courses -----------------
  const loadCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const result = await courseService.getAllCourses();
      setCourses(result);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // ----------------- Load Students by Course Enrollment -----------------
  const loadStudentsByCourse = useCallback(
    async (
      courseId: string,
      cursor?: DocumentSnapshot | null,
      direction?: "next" | "previous",
      searchEmail: string = ""
    ) => {
      if (!courseId) {
        setStudents([]);
        setEnrollments({
          data: [],
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
          previousCursor: null,
          totalCount: 0,
        });
        return;
      }

      setIsLoading(true);
      try {
        // Build filters for enrollment query
        let filters: any[] = [
          { field: "courseId", op: "==", value: courseId },
          { field: "status", op: "==", value: ENROLLMENT_STATUS.ACTIVE },
        ];

        // Add search filter if provided (search by userEmail)
        if (searchEmail.trim()) {
          filters.push(
            { field: "userEmail", op: ">=", value: searchEmail },
            { field: "userEmail", op: "<=", value: searchEmail + "\uf8ff" }
          );
        }

        const response = await enrollmentService.getEnrollments(filters, {
          limit: 15,
          orderBy: { field: "enrollmentDate", direction: "desc" },
          cursor,
          pageDirection: direction,
        });

        if (response.success && response.data) {
          // Filter out already assigned students
          const filteredEnrollments = response.data.data.filter(
            (enrollment: Enrollment) =>
              !assignedStudentIds.has(enrollment.userId)
          );

          setEnrollments({
            ...response.data,
            data: filteredEnrollments,
            totalCount: filteredEnrollments.length,
          });

          // Fetch user details for each enrollment
          const studentPromises = filteredEnrollments.map(
            async (enrollment: Enrollment) => {
              try {
                const userResult = await userService.getUserById(
                  enrollment.userId
                );
                if (userResult.success && userResult.data) {
                  return {
                    id: userResult.data.id,
                    email: userResult.data.email,
                    firstName: userResult.data.firstName,
                    middleName: userResult.data.middleName,
                    lastName: userResult.data.lastName,
                    username: userResult.data.username,
                    photoURL: userResult.data.photoURL,
                    status: userResult.data.status,
                    enrollment,
                  } as StudentWithEnrollment;
                }
                // Fallback to enrollment data if user fetch fails
                return {
                  id: enrollment.userId,
                  email: enrollment.userEmail || "",
                  firstName: enrollment.userName?.split(" ")[0],
                  lastName: enrollment.userName?.split(" ").slice(1).join(" "),
                  status: USER_STATUS.ACTIVE,
                  enrollment,
                } as StudentWithEnrollment;
              } catch {
                return {
                  id: enrollment.userId,
                  email: enrollment.userEmail || "",
                  firstName: enrollment.userName?.split(" ")[0],
                  lastName: enrollment.userName?.split(" ").slice(1).join(" "),
                  status: USER_STATUS.ACTIVE,
                  enrollment,
                } as StudentWithEnrollment;
              }
            }
          );

          const studentsData = await Promise.all(studentPromises);
          setStudents(studentsData.filter(Boolean));
        }
      } catch (error) {
        console.error("Error loading students:", error);
        toast({
          title: "Error",
          description: "Failed to load students for this course",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [assignedStudentIds]
  );

  // ----------------- Handle Course Selection -----------------
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedIds([]);
    setSearchQuery("");
    setCurrentPage(1);
    loadStudentsByCourse(courseId);
  };

  // ----------------- Pagination -----------------
  const handleNextPage = async () => {
    if (!enrollments.hasNextPage || !selectedCourseId) return;

    setCurrentPage((prev) => prev + 1);
    await loadStudentsByCourse(
      selectedCourseId,
      enrollments.nextCursor,
      "next",
      searchQuery
    );
  };

  const handlePreviousPage = async () => {
    if (!enrollments.hasPreviousPage || !selectedCourseId) return;

    setCurrentPage((prev) => prev - 1);
    await loadStudentsByCourse(
      selectedCourseId,
      enrollments.previousCursor,
      "previous",
      searchQuery
    );
  };

  // ----------------- Search Student by Email -----------------
  const findUser = async () => {
    if (!selectedCourseId) {
      toast({
        title: "Error",
        description: "Please select a course first",
        variant: "destructive",
      });
      return;
    }

    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Enter a student email to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setCurrentPage(1);

    try {
      await loadStudentsByCourse(
        selectedCourseId,
        undefined,
        undefined,
        searchQuery.trim()
      );

      if (students.length === 0) {
        toast({
          title: "Not Found",
          description: "No student found with this email in the selected course",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Found ${students.length} student(s)`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Search failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // ----------------- Reset Search -----------------
  const resetSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
    if (selectedCourseId) {
      loadStudentsByCourse(selectedCourseId);
    }
  };

  // ----------------- Select Toggle -----------------
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ----------------- Select All on Current Page -----------------
  const toggleSelectAll = () => {
    const currentPageIds = students.map((s) => s.id);
    const allSelected = currentPageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  // ----------------- Assign Students API -----------------
  const assignStudents = async () => {
    if (!adminId) {
      toast({
        title: "Error",
        description: "Admin not logged in",
        variant: "destructive",
      });
      return;
    }

    if (selectedIds.length === 0) {
      toast({
        title: "Error",
        description: "No students selected",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(notificationEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid notification email",
        variant: "destructive",
      });
      return;
    }

    setLoadingAssign(true);

    try {
      const idToken = await authService.getToken();
      const res = await fetch(`${BACKEND_URL}/assignStudentsToAdmin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          adminId,
          studentIds: selectedIds,
          notificationEmail: notificationEmail.trim(),
        }),
      }).then((r) => r.json());

      if (res.success) {
        toast({
          title: "Success",
          description: `${selectedIds.length} student(s) assigned successfully. Notification will be sent to ${notificationEmail}`,
        });

        onStudentsAssigned(selectedIds);

        // Remove assigned students from current list
        setStudents((prev) =>
          prev.filter((student) => !selectedIds.includes(student.id))
        );

        setSelectedIds([]);
      } else {
        toast({
          title: "Error",
          description: res.message || "Assignment failed",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Assignment failed",
        variant: "destructive",
      });
    } finally {
      setLoadingAssign(false);
    }
  };

  // ----------------- Helper Functions -----------------
  const getFullName = (student: StudentWithEnrollment) => {
    const names = [student.firstName];
    if (student.middleName) names.push(student.middleName);
    if (student.lastName) names.push(student.lastName);
    return names.filter(Boolean).join(" ") || "Unknown";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case USER_STATUS.ACTIVE:
        return "default";
      case USER_STATUS.INACTIVE:
        return "secondary";
      case USER_STATUS.SUSPENDED:
        return "outline";
      default:
        return "outline";
    }
  };

  const getInitials = (student: StudentWithEnrollment) => {
    const { firstName, lastName, email } = student;

    const parts: string[] = [];
    if (firstName?.trim()) parts.push(firstName.trim()[0].toUpperCase());
    if (lastName?.trim()) parts.push(lastName.trim()[0].toUpperCase());

    if (parts.length > 0) return parts.join("");

    return email?.trim()?.charAt(0)?.toUpperCase() || "?";
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  // Update notification email when admin user changes
  useEffect(() => {
    if (adminUser?.email && !notificationEmail) {
      setNotificationEmail(adminUser.email);
    }
  }, [adminUser?.email]);

  // Get selected course name
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle>Assign Students</CardTitle>
            <CardDescription>
              Select a course to view enrolled students, then assign them to
              your admin account.
              {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
              {students.length > 0 && ` • Page ${currentPage}`}
              {assignedStudentIds.size > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  • {assignedStudentIds.size} already assigned
                </span>
              )}
            </CardDescription>
          </div>

          {/* Course Selection Dropdown */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="courseSelect" className="text-sm font-medium">
              <BookOpen className="inline h-4 w-4 mr-2" />
              Select Course *
            </Label>
            <Select
              value={selectedCourseId}
              onValueChange={handleCourseChange}
              disabled={isLoadingCourses}
            >
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue
                  placeholder={
                    isLoadingCourses
                      ? "Loading courses..."
                      : "Select a course to view students"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCourse && (
              <p className="text-xs text-muted-foreground">
                Showing students enrolled in: {selectedCourse.title}
              </p>
            )}
          </div>

          {/* Search Controls - Only show if course is selected */}
          {selectedCourseId && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="flex w-full sm:w-72 items-center gap-2">
                <input
                  type="email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && findUser()}
                  placeholder="Search student by email..."
                  className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={resetSearch}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>

                <Button
                  onClick={findUser}
                  disabled={isSearching}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Notification Email Field */}
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="notificationEmail" className="text-sm font-medium">
                Notification Email
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              You will receive assignment notifications at this email address.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="notificationEmail"
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => {
                      setNotificationEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(notificationEmail)}
                    placeholder="Enter your notification email..."
                    className={`pl-10 ${emailError ? "border-red-500 focus:ring-red-500" : ""}`}
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-red-500 mt-1">{emailError}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (adminUser?.email) {
                    setNotificationEmail(adminUser.email);
                    setEmailError("");
                  }
                }}
                className="whitespace-nowrap"
              >
                Use My Email
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {/* No Course Selected State */}
        {!selectedCourseId && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No course selected</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please select a course from the dropdown above to view enrolled
              students.
            </p>
          </div>
        )}

        {/* Loading State */}
        {selectedCourseId && isLoading && students.length === 0 && (
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading students...</p>
            </div>
          </div>
        )}

        {/* No Students Found */}
        {selectedCourseId && !isLoading && students.length === 0 && (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">
              No unassigned students found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {assignedStudentIds.size > 0
                ? "All students in this course have been assigned. Try selecting a different course."
                : "No students are enrolled in this course yet."}
            </p>
          </div>
        )}

        {/* Students Table */}
        {selectedCourseId && students.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          students.length > 0 &&
                          students.every((s) => selectedIds.includes(s.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Selected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className={`cursor-pointer transition ${
                        selectedIds.includes(student.id) ? "bg-primary/5" : ""
                      }`}
                      onClick={() => toggleSelect(student.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(student.id)}
                          onChange={() => toggleSelect(student.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {student.photoURL ? (
                            <img
                              src={student.photoURL}
                              alt={getFullName(student)}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs uppercase text-white bg-gradient-to-br from-blue-500 to-indigo-500">
                              {getInitials(student)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">
                              {getFullName(student)}
                            </div>
                            {student.username && (
                              <div className="text-sm text-muted-foreground">
                                @{student.username}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{student.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(student.enrollment.enrollmentDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(student.status)}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {selectedIds.includes(student.id) && (
                          <CheckCircle className="h-5 w-5 text-green-600 inline" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between space-x-0 sm:space-x-2 space-y-2 sm:space-y-0 py-4">
              <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
                Showing {students.length} unassigned students from{" "}
                {selectedCourse?.title}
                {enrollments.totalCount > students.length &&
                  ` (page ${currentPage})`}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!enrollments.hasPreviousPage || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!enrollments.hasNextPage || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Assign Button */}
        {selectedCourseId && students.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <span>{selectedIds.length} student(s) selected</span>
                {notificationEmail && (
                  <span className="hidden sm:inline">
                    {" "}
                    • Notifications to:{" "}
                    <span className="font-medium">{notificationEmail}</span>
                  </span>
                )}
              </div>
              <Button
                onClick={assignStudents}
                disabled={
                  loadingAssign ||
                  selectedIds.length === 0 ||
                  !notificationEmail.trim()
                }
                className="w-full sm:w-auto"
              >
                {loadingAssign ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Assign{" "}
                    {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}{" "}
                    Students
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignStudentsTab;
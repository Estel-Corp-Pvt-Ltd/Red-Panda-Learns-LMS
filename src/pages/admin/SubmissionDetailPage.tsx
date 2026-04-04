import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { assignmentService } from "@/services/assignmentService";
import { courseService } from "@/services/courseService";
import { useDebounce } from "@/hooks/useDebounce";
import { AssignmentSubmission, Assignment } from "@/types/assignment";
import { Course } from "@/types/course";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Eye,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
  ChevronsUpDown,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/utils/date-time";
import { DocumentSnapshot, WhereFilterOp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import MDEditor from "@uiw/react-md-editor";
import AdminLayout from "@/components/AdminLayout";
import ViewSubmissionModal from "@/components/admin/ViewSubmissionModal";
import { markSubmissionEvaluatedService } from "@/services/markSubmissionEvaluatedService";
import { authService } from "@/services/authService";
import { pushNotificationService } from "@/services/pushNotificationService";

interface FilterState {
  gradingStatus: "all" | "graded" | "ungraded";
  courseFilter: string;
  assignmentFilter: string;
  sortBy: "studentName" | "createdAt" | "marks";
  sortOrder: "asc" | "desc";
}

interface ExportData {
  "Student Email": string;
  "Student Name": string;
  "Assignment Title": string;
  "Assignment ID": string;
  "Submitted Date": string;
  Marks: string;
}

const AllSubmissionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<AssignmentSubmission | null>(null);
  const [minimumMarks,setMinimumMarks] = useState<number>(60);
  const [maximumMarks, setMaximumMarks] = useState<number>(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<AssignmentSubmission | null>(null);
  const [exporting, setExporting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<{
    data: AssignmentSubmission[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor: DocumentSnapshot | null;
    previousCursor: DocumentSnapshot | null;
    totalCount: number;
  } | null>(null);
  const [cursorStack, setCursorStack] = useState<DocumentSnapshot[]>([]);
  const [currentCursor, setCurrentCursor] = useState<DocumentSnapshot | null>(null);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const location = useLocation();
  const [filters, setFilters] = useState<FilterState>({
    gradingStatus: "all",
    courseFilter: "all",
    assignmentFilter: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [courseOpen, setCourseOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const studentSearch = useDebounce(searchInput, 300);
  const [assignmentTitle, setAssignmentTitle] = useState<Record<string, string>>({});
  // Filter assignments based on selected course
  useEffect(() => {
    if (filters.courseFilter === "all") {
      setAssignments(allAssignments);
    } else {
      const filteredAssignments = allAssignments.filter(
        (assignment) => assignment.courseId === filters.courseFilter
      );
      setAssignments(filteredAssignments);

      // Reset assignment filter if current selection is not in filtered list
      if (
        filters.assignmentFilter !== "all" &&
        !filteredAssignments.some((a) => a.id === filters.assignmentFilter)
      ) {
        setFilters((prev) => ({ ...prev, assignmentFilter: "all" }));
      }
    }
  }, [filters.courseFilter, allAssignments]);

  // Handle URL parameters for direct submission viewing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const submissionId = params.get("submissionId");
    if (submissionId) {
      const submission = submissions.find((s) => s.id === submissionId);
      if (submission) {
        handleViewSubmission(submission);
      }
    }
  }, [location, submissions]);

  // Reset pagination and reload data when activeFilters change (server-side filters)
  useEffect(() => {
    loadInitialData();
  }, [activeFilters, pageSize]);

  // Apply client-side sorting
  useEffect(() => {
    if (!submissions.length) return;

    const sorted = [...submissions].sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];

      if (filters.sortBy === "createdAt") {
        aValue = aValue?.toDate?.() || aValue;
        bValue = bValue?.toDate?.() || bValue;
      }

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setSubmissions(sorted);
  }, [filters.sortBy, filters.sortOrder]);

  // Load maximum marks when a submission is selected for grading
  useEffect(() => {
    if (selectedSubmission) {
      const fetchAssignmentDetails = async (assignmentId: string) => {
        const result = await assignmentService.getAssignmentById(assignmentId);
        if (result.success && result.data) {
          setMaximumMarks(result.data.totalPoints || 100);
          setMinimumMarks(result.data.minimumPassPoint || 60);
        }
        setMarks(selectedSubmission.marks?.toString() || "");
        setFeedback(selectedSubmission.feedback || "");
      };

      fetchAssignmentDetails(selectedSubmission.assignmentId);
    }
  }, [selectedSubmission]);

  // Update activeFilters when server-side filter criteria change
  useEffect(() => {
    const firestoreFilters: any[] = [];

    // Add course filter if selected
    if (filters.courseFilter && filters.courseFilter !== "all") {
      firestoreFilters.push({
        field: "courseId",
        op: "==",
        value: filters.courseFilter,
      });
    }

    if (filters.assignmentFilter && filters.assignmentFilter !== "all") {
      firestoreFilters.push({
        field: "assignmentId",
        op: "==",
        value: filters.assignmentFilter,
      });
    }

    if (filters.gradingStatus === "graded") {
      firestoreFilters.push({
        field: "marks",
        op: ">=",
        value: 0,
      });
    } else if (filters.gradingStatus === "ungraded") {
      firestoreFilters.push({
        field: "marks",
        op: "==",
        value: null,
      });
    }

    setActiveFilters(firestoreFilters);
  }, [filters.courseFilter, filters.assignmentFilter, filters.gradingStatus]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Reset pagination state
      setCurrentCursor(null);
      setCursorStack([]);

      // Load submissions with server-side filters
      const submissionsResult = await assignmentService.getFirstSubmissionsPage(
        activeFilters,
        pageSize
      );

      if (submissionsResult.success && submissionsResult.data) {
        setCurrentPage(submissionsResult.data);
        setSubmissions(submissionsResult.data.data);
        setCurrentCursor(submissionsResult.data.nextCursor);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load courses and assignments once on mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        // Load courses for dropdown
        const coursesData = await courseService.getAllCourses();
        setCourses(coursesData);

        // Load assignments for dropdown
        const assignmentsData = await assignmentService.getAllAssignments();
        setAllAssignments(assignmentsData);
        setAssignments(assignmentsData);
      } catch (error) {
        console.error("Error loading dropdown data:", error);
      }
    };

    loadDropdownData();
  }, []);

  const loadNextPage = async () => {
    if (!currentCursor) return;

    const result = await assignmentService.getNextSubmissionsPage(
      currentCursor,
      activeFilters,
      pageSize
    );

    if (result.success && result.data) {
      setCursorStack((prev) => [...prev, currentCursor!]);
      setCurrentPage(result.data);
      setSubmissions(result.data.data);
      setCurrentCursor(result.data.nextCursor);
    }
  };

  const loadPreviousPage = async () => {
    if (cursorStack.length === 0) return;

    const previousCursor = cursorStack[cursorStack.length - 1];
    const result = await assignmentService.getPreviousSubmissionsPage(
      previousCursor,
      activeFilters,
      pageSize
    );

    if (result.success && result.data) {
      setCursorStack((prev) => prev.slice(0, -1));
      setCurrentPage(result.data);
      setSubmissions(result.data.data);
      setCurrentCursor(result.data.nextCursor);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      gradingStatus: "all",
      courseFilter: "all",
      assignmentFilter: "all",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    setSearchInput("");
    setActiveFilters([]);
  };

  const handleViewSubmission = (submission: AssignmentSubmission) => {
    setViewingSubmission(submission);
    setIsViewModalOpen(true);
  };

  const openGradeModal = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const closeGradeModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
    setMarks("");
    setFeedback("");
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;

    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks)) {
      alert("Please enter valid marks");
      return;
    }

    if (numericMarks > maximumMarks) {
      alert(`Marks cannot exceed maximum marks (${maximumMarks})`);
      return;
    }

    try {
      setSaving(true);
      await assignmentService.updateSubmission(selectedSubmission.id!, {
        marks: numericMarks,
        feedback: feedback.trim(),
      });

      // Update local state
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubmission.id
            ? { ...sub, marks: numericMarks, feedback: feedback.trim() }
            : sub
        )
      );

      // Mark submission as evaluated
      const idToken = await authService.getToken();
      if (idToken) {
        await markSubmissionEvaluatedService.mark(selectedSubmission.id!, idToken);
      } else {
        console.error("No ID token found — user not authenticated");
      }

      const isReevaluated =
        selectedSubmission.marks !== null && selectedSubmission.marks !== undefined;

      await pushNotificationService.sendGradedNotification(
        selectedSubmission.id!,
        numericMarks,
        getAssignmentTitle(selectedSubmission),
        idToken,
        isReevaluated,
        maximumMarks,
        minimumMarks,
        selectedSubmission.courseId,
      );
      closeGradeModal();
    } catch (error) {
      console.error("Error saving grade:", error);
      alert("Failed to save grade");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;

    try {
      setDeleting(submissionToDelete.id!);
      await assignmentService.deleteSubmission(submissionToDelete.id!);

      setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionToDelete.id));
      setSubmissionToDelete(null);
    } catch (error) {
      console.error("Error deleting submission:", error);
      alert("Failed to delete submission");
    } finally {
      setDeleting(null);
    }
  };

  // Replace the existing getAssignmentTitle function with this
  const getAssignmentTitle = useCallback(
    (submission: AssignmentSubmission | null): string => {
      // Handle null submission
      if (!submission) {
        return "";
      }

      // First priority: use assignmentTitle from submission document
      if (submission.assignmentTitle) {
        return submission.assignmentTitle;
      }

      // Second priority: check cache
      if (assignmentTitle[submission.assignmentId]) {
        return assignmentTitle[submission.assignmentId];
      }

      // Third priority: find in allAssignments and cache it
      const assignment = allAssignments.find((a) => a.id === submission.assignmentId);
      if (assignment?.title) {
        setAssignmentTitle((prev) => ({
          ...prev,
          [submission.assignmentId]: assignment.title,
        }));
        return assignment.title;
      }

      // Fallback: return assignmentId
      return submission.assignmentId;
    },
    [allAssignments, assignmentTitle]
  );
  const getGradeText = (submission: AssignmentSubmission) => {
    return submission.marks !== undefined && submission.marks !== null
      ? `${submission.marks}`
      : "Not Graded";
  };

  const getGradeStatus = (submission: AssignmentSubmission) => {
    if (submission.marks !== undefined && submission.marks !== null) {
      return "default";
    }
    return "secondary";
  };

  const hasActiveFilters = () => {
    return (
      filters.courseFilter !== "all" ||
      filters.assignmentFilter !== "all" ||
      filters.gradingStatus !== "all" ||
      studentSearch.trim() !== ""
    );
  };

  // Check if export button should be enabled
  const canExport = filters.assignmentFilter !== "all";

  // CSV Export Functionality
  const exportToCSV = async () => {
    if (!canExport) return;

    try {
      setExporting(true);

      // Get all submissions for the selected assignment
      const exportFilters: {
        field: keyof AssignmentSubmission;
        op: WhereFilterOp;
        value: any;
      }[] = [{ field: "assignmentId", op: "==", value: filters.assignmentFilter }];

      // Also apply grading status filter if selected
      if (filters.gradingStatus === "graded") {
        exportFilters.push({ field: "marks", op: ">=", value: 0 });
      } else if (filters.gradingStatus === "ungraded") {
        exportFilters.push({ field: "marks", op: "==", value: null });
      }

      let allSubmissions: AssignmentSubmission[] = [];
      let hasMore = true;
      let cursor: DocumentSnapshot | null = null;

      while (hasMore) {
        const result = cursor
          ? await assignmentService.getNextSubmissionsPage(cursor, exportFilters, 100)
          : await assignmentService.getFirstSubmissionsPage(exportFilters, 100);

        if (result.success && result.data) {
          allSubmissions = [...allSubmissions, ...result.data.data];
          cursor = result.data.nextCursor;
          hasMore = result.data.hasNextPage;
        } else {
          hasMore = false;
        }
      }

      // Prepare data for CSV with only required fields
      const csvData: ExportData[] = allSubmissions.map((submission) => {
        const assignmentTitle = getAssignmentTitle(submission);

        const submittedDate = submission.createdAt ? formatDate(submission.createdAt) : "N/A";

        return {
          "Student Name": submission.studentName,
          "Student Email": submission.studentEmail || "",
          "Assignment Title": assignmentTitle,
          "Assignment ID": submission.assignmentId,
          "Submitted Date": submittedDate,
          Marks: submission.marks?.toString() || "Not Graded",
        };
      });

      // If no submissions found
      if (csvData.length === 0) {
        alert("No submissions found for export.");
        setExporting(false);
        return;
      }

      // Convert to CSV format
      const headers = Object.keys(csvData[0]).join(",");
      const rows = csvData.map((row) =>
        Object.values(row)
          .map((value) =>
            typeof value === "string" &&
            (value.includes(",") || value.includes('"') || value.includes("\n"))
              ? `"${value.replace(/"/g, '""')}"`
              : value
          )
          .join(",")
      );

      const csvContent = [headers, ...rows].join("\n");

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Create filename based on selected assignment
      const selectedAssignment = allAssignments.find((a) => a.id === filters.assignmentFilter);
      let filename = "submissions";
      if (selectedAssignment) {
        filename = `${selectedAssignment.title
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}_submissions`;
      }

      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Exported ${allSubmissions.length} submissions to CSV`);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Failed to export submissions. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const totalItems = currentPage?.totalCount || 0;
  const filteredSubmissions = submissions.filter((submission) =>
    studentSearch.trim() === ""
      ? true
      : submission.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        submission.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
        submission.studentEmail?.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const showingItems = filteredSubmissions.length;

  const colorMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  return (
    <AdminLayout>
      {/* Header with Export Button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Assignment Submissions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage student submissions</p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={exporting || !canExport}
          className="gap-2"
          title={
            canExport
              ? "Export submissions for selected assignment"
              : "Please select an assignment to enable export"
          }
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export CSV
            </>
          )}
        </Button>
      </div>

      {/* Compact Filters */}
      <Card className="bg-white dark:bg-gray-800 mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Quick Filters - Server-side */}
            <div className="flex-1 flex flex-wrap gap-2">
              {/* Course Combobox */}
              <Popover open={courseOpen} onOpenChange={setCourseOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={courseOpen}
                    className="w-full sm:w-[250px] justify-between"
                  >
                    <span className="truncate">
                      {filters.courseFilter === "all"
                        ? "All Courses"
                        : courses.find((course) => course.id === filters.courseFilter)?.title ||
                          "Select Course"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search courses..." />
                    <CommandList>
                      <CommandEmpty>No course found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all-courses"
                          onSelect={() => {
                            handleFilterChange("courseFilter", "all");
                            setCourseOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.courseFilter === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Courses
                        </CommandItem>
                        {courses.map((course) => (
                          <CommandItem
                            key={course.id}
                            value={`${course.id}-${course.title}`}
                            onSelect={() => {
                              handleFilterChange("courseFilter", course.id);
                              setCourseOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filters.courseFilter === course.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{course.title}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Assignment Combobox */}
              <Popover open={assignmentOpen} onOpenChange={setAssignmentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assignmentOpen}
                    className="w-full sm:w-[250px] justify-between"
                    disabled={assignments.length === 0}
                  >
                    <span className="truncate">
                      {assignments.length === 0
                        ? "No assignments available"
                        : filters.assignmentFilter === "all"
                        ? "All Assignments"
                        : assignments.find(
                            (assignment) => assignment.id === filters.assignmentFilter
                          )?.title || "Select Assignment"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search assignments..." />
                    <CommandList>
                      <CommandEmpty>No assignment found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all-assignments"
                          onSelect={() => {
                            handleFilterChange("assignmentFilter", "all");
                            setAssignmentOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.assignmentFilter === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Assignments
                        </CommandItem>
                        {assignments.map((assignment) => (
                          <CommandItem
                            key={assignment.id}
                            value={`${assignment.id}-${assignment.title}`}
                            onSelect={() => {
                              handleFilterChange("assignmentFilter", assignment.id);
                              setAssignmentOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filters.assignmentFilter === assignment.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">{assignment.title}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="relative w-full sm:w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search student name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 pr-9 w-full"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchInput("")}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Select
                value={filters.gradingStatus}
                onValueChange={(value: "all" | "graded" | "ungraded") =>
                  handleFilterChange("gradingStatus", value)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="ungraded">Ungraded</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters() && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters (Collapsible) */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="text-sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                {filtersOpen ? "Hide Filters" : "More Filters"}
              </Button>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Show:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(parseInt(value));
                    }}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {filtersOpen && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sort" className="text-sm whitespace-nowrap">
                    Sort by:
                  </Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value: "studentName" | "createdAt" | "marks") =>
                      handleFilterChange("sortBy", value)
                    }
                  >
                    <SelectTrigger className="flex-1 max-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Submission Date</SelectItem>
                      <SelectItem value="studentName">Student Name</SelectItem>
                      <SelectItem value="marks">Marks</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleFilterChange("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="h-9 w-9"
                  >
                    {filters.sortOrder === "asc" ? "A-Z" : "Z-A"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Notice */}
      {!canExport && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> Please select a specific assignment to enable CSV export.
          </p>
        </div>
      )}

      {/* Submissions Table */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  <p className="mt-2 text-muted-foreground">Loading submissions...</p>
                </div>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Student</TableHead>
                  <TableHead className="w-[250px]">Assignment</TableHead>
                  <TableHead className="w-[150px]">Submitted</TableHead>
                  <TableHead className="w-[120px] text-center">Marks</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions
                    .map((submission) => (
                      <TableRow
                        key={submission.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{submission.studentName}</div>
                              {submission.studentEmail && (
                                <div className="text-xs text-muted-foreground">
                                  ({submission.studentEmail})
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="text-sm truncate max-w-[230px]"
                            title={getAssignmentTitle(submission)}
                          >
                            {getAssignmentTitle(submission)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(submission.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium flex justify-center ">
                            {submission.marks !== undefined && submission.marks !== null
                              ? `${submission.marks}`
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                          <Badge variant={getGradeStatus(submission)} >
                            {submission.marks !== undefined && submission.marks !== null
                              ? "Graded"
                              : "Not Graded"
                            }
                      
                          </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewSubmission(submission)}
                              className="h-8 w-8"
                              title="View Submission"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openGradeModal(submission)}
                              className="h-8 w-8"
                              title="Grade Submission"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSubmissionToDelete(submission)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Submission"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
            )}
          </div>

          {/* Compact Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {showingItems}
                {studentSearch ? ` of ${submissions.length}` : ` of ${totalItems}`} submissions
                {hasActiveFilters() && " (filtered)"}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPreviousPage}
                  disabled={!currentPage?.hasPreviousPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadNextPage}
                  disabled={!currentPage?.hasNextPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Submission Modal */}
      <ViewSubmissionModal
        submission={viewingSubmission}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingSubmission(null);
        }}
      />

      {/* Grading Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {selectedSubmission &&
              (selectedSubmission.marks === null || selectedSubmission.marks === undefined)
                ? "Grade Submission"
                : "Re-grade Submission"}
            </DialogTitle>
            <DialogDescription>
              {selectedSubmission?.studentName} - {getAssignmentTitle(selectedSubmission)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="marks" className="text-sm">
                Marks (out of {maximumMarks})
              </Label>
              <Input
                id="marks"
                type="number"
                min="0"
                max={maximumMarks}
                step="0.5"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                placeholder="Enter marks"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="feedback" className="text-sm">
                Feedback
              </Label>
              <div data-color-mode={colorMode} className="border rounded-lg dark:border-gray-700">
                <MDEditor
                  value={feedback}
                  onChange={(value) => setFeedback(value || "")}
                  height={350}
                  preview="edit"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeGradeModal} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSaveGrade} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save Grade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!submissionToDelete}
        onOpenChange={(open) => !open && setSubmissionToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              This will permanently delete the submission from{" "}
              <strong>{submissionToDelete?.studentName}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmissionToDelete(null)} size="sm">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSubmission}
              disabled={deleting === submissionToDelete?.id}
              size="sm"
            >
              {deleting === submissionToDelete?.id ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AllSubmissionsPage;

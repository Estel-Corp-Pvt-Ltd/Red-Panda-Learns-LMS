import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { assignmentService } from "@/services/assignmentService";
import { userService } from "@/services/userService";
import { courseService } from "@/services/courseService";
import { Assignment } from "@/types/assignment";
import { User } from "@/types/user";
import { Course } from "@/types/course";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  Users,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Edit,
  Pause,
  Play,
  BookOpen,
  Bell,
  BellOff,
  Clock,
  AlertTriangle,
  Archive,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { USER_ROLE, NOTIFICATION_STATUS, COLLECTION } from "@/constants";
import { formatDateTime } from "@/utils/date-time";
import EditAssignmentModal from "@/components/admin/EditAssignmentModal";
import { pauseReminderService } from "@/services/pauseReminderService";
import { authService } from "@/services/authService";
import { db } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { NotificationStatus } from "@/types/general";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import CourseSearchSelector from "@/components/admin/CourseSearchSelector";

interface PaginatedAssignments {
  data: Assignment[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

type AuthorFilterType = "all" | "null" | "assigned" | string;
type DeadlineFilterType = "all" | "past" | "upcoming" | "today" | "this-week" | "no-deadline";

interface AssignmentNotificationStatus {
  [assignmentId: string]: NotificationStatus | null;
}

const ManageAssignmentAuthors: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Course state
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Assignments state
  const [assignments, setAssignments] = useState<PaginatedAssignments>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: "next" as "next" | "previous",
    currentPage: 1,
  });

  // Staff users state
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Track changes
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const [savingAssignments, setSavingAssignments] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState<AuthorFilterType>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilterType>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  // Selection state for assignments to pause/unpause reminders
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [isPausingReminders, setIsPausingReminders] = useState(false);
  const [isUnpausingReminders, setIsUnpausingReminders] = useState(false);

  // Notification status state
  const [notificationStatuses, setNotificationStatuses] = useState<AssignmentNotificationStatus>(
    {}
  );
  const [isLoadingNotificationStatuses, setIsLoadingNotificationStatuses] = useState(false);

  // ----------------- Load Notification Statuses -----------------
  const loadNotificationStatuses = async (assignmentIds: string[]) => {
    if (assignmentIds.length === 0) return;

    setIsLoadingNotificationStatuses(true);
    try {
      const statusMap: AssignmentNotificationStatus = {};

      const batchSize = 10;
      for (let i = 0; i < assignmentIds.length; i += batchSize) {
        const batch = assignmentIds.slice(i, i + batchSize);

        const q = query(
          collection(db, COLLECTION.SUBMISSION_NOTIFICATION),
          where("assignmentId", "in", batch),
          where("adminId", "==", user.id)
        );

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const assignmentId = data.assignmentId;
          const status = data.status as NotificationStatus;

          if (
            !statusMap[assignmentId] ||
            status === NOTIFICATION_STATUS.PAUSED ||
            (status === NOTIFICATION_STATUS.REMINDER_SCHEDULED &&
              statusMap[assignmentId] !== NOTIFICATION_STATUS.PAUSED)
          ) {
            statusMap[assignmentId] = status;
          }
        });
      }

      assignmentIds.forEach((id) => {
        if (!(id in statusMap)) {
          statusMap[id] = null;
        }
      });

      setNotificationStatuses((prev) => ({ ...prev, ...statusMap }));
    } catch (error) {
      console.error("Error loading notification statuses:", error);
      toast({
        title: "Warning",
        description: "Failed to load notification statuses",
        variant: "destructive",
      });
    } finally {
      setIsLoadingNotificationStatuses(false);
    }
  };

  // ----------------- Get Notification Status Badge -----------------
  const getNotificationStatusBadge = (assignmentId: string) => {
    const status = notificationStatuses[assignmentId];

    if (status === undefined) {
      return (
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading...
        </Badge>
      );
    }

    if (status === null) {
      return (
        <Badge variant="outline" className="text-xs flex items-center gap-1 text-gray-500">
          <Bell className="h-3 w-3" />
          No Status
        </Badge>
      );
    }

    switch (status) {
      case NOTIFICATION_STATUS.PAUSED:
        return (
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <BellOff className="h-3 w-3" />
            Paused
          </Badge>
        );
      case NOTIFICATION_STATUS.PENDING:
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case NOTIFICATION_STATUS.REMINDER_SCHEDULED:
        return (
          <Badge variant="default" className="text-xs flex items-center gap-1 bg-blue-500">
            <Bell className="h-3 w-3" />
            Scheduled
          </Badge>
        );
      case NOTIFICATION_STATUS.EVALUATED:
        return (
          <Badge
            variant="outline"
            className="text-xs flex items-center gap-1 text-green-600 border-green-600"
          >
            <CheckCircle className="h-3 w-3" />
            Evaluated
          </Badge>
        );
      case NOTIFICATION_STATUS.ARCHIVED:
        return (
          <Badge variant="outline" className="text-xs flex items-center gap-1 text-gray-500">
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        );
      case NOTIFICATION_STATUS.ERROR:
        return (
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
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

  // ----------------- Load Staff Users -----------------
  const loadStaffUsers = async () => {
    setIsLoadingStaff(true);
    try {
      const result = await userService.getNonStudentUsers();

      if (result.success) {
        setStaffUsers(result.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load staff users",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load staff users",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // ----------------- Build Filters -----------------
  const buildFilters = () => {
    const filters: { field: keyof Assignment; op: any; value: any }[] = [];

    if (selectedCourseId) {
      filters.push({ field: "courseId", op: "==", value: selectedCourseId });
    }

    if (authorFilter === "null") {
      filters.push({ field: "authorId", op: "==", value: "" });
    } else if (authorFilter === "assigned") {
      filters.push({ field: "authorId", op: "!=", value: "" });
    } else if (authorFilter !== "all") {
      filters.push({ field: "authorId", op: "==", value: authorFilter });
    }

    return filters;
  };

  // ----------------- Load Assignments for Selected Course -----------------
  const loadAssignments = async (options = {}, useFilters = true) => {
    if (!selectedCourseId) {
      setAssignments({
        data: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
      });
      return;
    }

    setIsLoading(true);
    try {
      const filters = useFilters
        ? buildFilters()
        : [
            {
              field: "courseId" as keyof Assignment,
              op: "==",
              value: selectedCourseId,
            },
          ];

      const result = await assignmentService.getAssignments(filters, {
        limit: 10,
        orderBy: { field: "createdAt", direction: "desc" },
        ...options,
      });

      if (result.success) {
        setAssignments({
          ...result.data,
          totalCount: result.data.totalCount,
        });

        const assignmentIds = result.data.data.map((a: Assignment) => a.id);
        loadNotificationStatuses(assignmentIds);
      } else {
        toast({
          title: "Error",
          description: "Failed to load assignments",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------- Handle Course Selection -----------------
  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
    setPaginationState({
      cursor: null,
      pageDirection: "next",
      currentPage: 1,
    });
    setPendingChanges(new Map());
    setSelectedAssignmentIds([]);
    setSearchQuery("");
    setAuthorFilter("all");
    setDeadlineFilter("all");
    setNotificationStatuses({});
  };

  // ----------------- Handle Clear Course Selection -----------------
  const handleClearCourseSelection = () => {
    setSelectedCourseId("");
    setAssignments({
      data: [],
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: 0,
    });
    setPendingChanges(new Map());
    setSelectedAssignmentIds([]);
    setNotificationStatuses({});
  };

  // ----------------- Client-side Deadline Filter -----------------
  const applyDeadlineFilter = (assignmentsList: Assignment[]): Assignment[] => {
    if (deadlineFilter === "all") return assignmentsList;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
    const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return assignmentsList.filter((assignment) => {
      const deadline = assignment.deadline?.toDate?.() || assignment.deadline;

      if (!deadline) {
        return deadlineFilter === "no-deadline";
      }

      const deadlineDate = new Date(formatDateTime(deadline));

      switch (deadlineFilter) {
        case "past":
          return deadlineDate < now;
        case "upcoming":
          return deadlineDate >= now;
        case "today":
          return deadlineDate >= today && deadlineDate <= endOfToday;
        case "this-week":
          return deadlineDate >= today && deadlineDate <= endOfWeek;
        case "no-deadline":
          return false;
        default:
          return true;
      }
    });
  };

  // ----------------- Client-side Search Filter -----------------
  const applySearchFilter = (assignmentsList: Assignment[]): Assignment[] => {
    if (!searchQuery.trim()) return assignmentsList;

    const query = searchQuery.toLowerCase().trim();

    return assignmentsList.filter((assignment) => {
      const titleMatch = assignment.title?.toLowerCase().includes(query);
      const idMatch = assignment.id?.toLowerCase().includes(query);
      const authorName = getAuthorName(assignment.authorId)?.toLowerCase();
      const authorMatch = authorName?.includes(query);

      return titleMatch || idMatch || authorMatch;
    });
  };

  // ----------------- Get Filtered/Searched Data -----------------
  const getDisplayedAssignments = () => {
    let result = assignments.data;
    result = applyDeadlineFilter(result);
    result = applySearchFilter(result);
    return result;
  };

  // ----------------- Toggle Selection -----------------
  const toggleSelectAssignment = (id: string) => {
    setSelectedAssignmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDisplayed = (displayed: Assignment[]) => {
    const displayedIds = displayed.map((a) => a.id);
    const allSelected = displayedIds.every((id) => selectedAssignmentIds.includes(id));
    if (allSelected) {
      setSelectedAssignmentIds((prev) => prev.filter((id) => !displayedIds.includes(id)));
    } else {
      setSelectedAssignmentIds((prev) => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  // ----------------- Check if selected assignments have paused status -----------------
  const getSelectedPausedCount = () => {
    return selectedAssignmentIds.filter(
      (id) => notificationStatuses[id] === NOTIFICATION_STATUS.PAUSED
    ).length;
  };

  const getSelectedUnpausedCount = () => {
    return selectedAssignmentIds.filter(
      (id) =>
        notificationStatuses[id] &&
        notificationStatuses[id] !== NOTIFICATION_STATUS.PAUSED &&
        notificationStatuses[id] !== NOTIFICATION_STATUS.EVALUATED &&
        notificationStatuses[id] !== NOTIFICATION_STATUS.ARCHIVED
    ).length;
  };

  // ----------------- Pause Reminders Handler -----------------
  const handlePauseReminders = async () => {
    if (selectedAssignmentIds.length === 0) return;

    setIsPausingReminders(true);
    try {
      const idToken = await authService.getToken();
      await pauseReminderService.pauseReminder({ assignmentIds: selectedAssignmentIds }, idToken);

      toast({
        title: "Success",
        description: `Reminders paused for ${selectedAssignmentIds.length} assignment(s)`,
      });

      const updatedStatuses: AssignmentNotificationStatus = {};
      selectedAssignmentIds.forEach((id) => {
        updatedStatuses[id] = NOTIFICATION_STATUS.PAUSED;
      });
      setNotificationStatuses((prev) => ({ ...prev, ...updatedStatuses }));

      setSelectedAssignmentIds([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to pause reminders",
        variant: "destructive",
      });
    } finally {
      setIsPausingReminders(false);
    }
  };

  // ----------------- Unpause Reminders Handler -----------------
  const handleUnpauseReminders = async () => {
    if (selectedAssignmentIds.length === 0) return;

    const pausedAssignmentIds = selectedAssignmentIds.filter(
      (id) => notificationStatuses[id] === NOTIFICATION_STATUS.PAUSED
    );

    if (pausedAssignmentIds.length === 0) {
      toast({
        title: "Info",
        description: "No paused assignments selected to unpause",
      });
      return;
    }

    setIsUnpausingReminders(true);
    try {
      const idToken = await authService.getToken();
      await pauseReminderService.unpauseReminder({ assignmentIds: pausedAssignmentIds }, idToken);

      toast({
        title: "Success",
        description: `Reminders resumed for ${pausedAssignmentIds.length} assignment(s)`,
      });

      const updatedStatuses: AssignmentNotificationStatus = {};
      pausedAssignmentIds.forEach((id) => {
        updatedStatuses[id] = NOTIFICATION_STATUS.REMINDER_SCHEDULED;
      });
      setNotificationStatuses((prev) => ({ ...prev, ...updatedStatuses }));

      setSelectedAssignmentIds([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to unpause reminders",
        variant: "destructive",
      });
    } finally {
      setIsUnpausingReminders(false);
    }
  };

  // ----------------- Edit Assignment Handler -----------------
  const handleEditAssignment = (assignmentId: string) => {
    setEditingAssignmentId(assignmentId);
    setIsEditModalOpen(true);
  };

  const handleAssignmentUpdated = (updatedAssignment: Assignment) => {
    setAssignments((prev) => ({
      ...prev,
      data: prev.data.map((assignment) =>
        assignment.id === updatedAssignment.id
          ? { ...assignment, ...updatedAssignment }
          : assignment
      ),
    }));

    toast({
      title: "Success",
      description: "Assignment updated successfully",
    });
  };

  // ----------------- Apply Filters -----------------
  const applyFilters = async () => {
    setPaginationState({
      cursor: null,
      pageDirection: "next",
      currentPage: 1,
    });

    await loadAssignments();
  };

  // ----------------- Reset All Filters -----------------
  const resetFilters = async () => {
    setSearchQuery("");
    setAuthorFilter("all");
    setDeadlineFilter("all");
    setPaginationState({
      cursor: null,
      pageDirection: "next",
      currentPage: 1,
    });

    if (selectedCourseId) {
      await loadAssignments({}, false);
    }
  };

  // ----------------- Update Active Filters Count -----------------
  useEffect(() => {
    let count = 0;
    if (authorFilter !== "all") count++;
    if (deadlineFilter !== "all") count++;
    if (searchQuery.trim()) count++;
    setActiveFiltersCount(count);
  }, [authorFilter, deadlineFilter, searchQuery]);

  // ----------------- Pagination -----------------
  const handleNextPage = async () => {
    if (!assignments.hasNextPage) return;

    setPaginationState((prev) => ({
      cursor: assignments.nextCursor,
      pageDirection: "next",
      currentPage: prev.currentPage + 1,
    }));

    await loadAssignments({
      cursor: assignments.nextCursor,
      pageDirection: "next",
    });
  };

  const handlePreviousPage = async () => {
    if (!assignments.hasPreviousPage) return;

    setPaginationState((prev) => ({
      cursor: assignments.previousCursor,
      pageDirection: "previous",
      currentPage: prev.currentPage - 1,
    }));

    await loadAssignments({
      cursor: assignments.previousCursor,
      pageDirection: "previous",
    });
  };

  // ----------------- Handle Author Change -----------------
  const handleAuthorChange = (assignmentId: string, authorId: string) => {
    setPendingChanges((prev) => {
      const newChanges = new Map(prev);

      const assignment = assignments.data.find((a) => a.id === assignmentId);

      if (assignment?.authorId === authorId) {
        newChanges.delete(assignmentId);
      } else {
        newChanges.set(assignmentId, authorId);
      }

      return newChanges;
    });
  };

  // ----------------- Save Single Assignment -----------------
  const saveAssignmentAuthor = async (assignmentId: string) => {
    const authorId = pendingChanges.get(assignmentId);
    if (!authorId) return;

    setSavingAssignments((prev) => new Set(prev).add(assignmentId));

    try {
      const result = await assignmentService.updateAssignmentAuthor(assignmentId, authorId);

      if (result.success) {
        setAssignments((prev) => ({
          ...prev,
          data: prev.data.map((a) => (a.id === assignmentId ? { ...a, authorId } : a)),
        }));

        setPendingChanges((prev) => {
          const newChanges = new Map(prev);
          newChanges.delete(assignmentId);
          return newChanges;
        });

        toast({
          title: "Success",
          description: "Author updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update author",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update author",
        variant: "destructive",
      });
    } finally {
      setSavingAssignments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  // ----------------- Save All Pending Changes -----------------
  const saveAllChanges = async () => {
    if (pendingChanges.size === 0) return;

    setIsBulkSaving(true);

    try {
      const assignmentIds = Array.from(pendingChanges.keys());
      let successCount = 0;
      let failedCount = 0;

      for (const assignmentId of assignmentIds) {
        const authorId = pendingChanges.get(assignmentId);
        if (!authorId) continue;

        const result = await assignmentService.updateAssignmentAuthor(assignmentId, authorId);

        if (result.success) {
          successCount++;
          setAssignments((prev) => ({
            ...prev,
            data: prev.data.map((a) => (a.id === assignmentId ? { ...a, authorId } : a)),
          }));
        } else {
          failedCount++;
        }
      }

      setPendingChanges(new Map());

      toast({
        title: "Bulk Update Complete",
        description: `${successCount} updated, ${failedCount} failed`,
        variant: failedCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Bulk update failed",
        variant: "destructive",
      });
    } finally {
      setIsBulkSaving(false);
    }
  };

  // ----------------- Helper Functions -----------------
  const getAuthorName = (authorId: string | null | undefined) => {
    if (!authorId) return null;
    const user = staffUsers.find((u) => u.id === authorId);
    return user ? `${user.firstName} ${user.lastName}` : null;
  };

  const getCurrentAuthorId = (assignment: Assignment) => {
    return pendingChanges.get(assignment.id) || assignment.authorId || "";
  };

  const hasChanges = (assignmentId: string) => {
    return pendingChanges.has(assignmentId);
  };

  const getDeadlineStatus = (deadline: any) => {
    if (!deadline) return { label: "No deadline", variant: "outline" as const };

    const deadlineDate = deadline?.toDate?.() || new Date(deadline);
    const now = new Date();

    if (deadlineDate < now) {
      return { label: "Past", variant: "destructive" as const };
    }

    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours <= 24) {
      return { label: "Due soon", variant: "default" as const };
    }

    return { label: "Upcoming", variant: "secondary" as const };
  };

  const getStatusColor = (variant: string) => {
    switch (variant) {
      case "success":
        return "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "warning":
        return "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "destructive":
        return "text-destructive bg-destructive/10 border-destructive/20";
      case "neutral":
        return "text-muted-foreground bg-muted border-border";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  // ----------------- Initial Load -----------------
  useEffect(() => {
    loadCourses();
    loadStaffUsers();
  }, []);

  // ----------------- Load Assignments when Course Changes -----------------
  useEffect(() => {
    if (selectedCourseId) {
      loadAssignments();
    }
  }, [selectedCourseId]);

  // ----------------- Loading State -----------------
  if (isLoadingCourses || isLoadingStaff) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading courses and staff...</p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const displayedAssignments = getDisplayedAssignments();
  const selectedPausedCount = getSelectedPausedCount();
  const selectedUnpausedCount = getSelectedUnpausedCount();

  return (
    <AdminLayout>
      <div className="space-y-6 p-1">
        {/* --- Header & Course Context Section --- */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Assignment Manager
            </h1>
            <p className="text-muted-foreground">
              Manage assignment ownership and notification settings.
            </p>
          </div>

          {/* Course Selector - Using Reusable Component */}
          <CourseSearchSelector
            courses={courses}
            selectedCourseId={selectedCourseId}
            onCourseSelect={handleCourseSelect}
            onClearSelection={handleClearCourseSelection}
            isLoading={isLoadingCourses}
            className="w-full md:w-[350px]"
          />
        </div>

        <Separator />

        {/* --- Main Content Area --- */}
        {!selectedCourseId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/30 rounded-lg border border-dashed border-muted-foreground/25">
            <div className="bg-background p-4 rounded-full shadow-sm mb-4">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium">No Course Selected</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              Please select a course from the dropdown above to view assignments.
            </p>
          </div>
        ) : (
          <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-medium">
                    Assignments
                    <Badge variant="secondary" className="ml-3 rounded-sm font-normal">
                      {assignments.totalCount} Total
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    {staffUsers.length} staff members available for assignment
                  </CardDescription>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 md:w-64 md:flex-none">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assignments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-background"
                    />
                  </div>

                  {/* Filter Toggle */}
                  <Button
                    variant={showFilters ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-9 gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="default" className="h-5 px-1.5 min-w-[1.25rem]">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>

                  {/* Reset Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetFilters();
                      setPendingChanges(new Map());
                      setSelectedAssignmentIds([]);
                    }}
                    disabled={isLoading}
                    className="h-9 w-9 p-0"
                    title="Refresh & Reset"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Expandable Filter Panel */}
              {showFilters && (
                <div className="mt-4 p-4 rounded-md border bg-muted/40 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Author Status
                    </label>
                    <Select value={authorFilter} onValueChange={setAuthorFilter}>
                      <SelectTrigger className="bg-background h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignments</SelectItem>
                        <SelectItem value="null">Unassigned</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <DropdownMenuSeparator />
                        {staffUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Deadline</label>
                    <Select
                      value={deadlineFilter}
                      onValueChange={(value: DeadlineFilterType) => setDeadlineFilter(value)}
                    >
                      <SelectTrigger className="bg-background h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Anytime</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="this-week">This Week</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="past">Past Due</SelectItem>
                        <SelectItem value="no-deadline">No Deadline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      onClick={applyFilters}
                      disabled={isLoading}
                      className="w-full h-9"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {/* --- Data Table --- */}
              <div className="border-t">
                {displayedAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="p-3 bg-muted rounded-full mb-3">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p>No assignments found matching your criteria.</p>
                    {activeFiltersCount > 0 && (
                      <Button variant="link" onClick={resetFilters} className="mt-2">
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <input
                            type="checkbox"
                            className="translate-y-0.5 rounded border-primary text-primary focus:ring-primary h-4 w-4"
                            onChange={() => toggleSelectAllDisplayed(displayedAssignments)}
                            checked={
                              displayedAssignments.length > 0 &&
                              displayedAssignments.every((a) =>
                                selectedAssignmentIds.includes(a.id)
                              )
                            }
                          />
                        </TableHead>
                        <TableHead>Assignment Details</TableHead>
                        <TableHead>Timeline</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[250px]">Author</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedAssignments.map((assignment) => {
                        const deadlineStatus = getDeadlineStatus(assignment.deadline);
                        const isChanged = hasChanges(assignment.id);
                        const isSaving = savingAssignments.has(assignment.id);

                        return (
                          <TableRow
                            key={assignment.id}
                            className={`
                              group transition-colors
                              ${isChanged ? "bg-accent/30 hover:bg-accent/40" : "hover:bg-muted/50"}
                            `}
                          >
                            <TableCell className="text-center align-top pt-4">
                              <input
                                type="checkbox"
                                className="rounded border-muted-foreground/30 text-primary focus:ring-primary h-4 w-4"
                                checked={selectedAssignmentIds.includes(assignment.id)}
                                onChange={() => toggleSelectAssignment(assignment.id)}
                              />
                            </TableCell>

                            <TableCell className="align-top py-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                  {assignment.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ID: {assignment.id}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="align-top py-3">
                              <div className="flex flex-col gap-1.5">
                                {assignment.deadline ? (
                                  <div
                                    className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full w-fit border ${getStatusColor(
                                      deadlineStatus.variant
                                    )}`}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    <span>{deadlineStatus.label}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground pl-1">
                                    No Deadline
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground pl-1">
                                  Created {formatDateTime(assignment.createdAt)}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="align-top py-3 text-center ">
                              <div className="scale-90 origin-center">
                                <span className="text-center inline-block">
                                  {getNotificationStatusBadge(assignment.id)}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="align-top py-3">
                              <div className="space-y-2">
                                <Select
                                  value={getCurrentAuthorId(assignment)}
                                  onValueChange={(value) =>
                                    handleAuthorChange(assignment.id, value)
                                  }
                                  disabled={isSaving}
                                >
                                  <SelectTrigger
                                    className={`
                                    h-9 w-full bg-background/50 border-input
                                    ${
                                      isChanged
                                        ? "border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/20"
                                        : ""
                                    }
                                  `}
                                  >
                                    <SelectValue placeholder="Unassigned" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {staffUsers.map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        <div className="flex items-center gap-2">
                                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                            {user.firstName[0]}
                                            {user.lastName[0]}
                                          </div>
                                          <span>
                                            {user.firstName} {user.lastName}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {isChanged && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-500 font-medium animate-pulse">
                                    <AlertCircle className="h-3 w-3" />
                                    Pending Change
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="align-top py-3 text-right">
                              <div className="flex justify-end items-center gap-1">
                                {isChanged && (
                                  <Button
                                    size="icon"
                                    variant="default"
                                    className="h-8 w-8 bg-amber-600 hover:bg-amber-700 text-white"
                                    onClick={() => saveAssignmentAuthor(assignment.id)}
                                    disabled={isSaving}
                                    title="Save Change"
                                  >
                                    {isSaving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleEditAssignment(assignment.id)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        window.open(
                                          `/courses/${selectedCourseId}/lesson/${assignment.id}`,
                                          "_blank"
                                        );
                                      }}
                                    >
                                      <ArrowUpRight className="h-4 w-4 mr-2" />
                                      View on Site
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/20">
                <div className="text-sm text-muted-foreground">
                  Page {paginationState.currentPage}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!assignments.hasPreviousPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!assignments.hasNextPage || isLoading}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* --- Floating Sticky Action Bar --- */}
      {(selectedAssignmentIds.length > 0 || pendingChanges.size > 0) && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-10 fade-in">
          <div className="bg-popover text-popover-foreground shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 border border-border max-w-3xl w-full justify-between sm:w-auto">
            {/* Left: Status Counts */}
            <div className="flex items-center gap-4 text-sm font-medium">
              {selectedAssignmentIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[1.25rem] flex items-center justify-center px-1">
                    {selectedAssignmentIds.length}
                  </span>
                  <span className="hidden sm:inline">Selected</span>
                </div>
              )}

              {pendingChanges.size > 0 && (
                <div className="flex items-center gap-2 text-amber-500 dark:text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>{pendingChanges.size} Unsaved</span>
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="h-6 bg-border" />

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {selectedAssignmentIds.length > 0 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="h-8 border bg-secondary/50">
                        Notification Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                      <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={handlePauseReminders}
                        disabled={isPausingReminders || selectedUnpausedCount === 0}
                      >
                        {isPausingReminders ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Pause className="h-4 w-4 mr-2" />
                        )}
                        Pause Reminders
                        {selectedUnpausedCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {selectedUnpausedCount}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleUnpauseReminders}
                        disabled={isUnpausingReminders || selectedPausedCount === 0}
                        className="text-emerald-600 focus:text-emerald-700"
                      >
                        {isUnpausingReminders ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Resume Reminders
                        {selectedPausedCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {selectedPausedCount}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAssignmentIds([])}
                    className="h-8"
                  >
                    Clear
                  </Button>
                </>
              )}

              {pendingChanges.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingChanges(new Map())}
                    className="h-8"
                  >
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveAllChanges}
                    disabled={isBulkSaving}
                    className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                  >
                    {isBulkSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save All
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <EditAssignmentModal
        courseId={selectedCourseId}
        assignmentId={editingAssignmentId}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAssignmentId(null);
        }}
        onUpdated={handleAssignmentUpdated}
      />
    </AdminLayout>
  );
};

export default ManageAssignmentAuthors;
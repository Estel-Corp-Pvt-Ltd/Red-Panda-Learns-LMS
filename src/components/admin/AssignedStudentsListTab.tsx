// src/components/admin/ViewAssignedStudentsTab.tsx
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Mail,
  ChevronLeft,
  ChevronRight,
  Users,
  UserMinus,
  RefreshCw,
  Copy,
  BellOff,
  CheckCircle,
  Phone,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import React, { useState, useEffect, useMemo } from "react";
import { ENVIRONMENT, USER_STATUS } from "@/constants";
import { authService } from "@/services/authService";
import { User } from "@/types/user";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userService } from "@/services/userService";
import { BACKEND_URL } from "@/config";


interface ViewAssignedStudentsTabProps {
  assignedStudentIds: Set<string>;
  onStudentsUnassigned: (studentIds: string[]) => void;
}

const PAGE_SIZE = 10;

type DialogType = "unassign-bulk" | "pause-notifications" | null;

const ViewAssignedStudentsTab: React.FC<ViewAssignedStudentsTabProps> = ({
  assignedStudentIds,
  onStudentsUnassigned,
}) => {
  const { user: adminUser } = useAuth();
  const adminId = adminUser?.id;

  const [allAssignedStudents, setAllAssignedStudents] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);

  // Convert Set to Array for easier manipulation
  const assignedIdsArray = useMemo(
    () => Array.from(assignedStudentIds),
    [assignedStudentIds]
  );

  // ----------------- Fetch Students by IDs directly -----------------
  const fetchAssignedStudents = async () => {
    if (assignedIdsArray.length === 0) {
      setAllAssignedStudents([]);
      return;
    }

    setIsLoading(true);
    try {
      const students = await userService.getStudentsByIds(assignedIdsArray, 10);
      setAllAssignedStudents(students);
      setCurrentPage(1);
      setSelectedIds([]);
    } catch (error) {
      console.error("Error fetching assigned students:", error);
      toast({
        title: "Error",
        description: "Failed to load assigned students",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------- Filtered Students (for search) -----------------
  const filteredStudents = useMemo(() => {
    if (!isSearchMode || !searchQuery.trim()) {
      return allAssignedStudents;
    }

    const query = searchQuery.toLowerCase();
    return allAssignedStudents.filter(
      (s) =>
        s.email?.toLowerCase().includes(query) ||
        `${s.firstName || ""} ${s.lastName || ""}`
          .toLowerCase()
          .includes(query) ||
        s.username?.toLowerCase().includes(query)
    );
  }, [allAssignedStudents, isSearchMode, searchQuery]);

  // ----------------- Pagination -----------------
  const totalPages = useMemo(() => {
    return Math.ceil(filteredStudents.length / PAGE_SIZE);
  }, [filteredStudents.length]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // ----------------- Selection Logic -----------------
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedStudents.map((s) => s.id);
    const allSelected = currentPageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const selectAllStudents = () => {
    setSelectedIds(filteredStudents.map((s) => s.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // ----------------- Search -----------------
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Enter a name or email to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearchMode(true);
    setCurrentPage(1);
    setSelectedIds([]);

    const query = searchQuery.toLowerCase();
    const filtered = allAssignedStudents.filter(
      (s) =>
        s.email?.toLowerCase().includes(query) ||
        `${s.firstName || ""} ${s.lastName || ""}`
          .toLowerCase()
          .includes(query) ||
        s.username?.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      toast({
        title: "Not Found",
        description: "No assigned student found matching your search",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Found ${filtered.length} student(s)`,
      });
    }
  };

  // ----------------- Reset Search -----------------
  const resetSearch = () => {
    setSearchQuery("");
    setIsSearchMode(false);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // ----------------- Bulk Unassign Students -----------------
  const bulkUnassignStudents = async () => {
    if (!adminId || selectedIds.length === 0) return;

    setBulkActionLoading(true);
    try {
      // const idToken = await authService.getToken();
      // const res = await fetch(`${BACKEND_URL}/bulkUnassignStudentsFromAdmin`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${idToken}`,
      //   },
      //   body: JSON.stringify({
      //     adminId,
      //     studentIds: selectedIds,
      //   }),
      // }).then((r) => r.json());
      //
      // if (res.success) {
      //   toast({
      //     title: "Success",
      //     description: `${selectedIds.length} student(s) unassigned successfully`,
      //   });
      //
      //   onStudentsUnassigned(selectedIds);
      //
      //   setAllAssignedStudents((prev) =>
      //     prev.filter((s) => !selectedIds.includes(s.id))
      //   );
      //   setSelectedIds([]);
      // } else {
      //   toast({
      //     title: "Error",
      //     description: res.message || "Failed to unassign students",
      //     variant: "destructive",
      //   });
      // }
      console.warn("bulkUnassignStudentsFromAdmin fetch call is disabled");
      toast({
        title: "Temporarily Disabled",
        description: "Bulk unassign students is temporarily disabled.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unassign students",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
      setActiveDialog(null);
    }
  };

  // ----------------- Pause Notifications -----------------
  const pauseNotifications = async () => {
    if (!adminId || selectedIds.length === 0) return;

    setBulkActionLoading(true);
    try {
      // const idToken = await authService.getToken();
      // const res = await fetch(`${BACKEND_URL}/pauseStudentNotifications`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${idToken}`,
      //   },
      //   body: JSON.stringify({
      //     adminId,
      //     studentIds: selectedIds,
      //   }),
      // }).then((r) => r.json());
      //
      // if (res.success) {
      //   toast({
      //     title: "Success",
      //     description: `Notifications paused for ${selectedIds.length} student(s)`,
      //   });
      //   setSelectedIds([]);
      // } else {
      //   toast({
      //     title: "Error",
      //     description: res.message || "Failed to pause notifications",
      //     variant: "destructive",
      //   });
      // }
      console.warn("pauseStudentNotifications fetch call is disabled");
      toast({
        title: "Temporarily Disabled",
        description: "Pausing student notifications is temporarily disabled.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause notifications",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
      setActiveDialog(null);
    }
  };

  // ----------------- Helper Functions -----------------
  const getFullName = (user: User) => {
    const names = [user.firstName];
    if (user.middleName) names.push(user.middleName);
    if (user.lastName) names.push(user.lastName);
    return names.filter(Boolean).join(" ") || "Unknown";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case USER_STATUS.ACTIVE:
        return "default";
      case USER_STATUS.INACTIVE:
        return "secondary";
      case USER_STATUS.SUSPENDED:
        return "destructive";
      default:
        return "outline";
    }
  };

  const getInitials = (user: User) => {
    if (!user) return "?";

    const { firstName, lastName, email } = user;

    const parts: string[] = [];
    if (firstName?.trim()) parts.push(firstName.trim()[0].toUpperCase());
    if (lastName?.trim()) parts.push(lastName.trim()[0].toUpperCase());

    if (parts.length > 0) return parts.join("");

    return email?.trim()?.charAt(0)?.toUpperCase() || "?";
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Email address copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try manually.",
        variant: "destructive",
      });
    }
  };

  const getSelectedStudentNames = () => {
    const names = allAssignedStudents
      .filter((s) => selectedIds.includes(s.id))
      .map((s) => getFullName(s));

    if (names.length <= 3) {
      return names.join(", ");
    }
    return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Fetch students when assigned IDs change
  useEffect(() => {
    if (assignedIdsArray.length > 0) {
      fetchAssignedStudents();
    } else {
      setAllAssignedStudents([]);
    }
  }, [assignedIdsArray]);

  // ----------------- Loading State -----------------
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-2">Loading assigned students...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Assigned Students</CardTitle>
                <CardDescription>
                  View and manage students assigned to your account.
                  {allAssignedStudents.length > 0 &&
                    ` • ${allAssignedStudents.length} total`}
                  {selectedIds.length > 0 &&
                    ` • ${selectedIds.length} selected`}
                  {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                </CardDescription>
              </div>

              {/* Search Controls */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="flex w-full sm:w-72 items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search by name or email..."
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
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
            </div>

            {/* Selection Info Bar */}
            {selectedIds.length > 0 && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {selectedIds.length} student(s) selected
                    </span>
                    {selectedIds.length < filteredStudents.length && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={selectAllStudents}
                        className="text-primary p-0 h-auto"
                      >
                        Select all {filteredStudents.length}
                      </Button>
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearSelection}
                      className="text-muted-foreground p-0 h-auto"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="overflow-x-auto">
            {paginatedStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">
                  {isSearchMode
                    ? "No students match your search"
                    : "No assigned students"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  {isSearchMode
                    ? "Try a different search term or clear the search to see all students."
                    : 'Go to "Assign Students" tab to add students to your account.'}
                </p>
                {isSearchMode && (
                  <Button
                    variant="outline"
                    onClick={resetSearch}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={
                              paginatedStudents.length > 0 &&
                              paginatedStudents.every((s) =>
                                selectedIds.includes(s.id)
                              )
                            }
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStudents.map((student) => (
                        <TableRow
                          key={student.id}
                          className={`cursor-pointer transition-colors ${
                            selectedIds.includes(student.id)
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/50"
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
                                  className="h-10 w-10 rounded-full object-cover ring-2 ring-background"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm uppercase text-white bg-gradient-to-br from-green-500 to-emerald-600 ring-2 ring-background">
                                  {getInitials(student)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {getFullName(student)}
                                </div>
                                {student.username && (
                                  <div className="text-sm text-muted-foreground truncate">
                                    @{student.username}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate max-w-[150px]">
                                  {student.email}
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() =>
                                        handleCopyToClipboard(student.email)
                                      }
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy email</TooltipContent>
                                </Tooltip>
                              </div>
                             
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(student.status)}
                            >
                              {student.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(student.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {selectedIds.includes(student.id) && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between space-x-0 sm:space-x-2 space-y-2 sm:space-y-0 py-4 border-t mt-4">
                    <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
                      Showing {paginatedStudents.length} of{" "}
                      {filteredStudents.length} students
                      {` • Page ${currentPage} of ${totalPages}`}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Bulk Actions Bar */}
                {paginatedStudents.length > 0 && (
                  <div
                    className={`border-t pt-4 mt-4 transition-all ${
                      selectedIds.length > 0
                        ? "bg-muted/30 -mx-6 px-6 pb-4 rounded-b-lg"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {selectedIds.length === 0 ? (
                          <span>Select students to perform bulk actions</span>
                        ) : (
                          <span className="font-medium text-foreground">
                            {selectedIds.length} student(s) ready for action
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={() => setActiveDialog("pause-notifications")}
                          disabled={
                            bulkActionLoading || selectedIds.length === 0
                          }
                          className="w-full sm:w-auto"
                        >
                          <BellOff className="h-4 w-4 mr-2" />
                          Pause Notifications
                          {selectedIds.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {selectedIds.length}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setActiveDialog("unassign-bulk")}
                          disabled={
                            bulkActionLoading || selectedIds.length === 0
                          }
                          className="w-full sm:w-auto"
                        >
                          {bulkActionLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Unassign Students
                              {selectedIds.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 bg-red-100 text-red-700"
                                >
                                  {selectedIds.length}
                                </Badge>
                              )}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Bulk Unassign Confirmation Dialog */}
        <AlertDialog
          open={activeDialog === "unassign-bulk"}
          onOpenChange={() => setActiveDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-red-600" />
                Unassign {selectedIds.length === 1 ? "Student" : "Students"}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Are you sure you want to unassign{" "}
                    <span className="font-semibold">
                      {selectedIds.length} student(s)
                    </span>
                    ?
                  </p>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p className="font-medium mb-1">
                      Students to be unassigned:
                    </p>
                    <p className="text-muted-foreground">
                      {getSelectedStudentNames()}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This action can be undone by reassigning the students later.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkActionLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={bulkUnassignStudents}
                className="bg-red-600 hover:bg-red-700"
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Unassigning...
                  </>
                ) : (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Unassign {selectedIds.length}{" "}
                    {selectedIds.length === 1 ? "Student" : "Students"}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Pause Notifications Confirmation Dialog */}
        <AlertDialog
          open={activeDialog === "pause-notifications"}
          onOpenChange={() => setActiveDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <BellOff className="h-5 w-5 text-amber-600" />
                Pause Notifications
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Are you sure you want to pause notifications for{" "}
                    <span className="font-semibold">
                      {selectedIds.length} student(s)
                    </span>
                    ?
                  </p>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p className="font-medium mb-1">Affected students:</p>
                    <p className="text-muted-foreground">
                      {getSelectedStudentNames()}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    These students will stop receiving notifications until you
                    resume them.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkActionLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={pauseNotifications}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Pausing...
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Pause Notifications
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </TooltipProvider>
  );
};

export default ViewAssignedStudentsTab;
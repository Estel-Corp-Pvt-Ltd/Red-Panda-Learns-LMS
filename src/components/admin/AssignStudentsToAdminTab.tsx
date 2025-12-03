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
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import React, { useState, useEffect, useCallback } from "react";
import { USER_ROLE, USER_STATUS } from "@/constants";
import { authService } from "@/services/authService";
import { User } from "@/types/user";
import { BACKEND_URL } from "@/config";

interface PaginatedUsers {
  data: User[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
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

  const [users, setUsers] = useState<PaginatedUsers>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: "next" as "next" | "previous",
    currentPage: 1,
  });

  // ----------------- Load Student Users (excluding already assigned) -----------------
  const loadUsers = useCallback(
    async (options = {}) => {
      setIsLoading(true);
      try {
        const result = await userService.getUsers(
          [{ field: "role", op: "==", value: USER_ROLE.STUDENT }],
          {
            limit: 15, // Fetch extra to account for filtering
            orderBy: { field: "createdAt", direction: "desc" },
            ...options,
          }
        );

        if (result.success) {
          // Filter out already assigned students
          const filteredData = result.data.data.filter(
            (user: User) => !assignedStudentIds.has(user.id)
          );

          setUsers({
            ...result.data,
            data: filteredData,
            totalCount: filteredData.length,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to load students",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load students",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [assignedStudentIds]
  );

  // ----------------- Pagination -----------------
  const handleNextPage = async () => {
    if (!users.hasNextPage) return;

    setPaginationState((prev) => ({
      cursor: users.nextCursor,
      pageDirection: "next",
      currentPage: prev.currentPage + 1,
    }));

    await loadUsers({
      cursor: users.nextCursor,
      pageDirection: "next",
    });
  };

  const handlePreviousPage = async () => {
    if (!users.hasPreviousPage) return;

    setPaginationState((prev) => ({
      cursor: users.previousCursor,
      pageDirection: "previous",
      currentPage: prev.currentPage - 1,
    }));

    await loadUsers({
      cursor: users.previousCursor,
      pageDirection: "previous",
    });
  };

  // ----------------- Search User by Email -----------------
  const findUser = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Enter a user email to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const result = await userService.getUserByEmail(searchQuery.trim());
      if (result.success && result.data) {
        if (result.data.role !== USER_ROLE.STUDENT) {
          toast({
            title: "Error",
            description: "User found but is not a student",
            variant: "destructive",
          });
          return;
        }

        // Check if already assigned
        if (assignedStudentIds.has(result.data.id)) {
          toast({
            title: "Already Assigned",
            description: "This student is already assigned to you",
            variant: "destructive",
          });
          return;
        }

        setUsers({
          data: [result.data],
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 1,
        });
        setPaginationState({
          cursor: null,
          pageDirection: "next",
          currentPage: 1,
        });
        toast({
          title: "Success",
          description: `Found ${result.data.firstName || "student"}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Student not found",
          variant: "destructive",
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
    setPaginationState({
      cursor: null,
      pageDirection: "next",
      currentPage: 1,
    });
    loadUsers();
  };

  // ----------------- Select Toggle -----------------
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ----------------- Select All on Current Page -----------------
  const toggleSelectAll = () => {
    const currentPageIds = users.data.map((u) => u.id);
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
        }),
      }).then((r) => r.json());

      if (res.success) {
        toast({
          title: "Success",
          description: `${selectedIds.length} student(s) assigned successfully`,
        });

        // Notify parent to update shared state
        onStudentsAssigned(selectedIds);

        // Remove assigned students from the current list
        setUsers((prev) => ({
          ...prev,
          data: prev.data.filter((user) => !selectedIds.includes(user.id)),
          totalCount: prev.totalCount - selectedIds.length,
        }));

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
        return "outline";
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

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ----------------- Loading State -----------------
  if (isLoading && users.data.length === 0) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-2">Loading students...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Assign Students</CardTitle>
            <CardDescription>
              Select students to assign to your admin account.
              {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
              {users.totalCount > 0 && ` • Page ${paginationState.currentPage}`}
              {assignedStudentIds.size > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  • {assignedStudentIds.size} already assigned
                </span>
              )}
            </CardDescription>
          </div>

          {/* Search Controls */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {users.data.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">
              No unassigned students found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {assignedStudentIds.size > 0
                ? "All available students have been assigned. Try searching for a specific student."
                : "Try adjusting your search or check back later."}
            </p>
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
                          users.data.length > 0 &&
                          users.data.every((u) => selectedIds.includes(u.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Selected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data.map((user) => (
                    <TableRow
                      key={user.id}
                      className={`cursor-pointer transition ${
                        selectedIds.includes(user.id) ? "bg-primary/5" : ""
                      }`}
                      onClick={() => toggleSelect(user.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={getFullName(user)}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs uppercase text-white bg-gradient-to-br from-blue-500 to-indigo-500">
                              {getInitials(user)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">
                              {getFullName(user)}
                            </div>
                            {user.username && (
                              <div className="text-sm text-muted-foreground">
                                @{user.username}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {selectedIds.includes(user.id) && (
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
                Showing {users.data.length} unassigned students
                {users.totalCount > users.data.length &&
                  ` (page ${paginationState.currentPage})`}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!users.hasPreviousPage || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!users.hasNextPage || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Assign Button */}
        {users.data.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {selectedIds.length} student(s) selected
              </div>
              <Button
                onClick={assignStudents}
                disabled={loadingAssign || selectedIds.length === 0}
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
                    {selectedIds.length > 0
                      ? `(${selectedIds.length})`
                      : ""}{" "}
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

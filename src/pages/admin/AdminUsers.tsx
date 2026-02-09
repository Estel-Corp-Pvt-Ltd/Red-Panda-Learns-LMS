import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { userService } from "@/services/userService";
import { useDebounce } from "@/hooks/useDebounce";
import { User } from "@/types/user";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  PlusCircle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Search,
  X,
  Filter,
} from "lucide-react";
import { USER_ROLE, USER_STATUS } from "@/constants";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginatedUsers {
  data: User[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
}

type USER_ROLE = (typeof USER_ROLE)[keyof typeof USER_ROLE];
type USER_STATUS = (typeof USER_STATUS)[keyof typeof USER_STATUS];

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<PaginatedUsers>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 500);
  const [roleFilter, setRoleFilter] = useState<USER_ROLE | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<USER_STATUS | "ALL">("ALL");
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Track previous filter values to detect filter changes vs page changes
  const [prevFilters, setPrevFilters] = useState({
    searchQuery,
    roleFilter,
    statusFilter,
    itemsPerPage,
  });

  useEffect(() => {
    const filtersChanged =
      prevFilters.searchQuery !== searchQuery ||
      prevFilters.roleFilter !== roleFilter ||
      prevFilters.statusFilter !== statusFilter ||
      prevFilters.itemsPerPage !== itemsPerPage;

    if (filtersChanged) {
      setPrevFilters({ searchQuery, roleFilter, statusFilter, itemsPerPage });
      if (currentPage !== 1) {
        setCurrentPage(1);
        return; // performSearch will be called when currentPage updates
      }
    }

    performSearch();
  }, [searchQuery, roleFilter, statusFilter, currentPage, itemsPerPage]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const filters: string[] = [];
      if (roleFilter !== "ALL") {
        filters.push(`role = "${roleFilter}"`);
      }
      if (statusFilter !== "ALL") {
        filters.push(`status = "${statusFilter}"`);
      }

      const offset = (currentPage - 1) * itemsPerPage;
      const result = await userService.searchUsers(searchQuery, {
        limit: itemsPerPage,
        offset,
        filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      });

      if (result.success && result.data) {
        setUsers({
          data: result.data.data,
          hasNextPage: result.data.hasNextPage,
          hasPreviousPage: result.data.hasPreviousPage,
          totalCount: result.data.totalCount,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to search users",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "An error occurred while searching users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
  };

  const handleNextPage = () => {
    if (!users.hasNextPage || isLoading) return;
    setCurrentPage((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    if (!users.hasPreviousPage || isLoading) return;
    setCurrentPage((prev) => prev - 1);
  };

  const clearSearch = () => {
    setSearchInput("");
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setItemsPerPage(10);
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    try {
      const result = await userService.deleteUser(selectedUser.id);
      if (!result.success) {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      await performSearch();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the user",
        variant: "destructive",
      });
    } finally {
      setConfirmOpen(false);
      setSelectedUser(null);
    }
  };

  const getFullName = (user: User) => {
    const names = [user.firstName];
    if (user.middleName) names.push(user.middleName);
    names.push(user.lastName);
    return names.join(" ");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case USER_ROLE.ADMIN:
        return "destructive";
      case USER_ROLE.INSTRUCTOR:
      case USER_ROLE.TEACHER:
        return "secondary";
      case USER_ROLE.STUDENT:
        return "default";
      default:
        return "outline";
    }
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

  // Determine if we're in filtered state
  const isFiltered =
    searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL";

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage platform users, roles, and statuses.
                {users.totalCount > 0 && ` (Page ${currentPage})`}
              </CardDescription>
            </div>
            <Button
              variant="pill"
              size="sm"
              onClick={() => navigate("/admin/create-user")}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add User
            </Button>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(e.target.value as USER_ROLE | "ALL")
                  }
                  className="border border-input rounded-md px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground"
                >
                  <option value="ALL">All Roles</option>
                  <option value={USER_ROLE.STUDENT}>Student</option>
                  <option value={USER_ROLE.TEACHER}>Teacher</option>
                  <option value={USER_ROLE.INSTRUCTOR}>Instructor</option>
                  <option value={USER_ROLE.ADMIN}>Admin</option>
                  <option value={USER_ROLE.ACCOUNTANT}>Accountant</option>
                </select>
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as USER_STATUS | "ALL")
                }
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value={USER_STATUS.ACTIVE}>Active</SelectItem>
                  <SelectItem value={USER_STATUS.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={USER_STATUS.SUSPENDED}>Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-2">Loading users...</p>
              </div>
            </div>
          ) : users.data.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                {isFiltered ? "No users found" : "No users"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isFiltered
                  ? "Try adjusting your search or filters."
                  : "Get started by adding a new user."}
              </p>
              {isFiltered && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              )}
              {!isFiltered && (
                <div className="mt-6">
                  <Button
                    onClick={() => navigate("/admin/create-user")}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add User
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Items Per Page Selector and Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="text-sm text-muted-foreground">
                  Showing {users.data.length} of {users.totalCount} total users
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Show:
                  </span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    per page
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrollments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.data.map((user) => (
                      <TableRow key={user.id}>
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
                          <Badge variant={getRoleBadgeVariant(user?.role)}>
                            {user?.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            N/A
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/admin/edit-user/${user.id}`)
                              }
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setConfirmOpen(true);
                              }}
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  Page {currentPage} of{" "}
                  {Math.ceil(users.totalCount / itemsPerPage)}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={
                      !users.hasPreviousPage ||
                      currentPage === 1 ||
                      isLoading
                    }
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
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={deleteUser}
        title="Delete User"
        body={`Are you sure you want to delete "${selectedUser ? getFullName(selectedUser) : ""}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </AdminLayout>
  );
};

export default AdminUsers;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import { userService } from '@/services/userService';
import { User } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  PlusCircle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  User as UserIcon,
  Search
} from 'lucide-react';
import { USER_ROLE, USER_STATUS } from '@/constants';
import ConfirmDialog from '@/components/ConfirmDialog';

interface PaginatedUsers {
  data: User[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<PaginatedUsers>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);


  const loadUsers = async (options = {}) => {
    setIsLoading(true);
    try {
      const result = await userService.getUsers([], {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setUsers(prev => ({
          ...result.data,
          totalCount: result.data.data.length
        }));
      } else {
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!users.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: users.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadUsers({
      cursor: users.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!users.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: users.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadUsers({
      cursor: users.previousCursor,
      pageDirection: 'previous'
    });
  };


  const findUser = async () => {
  if (!searchQuery.trim()) {
    toast({
      title: 'Error',
      description: 'Enter a user email to search',
      variant: 'destructive',
    });
    return;
  }

  setIsSearching(true);
  try {
    const result = await userService.getUserByEmail(searchQuery.trim());
    if (result.success && result.data) {
      // show the found user only
      setUsers({
        data: [result.data],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 1,
      });
      toast({
        title: 'Success',
        description: `Found ${result.data.firstName || 'user'}`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'User not found',
        variant: 'destructive',
      });
    }
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Search failed. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setIsSearching(false);
  }
};



  const deleteUser = async () => {
    if (!selectedUser) return;
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
    await loadUsers();
  }

  const getFullName = (user: User) => {
    const names = [user.firstName];
    if (user.middleName) names.push(user.middleName);
    names.push(user.lastName);
    return names.join(' ');
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

  // fallback: first character of email
  return email?.trim()?.charAt(0)?.toUpperCase() || "?";
};

  const getEnrollmentsCount = (user: User) => {
    return user.enrollments?.length || 0;
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (isLoading && users.data.length === 0) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading users...</p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage platform users, roles, and statuses.
                {users.totalCount > 0 &&
                  ` (Page ${paginationState.currentPage})`}
              </CardDescription>
            </div>

            {/* Responsive Search Controls */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex w-full sm:w-72 items-center gap-2">
                <input
                  type="email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user by email..."
                  className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    loadUsers();
                  }}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
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
              <h3 className="mt-2 text-sm font-semibold">No users</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by adding a new user.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => navigate("/admin/create-user")}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add User
                </Button>
              </div>
            </div>
          ) : (
            <>
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
                            {getEnrollmentsCount(user)} enrolled
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
              <div className="flex flex-col sm:flex-row items-center justify-between space-x-0 sm:space-x-2 space-y-2 sm:space-y-0 py-4">
                <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
                  Showing {users.data.length} users
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
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          deleteUser();
          setConfirmOpen(false);
        }}
        title="Delete"
        body="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </AdminLayout>
  );
};

export default AdminUsers;

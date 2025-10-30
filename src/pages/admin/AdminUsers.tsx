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
  User as UserIcon
} from 'lucide-react';
import { USER_ROLE, USER_STATUS } from '@/constants';

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
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

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

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Implement your delete user logic here
      console.log('Deleting user:', userId);
      // After deletion, reload users
      await loadUsers();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage platform users, their roles, and statuses.
                {users.totalCount > 0 && ` (Page ${paginationState.currentPage})`}
              </CardDescription>
            </div>
            <Button
              onClick={() => navigate("/admin/create-user")}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.data.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                No users
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by inviting or creating a user.
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
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <UserIcon className="h-4 w-4" />
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
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
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
                            onClick={() => navigate(`/admin/edit-user/${user.id}`)}
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(user.id)}
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

              {/* Pagination Controls */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  Showing {users.data.length} users
                  {users.totalCount > users.data.length &&
                    ` (page ${paginationState.currentPage})`
                  }
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
    </AdminLayout>
  );
};

export default AdminUsers;

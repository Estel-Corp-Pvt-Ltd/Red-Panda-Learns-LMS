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
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  User as UserIcon,
  BookOpen
} from 'lucide-react';
import { USER_ROLE, USER_STATUS } from '@/constants';
import ConfirmDialog from '@/components/ConfirmDialog';

interface PaginatedInstructors {
  data: User[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const AdminInstructors: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [instructors, setInstructors] = useState<PaginatedInstructors>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<User | null>(null);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  const loadInstructors = async (options = {}) => {
    setIsLoading(true);
    try {
      const result = await userService.getUsersByRole(USER_ROLE.INSTRUCTOR, {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setInstructors(prev => ({
          ...result.data,
          totalCount: result.data.data.length
        }));
      } else {
        toast({
          title: "Error",
          description: "Failed to load instructors",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load instructors",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!instructors.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: instructors.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadInstructors({
      cursor: instructors.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!instructors.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: instructors.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadInstructors({
      cursor: instructors.previousCursor,
      pageDirection: 'previous'
    });
  };

  const deleteInstructor = async () => {
    if (!selectedInstructor) return;
    const result = await userService.deleteUser(selectedInstructor.id);
    if (!result.success) {
      toast({
        title: "Error",
        description: "Failed to delete instructor",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Success",
      description: "Instructor deleted successfully",
    });
    await loadInstructors();
  };

  const getFullName = (instructor: User) => {
    const names = [instructor.firstName];
    if (instructor.middleName) names.push(instructor.middleName);
    names.push(instructor.lastName);
    return names.join(' ');
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

  const getCourseCount = (instructor: User) => {
    // This would need to be implemented based on your data structure
    // For now, returning a placeholder
    return 0;
  };

  useEffect(() => {
    loadInstructors();
  }, []);

  if (isLoading && instructors.data.length === 0) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading instructors...</p>
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
              <CardTitle>Instructors</CardTitle>
              <CardDescription>
                Manage all instructors and their profiles.
                {instructors.totalCount > 0 && ` (Page ${paginationState.currentPage})`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{instructors.totalCount} instructors</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {instructors.data.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                No Instructors
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No instructors found in the system.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructors.data.map((instructor) => (
                    <TableRow key={instructor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {instructor.photoURL ? (
                            <img
                              src={instructor.photoURL}
                              alt={getFullName(instructor)}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <UserIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">
                              {getFullName(instructor)}
                            </div>
                            {instructor.username && (
                              <div className="text-sm text-muted-foreground">
                                @{instructor.username}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{instructor.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(instructor.status)}>
                          {instructor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span>{getCourseCount(instructor)} courses</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/edit-user/${instructor.id}`)}
                            title="Edit Instructor"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/instructor/${instructor.id}/courses`)}
                            title="View Courses"
                          >
                            <BookOpen className="h-4 w-4" />
                          </Button> */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInstructor(instructor);
                              setConfirmOpen(true);
                            }}
                            title="Delete Instructor"
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
                  Showing {instructors.data.length} instructors
                  {instructors.totalCount > instructors.data.length &&
                    ` (page ${paginationState.currentPage})`
                  }
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!instructors.hasPreviousPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!instructors.hasNextPage || isLoading}
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
          deleteInstructor();
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

export default AdminInstructors;

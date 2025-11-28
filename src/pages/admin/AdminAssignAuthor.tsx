import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import { assignmentService } from '@/services/assignmentService';
import { userService } from '@/services/userService';
import { Assignment } from '@/types/assignment';
import { User } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  X,
  Calendar,
  Edit,
  Trash2,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { USER_ROLE } from '@/constants';
import { formatDateTime } from '@/utils/date-time';
import EditAssignmentModal from '@/components/admin/EditAssignmentModal';


interface PaginatedAssignments {
  data: Assignment[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

type AuthorFilterType = 'all' | 'null' | 'assigned' | string;
type DeadlineFilterType = 'all' | 'past' | 'upcoming' | 'today' | 'this-week' | 'no-deadline';

const ManageAssignmentAuthors: React.FC = () => {
  const { toast } = useToast();
  
  // Assignments state
  const [assignments, setAssignments] = useState<PaginatedAssignments>({
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

  // Staff users state
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Track changes
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const [savingAssignments, setSavingAssignments] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [authorFilter, setAuthorFilter] = useState<AuthorFilterType>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  // ----------------- Edit Assignment Handler -----------------
  const handleEditAssignment = (assignmentId: string) => {
    setEditingAssignmentId(assignmentId);
    setIsEditModalOpen(true);
  };

  const handleAssignmentUpdated = (updatedAssignment: Assignment) => {
    // Update the assignment in local state
    setAssignments(prev => ({
      ...prev,
      data: prev.data.map(assignment => 
        assignment.id === updatedAssignment.id 
          ? { ...assignment, ...updatedAssignment }
          : assignment
      )
    }));

    toast({
      title: "Success",
      description: "Assignment updated successfully",
    });
  };

  // ----------------- Build Filters -----------------
  const buildFilters = () => {
    const filters: { field: keyof Assignment; op: any; value: any }[] = [];

    if (authorFilter === 'null') {
      filters.push({ field: 'authorId', op: '==', value: '' });
    } else if (authorFilter === 'assigned') {
      filters.push({ field: 'authorId', op: '!=', value: '' });
    } else if (authorFilter !== 'all') {
      filters.push({ field: 'authorId', op: '==', value: authorFilter });
    }

    return filters;
  };

  // ----------------- Client-side Deadline Filter -----------------
  const applyDeadlineFilter = (assignmentsList: Assignment[]): Assignment[] => {
    if (deadlineFilter === 'all') return assignmentsList;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
    const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return assignmentsList.filter(assignment => {
      const deadline = assignment.deadline?.toDate?.() || assignment.deadline;
      
      if (!deadline) {
        return deadlineFilter === 'no-deadline';
      }

      const deadlineDate = new Date(formatDateTime(deadline));

      switch (deadlineFilter) {
        case 'past':
          return deadlineDate < now;
        case 'upcoming':
          return deadlineDate >= now;
        case 'today':
          return deadlineDate >= today && deadlineDate <= endOfToday;
        case 'this-week':
          return deadlineDate >= today && deadlineDate <= endOfWeek;
        case 'no-deadline':
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
    
    return assignmentsList.filter(assignment => {
      const titleMatch = assignment.title?.toLowerCase().includes(query);
      const idMatch = assignment.id?.toLowerCase().includes(query);
      const authorName = getAuthorName(assignment.authorId)?.toLowerCase();
      const authorMatch = authorName?.includes(query);
      
      return titleMatch || idMatch || authorMatch;
    });
  };

  // ----------------- Load Assignments -----------------
  const loadAssignments = async (options = {}, useFilters = true) => {
    setIsLoading(true);
    try {
      const filters = useFilters ? buildFilters() : [];
      
      const result = await assignmentService.getAssignments(filters, {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setAssignments({
          ...result.data,
          totalCount: result.data.totalCount
        });
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

  // ----------------- Search by Title -----------------
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Info',
        description: 'Enter a search term to search',
      });
      return;
    }

    setIsSearching(true);
    setPaginationState({
      cursor: null,
      pageDirection: 'next',
      currentPage: 1
    });

    await loadAssignments({ limit: 100 });
    setIsSearching(false);
  };

  // ----------------- Apply Filters -----------------
  const applyFilters = async () => {
    setPaginationState({
      cursor: null,
      pageDirection: 'next',
      currentPage: 1
    });
    
    await loadAssignments();
  };

  // ----------------- Reset All Filters -----------------
  const resetFilters = async () => {
    setSearchQuery('');
    setAuthorFilter('all');
    setDeadlineFilter('all');
    setPaginationState({
      cursor: null,
      pageDirection: 'next',
      currentPage: 1
    });
    
    await loadAssignments({}, false);
  };

  // ----------------- Update Active Filters Count -----------------
  useEffect(() => {
    let count = 0;
    if (authorFilter !== 'all') count++;
    if (deadlineFilter !== 'all') count++;
    if (searchQuery.trim()) count++;
    setActiveFiltersCount(count);
  }, [authorFilter, deadlineFilter, searchQuery]);

  // ----------------- Pagination -----------------
  const handleNextPage = async () => {
    if (!assignments.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: assignments.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadAssignments({
      cursor: assignments.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!assignments.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: assignments.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadAssignments({
      cursor: assignments.previousCursor,
      pageDirection: 'previous'
    });
  };

  // ----------------- Handle Author Change -----------------
  const handleAuthorChange = (assignmentId: string, authorId: string) => {
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      
      const assignment = assignments.data.find(a => a.id === assignmentId);
      
      if (assignment?.authorId === authorId) {
        newChanges.delete(assignmentId);
      } else {
        newChanges.set(assignmentId, authorId);
      }
      
      return newChanges;
    });
  };
 // ----------------- Delete Assignment -----------------

//   const handleDeleteAssignment = async (id: string) => {
//   const result = await assignmentService.deleteAssignment(id);

//   if (result.success) {
//     // Remove from UI immediately
//     setAssignments(prev => ({
//       ...prev,
//       data: prev.data.filter(a => a.id !== id),
//       totalCount: prev.totalCount - 1,
//     }));

//     toast({
//       title: "Deleted",
//       description: "Assignment deleted successfully",
//     });
//   } else {
//     toast({
//       title: "Error",
//       description: "Failed to delete assignment",
//       variant: "destructive",
//     });
//   }
// };

  // ----------------- Save Single Assignment -----------------
  const saveAssignmentAuthor = async (assignmentId: string) => {
    const authorId = pendingChanges.get(assignmentId);
    if (!authorId) return;

    setSavingAssignments(prev => new Set(prev).add(assignmentId));

    try {
      const result = await assignmentService.updateAssignmentAuthor(assignmentId, authorId);

      if (result.success) {
        setAssignments(prev => ({
          ...prev,
          data: prev.data.map(a => 
            a.id === assignmentId ? { ...a, authorId } : a
          )
        }));

        setPendingChanges(prev => {
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
      setSavingAssignments(prev => {
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
          setAssignments(prev => ({
            ...prev,
            data: prev.data.map(a => 
              a.id === assignmentId ? { ...a, authorId } : a
            )
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
    const user = staffUsers.find(u => u.id === authorId);
    return user ? `${user.firstName} ${user.lastName}` : null;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case USER_ROLE.ADMIN:
        return "destructive";
      case USER_ROLE.INSTRUCTOR:
        return "default";
      case USER_ROLE.TEACHER:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getCurrentAuthorId = (assignment: Assignment) => {
    return pendingChanges.get(assignment.id) || assignment.authorId || '';
  };

  const hasChanges = (assignmentId: string) => {
    return pendingChanges.has(assignmentId);
  };

  const getDeadlineStatus = (deadline: any) => {
    if (!deadline) return { label: 'No deadline', variant: 'outline' as const };
    
    const deadlineDate = deadline?.toDate?.() || new Date(deadline);
    const now = new Date();
    
    if (deadlineDate < now) {
      return { label: 'Past', variant: 'destructive' as const };
    }
    
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours <= 24) {
      return { label: 'Due soon', variant: 'default' as const };
    }
    
    return { label: 'Upcoming', variant: 'secondary' as const };
  };

  // ----------------- Get Filtered/Searched Data -----------------
  const getDisplayedAssignments = () => {
    let result = assignments.data;
    result = applyDeadlineFilter(result);
    result = applySearchFilter(result);
    return result;
  };

  // ----------------- Initial Load -----------------
  useEffect(() => {
    loadAssignments();
    loadStaffUsers();
  }, []);

  // ----------------- Loading State -----------------
  if ((isLoading || isLoadingStaff) && assignments.data.length === 0) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading assignments and staff...</p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const displayedAssignments = getDisplayedAssignments();

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Manage Assignment Authors
              </CardTitle>
              <CardDescription>
                Assign authors to assignments. 
                {assignments.totalCount > 0 && ` Total: ${assignments.totalCount} assignments`}
                {pendingChanges.size > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {pendingChanges.size} unsaved changes
                  </Badge>
                )}
              </CardDescription>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  resetFilters();
                  setPendingChanges(new Map());
                }}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Reset
              </Button>

              {pendingChanges.size > 0 && (
                <Button
                  onClick={saveAllChanges}
                  disabled={isBulkSaving}
                  className="flex items-center gap-2"
                >
                  {isBulkSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save All ({pendingChanges.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Search and Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-4">
              {/* Search Row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Search</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search by title, ID, or author name..."
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching}
                      size="sm"
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Author Filter */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Author Status</label>
                  <Select
                    value={authorFilter}
                    onValueChange={(value: AuthorFilterType) => setAuthorFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by author..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignments</SelectItem>
                      <SelectItem value="null">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          No Author (Null)
                        </div>
                      </SelectItem>
                      <SelectItem value="assigned">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Has Author
                        </div>
                      </SelectItem>
                      <div className="border-t my-1" />
                      {staffUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.firstName} {user.lastName}</span>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Deadline Filter */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Deadline</label>
                  <Select
                    value={deadlineFilter}
                    onValueChange={(value: DeadlineFilterType) => setDeadlineFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by deadline..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Deadlines</SelectItem>
                      <SelectItem value="no-deadline">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          No Deadline
                        </div>
                      </SelectItem>
                      <SelectItem value="past">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-red-500" />
                          Past Due
                        </div>
                      </SelectItem>
                      <SelectItem value="today">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-500" />
                          Due Today
                        </div>
                      </SelectItem>
                      <SelectItem value="this-week">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          This Week
                        </div>
                      </SelectItem>
                      <SelectItem value="upcoming">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-500" />
                          Upcoming
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Apply Filters Button */}
                <div className="flex items-end">
                  <Button
                    onClick={applyFilters}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Filter className="h-4 w-4 mr-2" />
                        Apply Filters
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Active Filters Tags */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  
                  {searchQuery.trim() && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Search: "{searchQuery}"
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setSearchQuery('')}
                      />
                    </Badge>
                  )}
                  
                  {authorFilter !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Author: {authorFilter === 'null' ? 'No Author' : 
                               authorFilter === 'assigned' ? 'Has Author' : 
                               getAuthorName(authorFilter) || authorFilter}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setAuthorFilter('all')}
                      />
                    </Badge>
                  )}
                  
                  {deadlineFilter !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Deadline: {deadlineFilter.replace('-', ' ')}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setDeadlineFilter('all')}
                      />
                    </Badge>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-6 px-2 text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Staff Users Summary */}
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {staffUsers.length} staff members available: {' '}
                {staffUsers.filter(u => u.role === USER_ROLE.ADMIN).length} Admins, {' '}
                {staffUsers.filter(u => u.role === USER_ROLE.TEACHER).length} Teachers, {' '}
                {staffUsers.filter(u => u.role === USER_ROLE.INSTRUCTOR).length} Instructors
              </span>
            </div>
          </div>

          {/* Results Summary */}
          {(searchQuery.trim() || authorFilter !== 'all' || deadlineFilter !== 'all') && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Filter className="h-4 w-4" />
                <span>
                  Showing {displayedAssignments.length} of {assignments.data.length} loaded assignments
                  {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
                </span>
              </div>
            </div>
          )}

          {displayedAssignments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No assignments found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeFiltersCount > 0 
                  ? 'Try adjusting your filters or search query.'
                  : 'Create some assignments first.'}
              </p>
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Assignment</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Current Author</TableHead>
                      <TableHead className="min-w-[250px]">Select Author</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedAssignments.map((assignment) => {
                      const deadlineStatus = getDeadlineStatus(assignment.deadline);
                      
                      return (
                        <TableRow 
                          key={assignment.id}
                          className={hasChanges(assignment.id) ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}
                        >
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{assignment.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {assignment.id}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {formatDateTime(assignment.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">
                                {formatDateTime(assignment.deadline)}
                              </span>
                              <Badge variant={deadlineStatus.variant} className="text-xs w-fit">
                                {deadlineStatus.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.authorId ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">
                                  {getAuthorName(assignment.authorId) || assignment.authorId}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                <span className="text-sm text-muted-foreground">Not assigned</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={getCurrentAuthorId(assignment)}
                              onValueChange={(value) => handleAuthorChange(assignment.id, value)}
                              disabled={savingAssignments.has(assignment.id)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select author..." />
                              </SelectTrigger>
                              <SelectContent>
                                {staffUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{user.firstName} {user.lastName}</span>
                                      <Badge 
                                        variant={getRoleBadgeVariant(user.role)} 
                                        className="text-xs"
                                      >
                                        {user.role}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                                {/* {Delete Assignment} */}
                             {/* <AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      title="Delete Assignment"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </AlertDialogTrigger>

  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete the assignment.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => handleDeleteAssignment(assignment.id)}
        className="bg-red-600 hover:bg-red-700"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog> */}

                              {/* Edit Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAssignment(assignment.id)}
                                title="Edit Assignment"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {/* Save Author Button */}
                              <Button
                                variant={hasChanges(assignment.id) ? "default" : "ghost"}
                                size="sm"
                                onClick={() => saveAssignmentAuthor(assignment.id)}
                                disabled={!hasChanges(assignment.id) || savingAssignments.has(assignment.id)}
                                title="Save Author"
                              >
                                {savingAssignments.has(assignment.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between space-x-0 sm:space-x-2 space-y-2 sm:space-y-0 py-4 border-t mt-4">
                <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
                  Showing {displayedAssignments.length} of {assignments.totalCount} assignments
                  {` • Page ${paginationState.currentPage}`}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!assignments.hasPreviousPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!assignments.hasNextPage || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Pending Changes Summary */}
          {pendingChanges.size > 0 && (
            <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Unsaved Changes
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    You have {pendingChanges.size} assignment(s) with pending author changes.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingChanges(new Map())}
                  >
                    Discard All
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveAllChanges}
                    disabled={isBulkSaving}
                  >
                    {isBulkSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save All Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Assignment Modal */}
      <EditAssignmentModal
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
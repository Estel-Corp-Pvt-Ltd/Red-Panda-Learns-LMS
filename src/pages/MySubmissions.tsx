import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assignmentService } from '@/services/assignmentService';
import { AssignmentSubmission, Assignment } from '@/types/assignment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar,
  Search,
  Link as LinkIcon,
  Download,
  Upload,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Header } from '@/components/Header';
import { formatDate } from '@/utils/date-time';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import MarkdownViewer from '@/components/MarkdownViewer';

interface FilterState {
  searchTerm: string;
  gradingStatus: 'all' | 'graded' | 'ungraded';
  assignmentFilter: string;
  sortBy: 'createdAt' | 'marks' | 'assignmentTitle';
  sortOrder: 'asc' | 'desc';
}

const MySubmissionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<AssignmentSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    gradingStatus: 'all',
    assignmentFilter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadInitialData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [submissions, filters]);

  const loadInitialData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load student's submissions
      const submissionsResult = await assignmentService.getSubmissionsByStudent(user.id);
      if (submissionsResult.success) {
        console.log('MySubmissionsPage - Loaded submissions:', submissionsResult.data);
        setSubmissions(submissionsResult.data || []);
      }

      // Load assignments for filter dropdown and assignment titles
      const assignmentsData = await assignmentService.getAllAssignments();
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...submissions];

    // Apply search filter
    if (filters.searchTerm.trim()) {
      filtered = filtered.filter(submission =>
        submission.assignmentId.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        getAssignmentTitle(submission.assignmentId).toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Apply grading status filter
    if (filters.gradingStatus === 'graded') {
      filtered = filtered.filter(submission => submission.marks != null);
    } else if (filters.gradingStatus === 'ungraded') {
      filtered = filtered.filter(submission => submission.marks == null);
    }

    // Apply assignment filter
    if (filters.assignmentFilter && filters.assignmentFilter !== 'all') {
      filtered = filtered.filter(submission =>
        submission.assignmentId === filters.assignmentFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy === 'assignmentTitle' ? 'assignmentId' : filters.sortBy];
      let bValue: any = b[filters.sortBy === 'assignmentTitle' ? 'assignmentId' : filters.sortBy];

      if (filters.sortBy === 'createdAt') {
        aValue = aValue?.toDate?.() || aValue;
        bValue = bValue?.toDate?.() || bValue;
      }

      if (filters.sortBy === 'assignmentTitle') {
        aValue = getAssignmentTitle(aValue);
        bValue = getAssignmentTitle(bValue);
      }

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredSubmissions(filtered);
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      gradingStatus: 'all',
      assignmentFilter: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const getAssignmentTitle = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    return assignment?.title || assignmentId;
  };

  const getGradeText = (submission: AssignmentSubmission) => {
    return submission.marks !== undefined && submission.marks !== null
      ? `${submission.marks}`
      : 'Not Graded';
  };

  const hasActiveFilters = () => {
    return filters.searchTerm !== '' ||
      filters.gradingStatus !== 'all' ||
      filters.assignmentFilter !== 'all';
  };

  const hasFeedback = (submission: AssignmentSubmission) => {
    return submission.feedback && submission.feedback.trim().length > 0;
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your submissions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  My Submissions
                </h1>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search my submissions..."
                      className="pl-9"
                      value={filters.searchTerm}
                      onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="flex gap-2">
                  <Select
                    value={filters.assignmentFilter}
                    onValueChange={(value) => handleFilterChange('assignmentFilter', value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Assignments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignments</SelectItem>
                      {assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.gradingStatus}
                    onValueChange={(value: 'all' | 'graded' | 'ungraded') => handleFilterChange('gradingStatus', value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Submissions</SelectItem>
                      <SelectItem value="graded">Graded</SelectItem>
                      <SelectItem value="ungraded">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters() && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Sorting Options */}
              <div className="mt-4 flex items-center gap-4">
                <Label htmlFor="sort" className="text-sm font-medium whitespace-nowrap">Sort by:</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: 'createdAt' | 'marks' | 'assignmentTitle') => handleFilterChange('sortBy', value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Submission Date</SelectItem>
                    <SelectItem value="assignmentTitle">Assignment</SelectItem>
                    <SelectItem value="marks">Marks</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {filters.sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Assignment</TableHead>
                      <TableHead className="w-[100px]">Files</TableHead>
                      <TableHead className="w-[140px]">Submitted</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px]">Marks</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {submissions.length === 0
                            ? 'You have no submissions yet. Start by submitting an assignment!'
                            : 'No submissions match your filters'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell>
                            <div className="max-w-[240px]">
                              <div className="font-medium text-sm">
                                {getAssignmentTitle(submission.assignmentId)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {submission.submissionFiles.slice(0, 2).map((fileUrl, index) => (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(fileUrl, '_blank')}
                                  title="View file"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              ))}
                              {submission.submissionFiles.length > 2 && (
                                <Badge variant="secondary" className="h-8 px-2 flex items-center text-xs">
                                  +{submission.submissionFiles.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDate(submission.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={
                              submission.marks != null
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                            }>
                              {submission.marks != null ? 'Graded' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getGradeText(submission)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(submission.submissionFiles[0], '_blank')}
                                className="h-8 w-8"
                                title="Download submission"
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              {/* Feedback Dialog */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="View feedback"
                                    disabled={!hasFeedback(submission)}
                                  >
                                    <MessageSquare className={`h-4 w-4 ${hasFeedback(submission)
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-gray-400 dark:text-gray-500'
                                      }`} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                                  <DialogHeader>
                                    <DialogTitle>Feedback for {getAssignmentTitle(submission.assignmentId)}</DialogTitle>
                                    <DialogDescription>
                                      Submitted on {formatDate(submission.createdAt)}
                                      {submission.marks != null && ` • Marks: ${submission.marks}`}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 flex-1 overflow-y-auto">
                                    {hasFeedback(submission) ? (
                                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-y-auto">
                                        <MarkdownViewer value={submission.feedback || ''} />
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-muted-foreground">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                                        <p>No feedback provided yet.</p>
                                        <p className="text-sm mt-2">
                                          {submission.marks != null
                                            ? 'Your submission has been graded but no feedback was added.'
                                            : 'Your submission is still pending review.'
                                          }
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Results Info */}
              {filteredSubmissions.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredSubmissions.length} of {submissions.length} submissions
                    {hasActiveFilters() && ' (filtered)'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MySubmissionsPage;

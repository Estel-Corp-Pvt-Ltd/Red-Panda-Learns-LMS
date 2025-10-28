import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Search,
  Link as LinkIcon,
  Edit,
  Trash2,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/utils/date-time';
import { DocumentSnapshot } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface FilterState {
  searchTerm: string;
  gradingStatus: 'all' | 'graded' | 'ungraded';
  assignmentFilter: string;
  sortBy: 'studentName' | 'createdAt' | 'marks';
  sortOrder: 'asc' | 'desc';
}

const AllSubmissionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<AssignmentSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [maximumMarks, setMaximumMarks] = useState<number>(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<AssignmentSubmission | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<{
    data: AssignmentSubmission[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor: DocumentSnapshot | null;
    previousCursor: DocumentSnapshot | null;
  } | null>(null);
  const [cursorStack, setCursorStack] = useState<DocumentSnapshot[]>([]);
  const [currentCursor, setCurrentCursor] = useState<DocumentSnapshot | null>(null);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    gradingStatus: 'all',
    assignmentFilter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Collapsible filters
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [submissions, filters]);

  useEffect(() => {
    if (selectedSubmission) {
      const fetchAssignmentDetails = async (assignmentId: string) => {
        const assignment = await assignmentService.getAssignmentById(assignmentId);
        setMaximumMarks(assignment.data.totalPoints || 100);
        setMarks(selectedSubmission.marks?.toString() || '');
        setFeedback(selectedSubmission.feedback || '');
      };

      fetchAssignmentDetails(selectedSubmission.assignmentId);
    }
  }, [selectedSubmission]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const submissionsResult = await assignmentService.getFirstSubmissionsPage([], pageSize);
      if (submissionsResult.success && submissionsResult.data) {
        setCurrentPage(submissionsResult.data);
        setSubmissions(submissionsResult.data.data);
        setCurrentCursor(submissionsResult.data.nextCursor);
      }

      const assignmentsData = await assignmentService.getAllAssignments();
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNextPage = async () => {
    if (!currentCursor) return;

    const result = await assignmentService.getNextSubmissionsPage(
      currentCursor,
      buildFirestoreFilters(),
      pageSize
    );

    if (result.success && result.data) {
      setCursorStack(prev => [...prev, currentCursor!]);
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
      buildFirestoreFilters(),
      pageSize
    );

    if (result.success && result.data) {
      setCursorStack(prev => prev.slice(0, -1));
      setCurrentPage(result.data);
      setSubmissions(result.data.data);
      setCurrentCursor(result.data.nextCursor);
    }
  };

  const buildFirestoreFilters = () => {
    const firestoreFilters: any[] = [];

    if (filters.assignmentFilter && filters.assignmentFilter !== 'all') {
      firestoreFilters.push({
        field: 'assignmentId',
        op: '==',
        value: filters.assignmentFilter
      });
    }

    if (filters.gradingStatus === 'graded') {
      firestoreFilters.push({
        field: 'marks',
        op: '>=',
        value: 0
      });
    } else if (filters.gradingStatus === 'ungraded') {
      firestoreFilters.push({
        field: 'marks',
        op: '==',
        value: null
      });
    }

    return firestoreFilters;
  };

  const applyFilters = () => {
    let filtered = [...submissions];

    // Apply search filter
    if (filters.searchTerm.trim()) {
      filtered = filtered.filter(submission =>
        submission.studentName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        submission.studentId.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        submission.assignmentId.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];

      if (filters.sortBy === 'createdAt') {
        aValue = aValue?.toDate?.() || aValue;
        bValue = bValue?.toDate?.() || bValue;
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

  const openGradeModal = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setMarks(submission.marks?.toString() || '');
    setFeedback(submission.feedback || '');
    setIsModalOpen(true);
  };

  const closeGradeModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
    setMarks('');
    setFeedback('');
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;

    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks)) {
      alert('Please enter valid marks');
      return;
    }

    try {
      setSaving(true);
      await assignmentService.updateSubmission(selectedSubmission.id!, {
        marks: numericMarks,
        feedback: feedback.trim(),
      });

      setSubmissions(prev => prev.map(sub =>
        sub.id === selectedSubmission.id
          ? { ...sub, marks: numericMarks, feedback: feedback.trim() }
          : sub
      ));

      closeGradeModal();
    } catch (error) {
      console.error('Error saving grade:', error);
      alert('Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;

    try {
      setDeleting(submissionToDelete.id!);
      await assignmentService.deleteSubmission(submissionToDelete.id!);

      setSubmissions(prev => prev.filter(sub => sub.id !== submissionToDelete.id));
      setSubmissionToDelete(null);
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission');
    } finally {
      setDeleting(null);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading submissions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                All Submissions
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/assignments')}>
              <Eye className="h-4 w-4 mr-2" />
              Assignments
            </Button>
          </div>
        </div>

        {/* Compact Filters */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search students or assignments..."
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
                  <SelectTrigger className="w-[160px]">
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
                    Clear
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
                  {filtersOpen ? 'Hide Filters' : 'More Filters'}
                </Button>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Show:</span>
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filtersOpen && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sort" className="text-sm whitespace-nowrap">Sort by:</Label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value: 'studentName' | 'createdAt' | 'marks') => handleFilterChange('sortBy', value)}
                    >
                      <SelectTrigger className="flex-1">
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
                      onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="h-9 w-9"
                    >
                      {filters.sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Student</TableHead>
                    <TableHead className="w-[200px]">Assignment</TableHead>
                    <TableHead className="w-[80px]">Files</TableHead>
                    <TableHead className="w-[120px]">Submitted</TableHead>
                    <TableHead className="w-[80px]">Marks</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {submissions.length === 0 ? 'No submissions yet' : 'No submissions match your filters'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{submission.studentName}</div>
                              <div className="text-xs text-muted-foreground">{submission.studentId}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm truncate max-w-[180px]" title={getAssignmentTitle(submission.assignmentId)}>
                            {getAssignmentTitle(submission.assignmentId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {submission.submissionFiles.slice(0, 2).map((fileUrl, index) => (
                              <Button
                                key={index}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.open(fileUrl, '_blank')}
                              >
                                <LinkIcon className="h-3 w-3" />
                              </Button>
                            ))}
                            {submission.submissionFiles.length > 2 && (
                              <Badge variant="secondary" className="h-7 px-2 text-xs">
                                +{submission.submissionFiles.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(submission.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getGradeText(submission)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openGradeModal(submission)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSubmissionToDelete(submission)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
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
            </div>

            {/* Compact Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredSubmissions.length} of {submissions.length}
                  {hasActiveFilters() && ' (filtered)'}
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

        {/* Grading Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-lg">Grade Submission</DialogTitle>
              <DialogDescription>
                {selectedSubmission?.studentName} - {getAssignmentTitle(selectedSubmission?.assignmentId || '')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="marks" className="text-sm">Marks ({maximumMarks})</Label>
                <Input
                  id="marks"
                  type="number"
                  min="0"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="Enter marks"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="feedback" className="text-sm">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional feedback..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeGradeModal} size="sm">Cancel</Button>
              <Button onClick={handleSaveGrade} disabled={saving} size="sm">
                {saving ? 'Saving...' : 'Save Grade'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Submission</DialogTitle>
              <DialogDescription>
                This will permanently delete the submission from <strong>{submissionToDelete?.studentName}</strong>.
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
                {deleting === submissionToDelete?.id ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AllSubmissionsPage;

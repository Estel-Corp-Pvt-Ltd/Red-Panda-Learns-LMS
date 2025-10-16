import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentService } from '@/services/assignmentService';
import { Submission, Assignment } from '@/types/assignment';
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
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { Textarea } from '@/components/ui/textarea';

const AssignmentSubmissionsPage = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradingFilter, setGradingFilter] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    assignmentId && loadAssignmentAndSubmissions();
  }, [assignmentId]);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, searchTerm, gradingFilter]);

  const loadAssignmentAndSubmissions = async () => {
    if (!assignmentId) return;
    try {
      setLoading(true);
      const [assignmentData, submissionsData] = await Promise.all([
        assignmentService.getAssignmentById(assignmentId),
        assignmentService.getSubmissionsByAssignment(assignmentId)
      ]);
      setAssignment(assignmentData);
      setSubmissions(submissionsData || []);
      console.log("SubmissionData", submissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = submissions;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(submission =>
        submission.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply grading filter
    if (gradingFilter === 'graded') {
      filtered = filtered.filter(submission => submission.marks != null);
    } else if (gradingFilter === 'ungraded') {
      filtered = filtered.filter(submission => submission.marks == null);
    }

    setFilteredSubmissions(filtered);
  };

  const openGradeModal = (submission: Submission) => {
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
    if (!selectedSubmission || !assignment) return;

    const numericMarks = parseFloat(marks) || 0;
    if (numericMarks > assignment.totalPoints) {
      alert(`Marks cannot exceed ${assignment.totalPoints}`);
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
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(submissionId);
      await assignmentService.deleteSubmission(submissionId);

      setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return 'Invalid date';
    }
  };

  const getGradeText = (submission: Submission) => {
    return submission.marks !== undefined && submission.marks !== null
      ? `${submission.marks}/${assignment?.totalPoints}`
      : 'Not Graded';
  };

  const getGradeColor = (submission: Submission) => {
    if (submission.marks !== undefined && submission.marks !== null) {
      const isPassing = submission.marks >= (assignment?.minimumPassPoint || 0);
      return isPassing
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getGradedCount = () => submissions.filter(s => s.marks != null).length;
  const getUngradedCount = () => submissions.filter(s => s.marks == null).length;

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assignment Not Found</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">The assignment doesn't exist.</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Back</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {assignment.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: 'Total', value: submissions.length, icon: FileText },
            { title: 'Graded', value: getGradedCount(), icon: FileText, color: 'text-green-600' },
            { title: 'Ungraded', value: getUngradedCount(), icon: FileText, color: 'text-orange-600' },
            { title: 'Max Points', value: assignment.totalPoints, icon: FileText },
          ].map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color || ''}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Submissions</CardTitle>
                <p className="text-sm text-muted-foreground">Manage and grade student work</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={gradingFilter} onValueChange={(value: 'all' | 'graded' | 'ungraded') => setGradingFilter(value)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="graded">Graded</SelectItem>
                    <SelectItem value="ungraded">Ungraded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {submissions.length === 0 ? 'No submissions yet' : 'No submissions match your filters'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{submission.studentName}</div>
                              <div className="text-xs text-muted-foreground">ID: {submission.studentId}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {submission.submissionFiles.map((fileUrl, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => window.open(fileUrl, '_blank')}
                              >
                                <LinkIcon className="h-3 w-3" />
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(submission.submittedAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getGradeColor(submission)}>
                            {getGradeText(submission)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGradeModal(submission)}
                              disabled={deleting === submission.id}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSubmission(submission.id!)}
                              disabled={deleting === submission.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900"
                            >
                              {deleting === submission.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Filter Info */}
            {(searchTerm || gradingFilter !== 'all') && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredSubmissions.length} of {submissions.length} submissions
                {searchTerm && ` matching "${searchTerm}"`}
                {gradingFilter !== 'all' && ` (${gradingFilter})`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grading Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Grade {selectedSubmission?.studentName}</DialogTitle>
              <DialogDescription>
                Set marks and feedback for this submission
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="marks">Marks (Max: {assignment.totalPoints})</Label>
                <Input
                  id="marks"
                  type="number"
                  min="0"
                  max={assignment.totalPoints}
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional feedback..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeGradeModal}>Cancel</Button>
              <Button onClick={handleSaveGrade} disabled={saving}>
                {saving ? 'Saving...' : 'Save Grade'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default AssignmentSubmissionsPage;

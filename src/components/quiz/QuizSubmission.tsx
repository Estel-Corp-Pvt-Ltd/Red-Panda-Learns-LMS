import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Quiz, QuizSubmission } from '@/types/quiz';
import { quizService } from '@/services/quizService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Download,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  BarChart3,
  RotateCcw,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/utils/date-time';
import { QuizSubmissionStatus } from '@/types/general';
import { QUIZ_SUBMISSION_STATUS } from '@/constants';

interface QuizSubmissionModalProps {
  open: boolean;
  onClose: () => void;
  quiz: Quiz;
}

type FilterType = 'all' | 'attempted';

const QuizSubmissionModal: React.FC<QuizSubmissionModalProps> = ({
  open,
  onClose,
  quiz
}) => {
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [resettingSubmission, setResettingSubmission] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchQuizSubmissions = async () => {
      if (!quiz) return;

      setLoading(true);
      try {
        const result = await quizService.getAllSubmissionsForQuiz(quiz.id);
        if (result.success) {
          setQuizSubmissions(result.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch submissions",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Something went wrong while fetching submissions",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (open && quiz.id) {
      fetchQuizSubmissions();
    }
  }, [quiz.id, open, toast]);

  useEffect(() => {
    let filtered = quizSubmissions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(submission =>
        submission.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply attempted filter
    if (filterType === 'attempted') {
      filtered = filtered.filter(submission =>
        submission.status === QUIZ_SUBMISSION_STATUS.IN_PROGRESS ||
        submission.status === QUIZ_SUBMISSION_STATUS.SUBMITTED
      );
    }

    setFilteredSubmissions(filtered);
  }, [searchTerm, quizSubmissions, filterType]);

  const calculateTimeSpent = (submission: QuizSubmission): number => {
    if (!submission.submittedAt) return 0;

    const started = new Date(formatDateTime(submission.startedAt));
    const submitted = new Date(formatDateTime(submission.submittedAt || submission.lastSavedAt));

    return Math.round((submitted.getTime() - started.getTime()) / (1000 * 60));
  };

  const getPercentageScore = (submission: QuizSubmission): string => {
    if (submission.totalScore === undefined) return 'N/A';
    const percentage = quiz.totalMarks > 0
      ? ((submission.totalScore / quiz.totalMarks) * 100).toFixed(2)
      : '0.00';
    return percentage;
  }

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: QuizSubmissionStatus, passed?: boolean) => {
    const statusConfig = {
      [QUIZ_SUBMISSION_STATUS.SUBMITTED]: {
        variant: 'default' as const,
        icon: CheckCircle,
        label: 'Submitted'
      },
      [QUIZ_SUBMISSION_STATUS.IN_PROGRESS]: {
        variant: 'secondary' as const,
        icon: Clock,
        label: 'In Progress'
      },
      [QUIZ_SUBMISSION_STATUS.NOT_SUBMITTED]: {
        variant: 'outline' as const,
        icon: AlertCircle,
        label: 'Not Started'
      }
    };

    const config = statusConfig[status] || statusConfig[QUIZ_SUBMISSION_STATUS.NOT_SUBMITTED];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
        {status === QUIZ_SUBMISSION_STATUS.SUBMITTED && passed !== undefined && (
          <span className="ml-1">
            {passed ? 'Pass' : 'Fail'}
          </span>
        )}
      </Badge>
    );
  };

  const resetQuizForStudent = async (submission: QuizSubmission) => {
    if (!window.confirm(`Are you sure you want to reset the quiz for ${submission.userName}? This will delete their current submission and allow them to start fresh.`)) {
      return;
    }

    setResettingSubmission(submission.id);
    try {
      const result = await quizService.deleteQuizSubmission(submission.id);
      if (result.success) {
        // Remove the submission from the local state
        setQuizSubmissions(prev => prev.filter(s => s.id !== submission.id));
        toast({
          title: "Quiz Reset Successfully",
          description: `${submission.userName} can now attempt the quiz again.`,
        });
      } else {
        toast({
          title: "Reset Failed",
          description: result.error || "Failed to reset quiz submission",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while resetting the quiz",
        variant: "destructive",
      });
    } finally {
      setResettingSubmission(null);
    }
  };

  const exportToCSV = () => {
    // Calculate attempted questions for each submission
    const getAttemptedQuestionsCount = (submission: QuizSubmission): number => {
      if (!submission.answers || submission.answers.length === 0) return 0;
      return submission.answers.length;
    };

    const getResultStatus = (submission: QuizSubmission): string => {
      if (submission.status !== QUIZ_SUBMISSION_STATUS.SUBMITTED) return 'Not Submitted';
      if (submission.passed === undefined) return 'Pending';
      return submission.passed ? 'Pass' : 'Fail';
    };

    const headers = [
      'Sr. No.',
      'Email',
      'Name',
      'Total no of Questions',
      'Attempted Questions',
      'Marks Scored',
      'Total marks',
      'Result - Pass/Fail'
    ];

    const csvData = filteredSubmissions.map((submission, index) => {
      const attemptedQuestions = getAttemptedQuestionsCount(submission);
      const totalQuestions = quiz.questions.length;
      const marksScored = submission.totalScore || 0;
      const totalMarks = quiz.totalMarks;
      const resultStatus = getResultStatus(submission);

      return [
        (index + 1).toString(),
        submission.userEmail || "",
        submission.userName || "",
        totalQuestions.toString(),
        attemptedQuestions.toString(),
        marksScored.toString(),
        totalMarks.toString(),
        resultStatus
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-results-${quiz.title}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV Exported Successfully",
      description: "Quiz results have been downloaded as CSV",
    });
  };

  const stats = {
    total: quizSubmissions.length,
    submitted: quizSubmissions.filter(s => s.status === QUIZ_SUBMISSION_STATUS.SUBMITTED).length,
    inProgress: quizSubmissions.filter(s => s.status === QUIZ_SUBMISSION_STATUS.IN_PROGRESS).length,
    attempted: quizSubmissions.filter(s =>
      s.status === QUIZ_SUBMISSION_STATUS.IN_PROGRESS ||
      s.status === QUIZ_SUBMISSION_STATUS.SUBMITTED
    ).length,
    passed: quizSubmissions.filter(s => s.passed).length
  };

  if (!quiz) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Quiz Submissions
            {quiz.title && <span className="text-gray-500 font-normal">- {quiz.title}</span>}
          </DialogTitle>
          <DialogDescription>
            View and manage all submissions for this quiz
          </DialogDescription>
        </DialogHeader>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-600">Total Students</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{stats.attempted}</div>
            <div className="text-sm text-orange-600">Attempted</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
            <div className="text-sm text-green-600">Submitted</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{stats.passed}</div>
            <div className="text-sm text-purple-600">Passed</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by user name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              All Students
            </Button>
            <Button
              variant={filterType === 'attempted' ? 'default' : 'outline'}
              onClick={() => setFilterType('attempted')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Attempted Only
            </Button>
          </div>

          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Submissions Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {quizSubmissions.length === 0 ? 'No submissions found for this quiz.' : 'No submissions match your search.'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Score</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Time Spent</th>
                    <th className="px-4 py-3 text-left font-medium">Submitted At</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {submission.userName || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {submission.userEmail || submission.userId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {submission.totalScore !== undefined ? `${submission.totalScore}/${quiz.totalMarks}` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getPercentageScore(submission)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(submission.status, submission.passed)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {calculateTimeSpent(submission)} mins
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(submission.submittedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetQuizForStudent(submission)}
                          disabled={resettingSubmission === submission.id}
                          className="flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {resettingSubmission === submission.id ? 'Resetting...' : 'Reset Quiz'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QuizSubmissionModal;

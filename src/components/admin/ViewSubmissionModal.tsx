// components/ViewSubmissionModal.tsx
import { useState, useEffect } from 'react';
import { Assignment, AssignmentSubmission } from '@/types/assignment';
import { assignmentService } from '@/services/assignmentService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Link as LinkIcon,
  Download,
  Calendar,
  User,
  Award,
  MessageSquare,
  Eye,
  ExternalLink,
  Maximize2,
  Minimize2,
  Split,
  Edit3
} from 'lucide-react';
import { formatDate } from '@/utils/date-time';
import MarkdownViewer from '@/components/MarkdownViewer';
import MDEditor from '@uiw/react-md-editor';

interface ViewSubmissionModalProps {
  submission: AssignmentSubmission | null;
  isOpen: boolean;
  onClose: () => void;
}

const ViewSubmissionModal: React.FC<ViewSubmissionModalProps> = ({
  submission,
  isOpen,
  onClose
}) => {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Markdown viewer states
  const [selectedTextIndex, setSelectedTextIndex] = useState<number>(0);
  const [isTextFullscreen, setIsTextFullscreen] = useState(false);
  const [isFeedbackFullscreen, setIsFeedbackFullscreen] = useState(false);
  const [textViewMode, setTextViewMode] = useState<'preview' | 'live'>('preview');
  const [feedbackViewMode, setFeedbackViewMode] = useState<'preview' | 'live'>('preview');

  useEffect(() => {
    if (submission) {
      fetchAssignmentDetails();
    }
  }, [submission]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTextFullscreen) setIsTextFullscreen(false);
        if (isFeedbackFullscreen) setIsFeedbackFullscreen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isTextFullscreen, isFeedbackFullscreen]);

  const fetchAssignmentDetails = async () => {
    if (!submission) return;
    
    setLoading(true);
    try {
      const result = await assignmentService.getAssignmentById(submission.assignmentId);
      if (result.success) {
        setAssignment(result.data);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!submission) return null;

  const getGradeStatus = () => {
    if (submission.marks !== undefined && submission.marks !== null) {
      const percentage = assignment?.totalPoints 
        ? Math.round((submission.marks / assignment.totalPoints) * 100)
        : 0;
      
      let color: 'default' | 'secondary' | 'destructive' = 'default';
      if (percentage >= 80) color = 'default';
      else if (percentage >= 60) color = 'secondary';
      else color = 'destructive';
      
      return {
        text: `${submission.marks}/${assignment?.totalPoints || '?'} (${percentage}%)`,
        color
      };
    }
    return {
      text: 'Not Graded',
      color: 'secondary' as const
    };
  };

  const colorMode = typeof document !== 'undefined' && 
    document.documentElement.classList.contains('dark') ? 'dark' : 'light';

  // Render text submission with fullscreen capability
  const renderTextSubmission = (text: string, index: number) => {
    const isFullscreen = isTextFullscreen && selectedTextIndex === index;
    
    if (isFullscreen) {
      return (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col">
          {/* Fullscreen Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Text Submission {submission.textSubmission.length > 1 ? `(Response ${index + 1})` : ''}
              </h3>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
                  <button
                    onClick={() => setTextViewMode('preview')}
                    className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                      textViewMode === 'preview'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </button>
                  <button
                    onClick={() => setTextViewMode('live')}
                    className={`px-3 py-1.5 text-sm flex items-center gap-1 border-l border-gray-300 dark:border-gray-600 rounded-r-lg ${
                      textViewMode === 'live'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Split className="h-3 w-3" />
                    Split View
                  </button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTextFullscreen(false)}
                >
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </Button>
              </div>
            </div>
          </div>
          
          {/* Fullscreen Content */}
          <div className="flex-1 overflow-hidden p-6">
            <div data-color-mode={colorMode} className="h-full">
              <MDEditor
                value={text}
                preview={textViewMode}
                hideToolbar
                height="100%"
              />
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        {submission.textSubmission.length > 1 && (
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Response {index + 1}</p>
            <button
              onClick={() => {
                setSelectedTextIndex(index);
                setIsTextFullscreen(true);
                setTextViewMode('preview');
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="View fullscreen"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        )}
        {submission.textSubmission.length === 1 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => {
                setSelectedTextIndex(0);
                setIsTextFullscreen(true);
                setTextViewMode('preview');
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="View fullscreen"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="prose dark:prose-invert max-w-none prose-sm max-h-96 overflow-y-auto">
          <MarkdownViewer value={text} />
        </div>
      </div>
    );
  };

  // Render feedback with fullscreen capability
  const renderFeedback = () => {
    if (isFeedbackFullscreen) {
      return (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col">
          {/* Fullscreen Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Instructor Feedback
              </h3>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
                  <button
                    onClick={() => setFeedbackViewMode('preview')}
                    className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                      feedbackViewMode === 'preview'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </button>
                  <button
                    onClick={() => setFeedbackViewMode('live')}
                    className={`px-3 py-1.5 text-sm flex items-center gap-1 border-l border-gray-300 dark:border-gray-600 rounded-r-lg ${
                      feedbackViewMode === 'live'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Split className="h-3 w-3" />
                    Split View
                  </button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFeedbackFullscreen(false)}
                >
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </Button>
              </div>
            </div>
          </div>
          
          {/* Fullscreen Content */}
          <div className="flex-1 overflow-hidden p-6">
            <div data-color-mode={colorMode} className="h-full">
              <MDEditor
                value={submission.feedback || ''}
                preview={feedbackViewMode}
                hideToolbar
                height="100%"
              />
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Instructor Feedback
          </h3>
          <button
            onClick={() => {
              setIsFeedbackFullscreen(true);
              setFeedbackViewMode('preview');
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="View fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="prose dark:prose-invert max-w-none prose-sm max-h-64 overflow-y-auto">
            <MarkdownViewer value={submission.feedback || ''} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen && !isTextFullscreen && !isFeedbackFullscreen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Submission Details
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {assignment?.title || 'Loading...'}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-2 space-y-6">
            {/* Student Information */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{submission.studentName}</p>
                    <p className="text-sm text-muted-foreground">ID: {submission.studentId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={getGradeStatus().color} className="mb-2 px-3 py-1">
                    {getGradeStatus().text}
                  </Badge>
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(submission.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Text Submissions */}
            {submission.textSubmission && submission.textSubmission.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Text Submission{submission.textSubmission.length > 1 ? 's' : ''}
                  <Badge variant="outline" className="ml-2">
                    {submission.textSubmission.length} response{submission.textSubmission.length > 1 ? 's' : ''}
                  </Badge>
                </h3>
                <div className="space-y-3">
                  {submission.textSubmission.map((text, index) => renderTextSubmission(text, index))}
                </div>
              </div>
            )}

            {/* Links */}
            {submission.link && submission.link.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  Submitted Links
                  <Badge variant="outline" className="ml-2">
                    {submission.link.length} link{submission.link.length > 1 ? 's' : ''}
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {submission.link.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors"
                    >
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 flex-1 truncate"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        {link}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link, '_blank')}
                        className="ml-2"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Attachments */}
            {submission.submissionFiles && submission.submissionFiles.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  File Attachments
                  <Badge variant="outline" className="ml-2">
                    {submission.submissionFiles.length} file{submission.submissionFiles.length > 1 ? 's' : ''}
                  </Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {submission.submissionFiles.map((fileUrl, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Attachment {index + 1}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(fileUrl, '_blank')}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = fileUrl;
                            link.download = `attachment_${index + 1}`;
                            link.click();
                          }}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Section */}
            {submission.feedback && (
              <>
                <Separator />
                {renderFeedback()}
              </>
            )}

            {/* Empty State */}
            {!submission.textSubmission?.length && 
             !submission.link?.length && 
             !submission.submissionFiles?.length && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No submission content available</p>
                <p className="text-sm mt-1">The student hasn't submitted any content yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Render fullscreen views outside the dialog */}
      {isTextFullscreen && submission.textSubmission && submission.textSubmission[selectedTextIndex] && 
        renderTextSubmission(submission.textSubmission[selectedTextIndex], selectedTextIndex)}
      
      {isFeedbackFullscreen && submission.feedback && renderFeedback()}
    </>
  );
};

export default ViewSubmissionModal;
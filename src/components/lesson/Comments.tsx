import React, { useState, useEffect, useRef } from 'react';
import { commentService } from '@/services/commentService';
import { Comment } from '@/types/comment';
import { useAuth } from '@/contexts/AuthContext';
import { PaginatedResult } from '@/utils/pagination';
import { COMMENT_STATUS, USER_ROLE } from '@/constants';
import { formatDateTime } from '@/utils/date-time';
import { WhereFilterOp } from 'firebase-admin/firestore';
import { Button } from '../ui/button';
import { ChevronUp, Loader2, MessageCircle, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

interface CommentsProps {
  lessonId: string;
  courseId: string;
  lessonName: string;
  courseName: string;
};

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
  showReplies?: boolean;
  loadingReplies?: boolean;
  isUpvoted?: boolean;
};

// Simple reply form component
const ReplyForm: React.FC<{
  onSubmit: (content: string) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}> = ({ onSubmit, onCancel, submitting }) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      await onSubmit(content.trim());
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 ml-8">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your reply..."
        rows={3}
        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background"
        required
      />
      <div className="flex justify-end space-x-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Posting...' : 'Post Reply'}
        </button>
      </div>
    </form>
  );
};

// Comment thread component with toggle upvote
const CommentThread: React.FC<{
  comment: CommentWithReplies;
  depth?: number;
  onToggleUpvote: (commentId: string) => Promise<void>;
  onLoadReplies: (commentId: string) => Promise<void>;
  onToggleReplies: (commentId: string, show: boolean) => void;
  onSetLoadingReplies: (commentId: string, loading: boolean) => void;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  onApprove: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  currentUser: any;
}> = ({
  comment,
  depth = 0,
  onToggleUpvote,
  onLoadReplies,
  onToggleReplies,
  onSetLoadingReplies,
  onReply,
  onApprove,
  onDelete,
  currentUser
}) => {
    const { user } = useAuth();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [submittingReply, setSubmittingReply] = useState(false);
    const [upvoting, setUpvoting] = useState(false);

    const showReplies = comment.showReplies || false;
    const loadingReplies = comment.loadingReplies || false;
    const hasReplies = comment.countReplies > 0;
    const isUpvoted = comment.isUpvoted || false;

    const toggleReplies = async () => {
      if (!showReplies) {
        onSetLoadingReplies(comment.id, true);

        if (!comment.replies || comment.replies.length === 0) {
          await onLoadReplies(comment.id);
        }

        onSetLoadingReplies(comment.id, false);
        onToggleReplies(comment.id, true);
      } else {
        onToggleReplies(comment.id, false);
      }
    };

    const handleToggleUpvote = async () => {
      if (!currentUser || upvoting) return;

      setUpvoting(true);
      try {
        await onToggleUpvote(comment.id);
      } catch (error) {
        // Error handled in parent
      } finally {
        setUpvoting(false);
      }
    };

    const handleSubmitReply = async (content: string) => {
      setSubmittingReply(true);
      try {
        await onReply(comment.id, content);
        setShowReplyForm(false);
        if (!showReplies) {
          onToggleReplies(comment.id, true);
        }
      } catch (error) {
        // Error handled in parent
      } finally {
        setSubmittingReply(false);
      }
    };

    return (
      <div className={`comment-thread ${depth > 0 ? 'ml-8 border-l-2 border-border pl-4' : ''}`}>
        <div className="comment bg-card rounded-lg p-4 shadow-sm mb-4 border">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                {comment.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{comment.userName}</h4>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(comment.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleUpvote}
                disabled={upvoting || !currentUser}
                className={`flex items-center space-x-1 transition-colors ${isUpvoted
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isUpvoted ? 'Remove upvote' : 'Upvote'}
              >
                {upvoting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
                <span className="text-sm">{comment.upvoteCount || 0}</span>
              </button>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>

          <div className="mt-3 flex items-center justify-between space-x-4 text-sm">
            <div className="flex items-center space-x-4">
              {currentUser && depth < 3 && (
                <button
                  onClick={() => setShowReplyForm(true)}
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Reply
                </button>
              )}

              {hasReplies && (
                <button
                  onClick={toggleReplies}
                  disabled={loadingReplies}
                  className="text-muted-foreground hover:text-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingReplies ? (
                    'Loading replies...'
                  ) : (
                    `${showReplies ? 'Hide' : 'Show'} ${comment.countReplies} ${comment.countReplies === 1 ? 'reply' : 'replies'}`
                  )}
                </button>
              )}
            </div>
            {user && user.role === USER_ROLE.ADMIN && (
              <div className="flex items-center space-x-2">
                {comment.status === COMMENT_STATUS.PENDING && (
                  <Button
                    className="text-xs text-green-600 font-medium py-2 border border-green-600/50 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={async () => await onApprove(comment.id)}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    Approve
                  </Button>
                )}
                <Trash2
                  // variant="outline"
                  className="text-xs text-red-600 font-medium border rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this comment?')) {
                      await onDelete(comment.id);
                    }
                  }}
                />
                {/* <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button> */}
              </div>
            )}
          </div>

          {showReplyForm && currentUser && (
            <ReplyForm
              onSubmit={handleSubmitReply}
              onCancel={() => setShowReplyForm(false)}
              submitting={submittingReply}
            />
          )}

          {loadingReplies && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}

          {showReplies && !loadingReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  onToggleUpvote={onToggleUpvote}
                  onLoadReplies={onLoadReplies}
                  onToggleReplies={onToggleReplies}
                  onSetLoadingReplies={onSetLoadingReplies}
                  onApprove={onApprove}
                  onDelete={onDelete}
                  onReply={onReply}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}

          {showReplies && !loadingReplies && comment.replies && comment.replies.length === 0 && (
            <div className="mt-4 text-center text-muted-foreground text-sm">
              No replies yet
            </div>
          )}
        </div>
      </div>
    );
  };

const Comments: React.FC<CommentsProps> = ({ lessonId, courseId, lessonName, courseName }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Omit<PaginatedResult<Comment>, 'data'> | null>(null);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load user's upvotes for this lesson
  const loadUserUpvotes = async () => {
    if (!user || !lessonId) {
      setUserUpvotes(new Set());
      return;
    }

    try {
      const upvoteResult = await commentService.getLessonUpvoteByUser(lessonId, user.id);
      if (upvoteResult.success) {
        const upvotedCommentIds = new Set(upvoteResult.data.map(vote => vote.commentId));
        setUserUpvotes(upvotedCommentIds);
      }
    } catch (error) {
      console.error('Failed to load user upvotes:', error);
    }
  };

  // Simple comment map for quick updates
  const updateCommentState = (commentId: string, updates: Partial<CommentWithReplies>) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, ...updates };
      }

      // Check replies recursively
      const updateReplies = (replies: CommentWithReplies[]): CommentWithReplies[] => {
        return replies.map(reply => {
          if (reply.id === commentId) {
            return { ...reply, ...updates };
          }
          if (reply.replies) {
            return { ...reply, replies: updateReplies(reply.replies) };
          }
          return reply;
        });
      };

      if (comment.replies) {
        return { ...comment, replies: updateReplies(comment.replies) };
      }

      return comment;
    }));
  };

  // Load top-level comments with upvote status
  const loadComments = async () => {
    if (!lessonId || hasLoaded) return;

    setLoading(true);
    setError(null);

    try {
      // Load user upvotes first
      await loadUserUpvotes();
      const filters: {
        field: keyof Comment;
        op: WhereFilterOp;
        value: any;
      }[] = [
          { field: "lessonId", op: "==", value: lessonId },
          { field: "parentCommentId", op: "==", value: null },
          { field: "userId", op: "!=", value: user?.id || "none" },
        ]
      if (user && user.role !== USER_ROLE.ADMIN) {
        filters.push({ field: "status", op: "==", value: COMMENT_STATUS.APPROVED });
      }
      const [approvedResult, userCommentResult] = await Promise.all([
        commentService.getComments(filters, {
          limit: 15,
          orderBy: { field: 'createdAt', direction: 'desc' }
        }),
        commentService.getComments([
          { field: "lessonId", op: "==", value: lessonId },
          { field: "parentCommentId", op: "==", value: null },
          { field: "userId", op: "==", value: user.id },
        ], {
          limit: 10,
          orderBy: { field: 'createdAt', direction: 'desc' }
        })
      ]);

      let allComments: CommentWithReplies[] = [];

      if (userCommentResult.success && userCommentResult.data.data) {
        allComments = [...userCommentResult.data.data];
      }

      if (approvedResult.success && approvedResult.data.data) {
        allComments = [...allComments, ...approvedResult.data.data];
      }

      const uniqueComments = allComments.filter((comment, index, array) =>
        array.findIndex(c => c.id === comment.id) === index
      );

      uniqueComments.sort((a, b) =>
        new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()
      );

      // Add upvote status to comments
      const finalComments = uniqueComments.slice(0, 20).map(comment => ({
        ...comment,
        replies: [],
        showReplies: false,
        loadingReplies: false,
        isUpvoted: userUpvotes.has(comment.id)
      }));

      setComments(finalComments);
      setHasLoaded(true);

      if (approvedResult.success) {
        const { data, ...paginationData } = approvedResult.data;
        setPagination(paginationData);
      }

    } catch (err) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load replies for a comment
  const loadReplies = async (commentId: string) => {
    try {
      const result = await commentService.getCommentReplies(user, commentId, {
        limit: 50,
        orderBy: { field: 'createdAt', direction: 'asc' }
      });

      if (result.success) {
        const repliesWithDefaults = result.data.data.map(reply => ({
          ...reply,
          replies: [],
          showReplies: false,
          loadingReplies: false,
          isUpvoted: userUpvotes.has(reply.id)
        }));

        updateCommentState(commentId, { replies: repliesWithDefaults });
      }
    } catch (err) {
      console.error('Failed to load replies:', err);
      updateCommentState(commentId, { loadingReplies: false });
    }
  };

  // Toggle replies visibility
  const toggleReplies = (commentId: string, show: boolean) => {
    updateCommentState(commentId, { showReplies: show });
  };

  // Set loading state for replies
  const setLoadingReplies = (commentId: string, loading: boolean) => {
    updateCommentState(commentId, { loadingReplies: loading });
  };

  // Toggle upvote for a comment
  const handleToggleUpvote = async (commentId: string) => {
    if (!user) {
      setError('Please sign in to upvote comments');
      return;
    }

    try {
      const result = await commentService.toggleUpvote(commentId, user.id);

      if (result.success) {
        const { upvoted, newUpvoteCount } = result.data;

        // Update user upvotes set
        setUserUpvotes(prev => {
          const newSet = new Set(prev);
          if (upvoted) {
            newSet.add(commentId);
          } else {
            newSet.delete(commentId);
          }
          return newSet;
        });

        // Update comment state
        updateCommentState(commentId, {
          upvoteCount: newUpvoteCount,
          isUpvoted: upvoted
        });
      } else {
        setError(result.error?.message || 'Failed to toggle upvote');
      }
    } catch (err) {
      setError('Failed to toggle upvote');
      console.error('Error toggling upvote:', err);
    }
  };

  // Submit a reply
  const handleSubmitReply = async (parentCommentId: string, content: string) => {
    if (!user) return;

    setSubmittingReply(true);
    setError(null);

    try {
      const result = await commentService.createComment(user, {
        lessonId,
        lessonName,
        courseId,
        courseName,
        userId: user.id,
        userName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Anonymous',
        content: content.trim(),
        parentCommentId
      });

      if (result.success) {
        // Increment reply count immediately for better UX
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment) {
          updateCommentState(parentCommentId, {
            countReplies: (parentComment.countReplies || 0) + 1
          });
        }

        // Reload replies to include the new one
        await loadReplies(parentCommentId);
      } else {
        setError(result.error?.message || 'Failed to submit reply');
      }
    } catch (err) {
      setError('Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Submit a new comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmittingComment(true);
    setError(null);

    try {
      const result = await commentService.createComment(user, {
        lessonId,
        lessonName,
        courseId,
        courseName,
        userId: user.id,
        userName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Anonymous',
        content: newComment.trim(),
        parentCommentId: null
      });

      if (result.success) {
        setNewComment('');
        setHasLoaded(false);
        await loadComments();
      } else {
        setError(result.error?.message || 'Failed to submit comment');
      }
    } catch (err) {
      setError('Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleApprove = async (commentId: string) => {
    if (!user || user.role !== USER_ROLE.ADMIN) return;

    try {
      await commentService.approveComment(commentId);
      updateCommentState(commentId, { status: COMMENT_STATUS.APPROVED });
    } catch (error) {
      console.error('Failed to approve comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user || user.role !== USER_ROLE.ADMIN) return;

    try {
      const result = await commentService.deleteComment(commentId);
      if (result.success) {
        // Remove the comment from the state
        setComments(prev => prev.filter(comment => comment.id !== commentId));

        // If it's a reply, we need to remove it from parent's replies
        setComments(prev => prev.map(comment => {
          if (comment.replies) {
            const removeReplyRecursive = (replies: CommentWithReplies[]): CommentWithReplies[] => {
              return replies
                .filter(reply => reply.id !== commentId)
                .map(reply => ({
                  ...reply,
                  replies: reply.replies ? removeReplyRecursive(reply.replies) : []
                }));
            };
            return {
              ...comment,
              replies: removeReplyRecursive(comment.replies),
              countReplies: Math.max(0, (comment.countReplies || 0) - 1)
            };
          }
          return comment;
        }));
      } else {
        setError(result.error?.message || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      setError('Failed to delete comment');
    }
  };

  // Load comments and upvotes on mount and when lessonId changes
  useEffect(() => {
    if (lessonId && !hasLoaded) {
      loadComments();
    }
  }, [lessonId, hasLoaded]);

  // Reset when lessonId changes
  useEffect(() => {
    setHasLoaded(false);
    setComments([]);
    setUserUpvotes(new Set());
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userName = user ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Anonymous' : '';

  return (
    <div className="comments-section max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Comments</h2>
        <div className="text-sm text-muted-foreground">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-destructive mr-2" />
            <span className="text-destructive-foreground">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-destructive hover:text-destructive/80"
          >
            Dismiss
          </button>
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts about this lesson..."
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background"
              required
            />
            <div className="flex justify-between items-center mt-3">
              <div className="text-sm text-muted-foreground">
                Commenting as <span className="font-semibold text-foreground">{userName}</span>
              </div>
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-secondary/50 border border-border rounded-lg text-center">
          <p className="text-foreground">Please sign in to leave a comment.</p>
        </div>
      )}

      <div className="space-y-6">
        {comments.length === 0 && !loading ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No comments yet</h3>
            <p className="text-muted-foreground">Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onToggleUpvote={handleToggleUpvote}
              onLoadReplies={loadReplies}
              onToggleReplies={toggleReplies}
              onSetLoadingReplies={setLoadingReplies}
              onReply={handleSubmitReply}
              onApprove={handleApprove}
              onDelete={handleDelete}
              currentUser={user}
            />
          ))
        )}
      </div>

      {pagination?.hasNextPage && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => {
              // Implement load more
            }}
            className="px-6 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-secondary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Load More Comments
          </button>
        </div>
      )}
    </div>
  );
};

export default Comments;

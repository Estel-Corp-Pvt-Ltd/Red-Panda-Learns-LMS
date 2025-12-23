import React, { useState, useEffect, useRef } from 'react';
import { commentService } from '@/services/commentService';
import { Comment } from '@/types/comment';
import { useAuth } from '@/contexts/AuthContext';
import { PaginatedResult } from '@/utils/pagination';
import { COMMENT_STATUS } from '@/constants';
import { formatDateTime } from '@/utils/date-time';

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
  currentUser: any;
}> = ({
  comment,
  depth = 0,
  onToggleUpvote,
  onLoadReplies,
  onToggleReplies,
  onSetLoadingReplies,
  onReply,
  currentUser
}) => {
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill={isUpvoted ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
                <span className="text-sm">{comment.upvoteCount || 0}</span>
              </button>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>

          <div className="mt-3 flex items-center space-x-4 text-sm">
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

      const [approvedResult, userCommentResult] = await Promise.all([
        commentService.getComments([
          { field: "lessonId", op: "==", value: lessonId },
          { field: "parentCommentId", op: "==", value: null },
          { field: "status", op: "==", value: COMMENT_STATUS.APPROVED },
          { field: "userId", op: "!=", value: user?.id || "none" },
        ], {
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
      const result = await commentService.getCommentReplies(user.id, commentId, {
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
      const result = await commentService.createComment({
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
      const result = await commentService.createComment({
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
            <svg className="w-5 h-5 text-destructive mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
            <svg className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
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

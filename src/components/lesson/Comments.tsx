import React, { useState, useEffect, useCallback, useRef } from 'react';
import { commentService } from '@/services/commentService';
import { Comment } from '@/types/comment';
import { useAuth } from '@/contexts/AuthContext';
import { PaginatedResult } from '@/utils/pagination';
import { COMMENT_STATUS } from '@/constants';

interface CommentsProps {
  lessonId: string;
}

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
  showReplies?: boolean; // Add this to persist showReplies state
}

// Separate component for reply form to prevent re-renders
const ReplyForm: React.FC<{
  onSubmit: (content: string) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  initialContent?: string;
}> = React.memo(({ onSubmit, onCancel, submitting, initialContent = '' }) => {
  const [content, setContent] = useState(initialContent);
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
});

// Memoized comment thread component
const CommentThread: React.FC<{
  comment: CommentWithReplies;
  depth?: number;
  onUpvote: (commentId: string) => void;
  onLoadReplies: (commentId: string) => void;
  onToggleReplies: (commentId: string, show: boolean) => void;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  currentUser: any;
}> = React.memo(({
  comment,
  depth = 0,
  onUpvote,
  onLoadReplies,
  onToggleReplies,
  onReply,
  currentUser
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Use the showReplies from comment prop to persist state
  const showReplies = comment.showReplies || false;

  const toggleReplies = () => {
    if (!showReplies && (!comment.replies || comment.replies.length === 0)) {
      onLoadReplies(comment.id);
    }
    onToggleReplies(comment.id, !showReplies);
  };

  const handleSubmitReply = async (content: string) => {
    setSubmittingReply(true);
    try {
      await onReply(comment.id, content);
      setShowReplyForm(false);
      // Ensure replies stay visible after submitting
      if (!showReplies) {
        onToggleReplies(comment.id, true);
      }
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCancelReply = () => {
    setShowReplyForm(false);
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
                {/* {formatDate(new Date(comment.createdAt))} */}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onUpvote(comment.id)}
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors"
              title="Upvote"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span className="text-sm">{comment.upvoteCount}</span>
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

          {comment.countReplies > 0 && (
            <button
              onClick={toggleReplies}
              className="text-muted-foreground hover:text-foreground font-medium"
            >
              {showReplies ? 'Hide' : 'Show'} {comment.countReplies} {comment.countReplies === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && currentUser && (
          <ReplyForm
            onSubmit={handleSubmitReply}
            onCancel={handleCancelReply}
            submitting={submittingReply}
          />
        )}

        {/* Nested replies */}
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {comment.replies.map((reply) => (
              <CommentThread
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                onUpvote={onUpvote}
                onLoadReplies={onLoadReplies}
                onToggleReplies={onToggleReplies}
                onReply={onReply}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const Comments: React.FC<CommentsProps> = ({ lessonId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Omit<PaginatedResult<Comment>, 'data'> | null>(null);

  // Load top-level comments

  const loadComments = useCallback(async () => {
    if (!lessonId) return;

    setLoading(true);
    setError(null);

    try {
      // Query 1: All approved comments from OTHER users
      const approvedFilters = [
        { field: "lessonId", op: "==", value: lessonId },
        { field: "parentCommentId", op: "==", value: null },
        { field: "status", op: "==", value: COMMENT_STATUS.APPROVED },
        { field: "userId", op: "!=", value: user?.id || "none" }, // Handle case when user is null
      ];

      // Query 2: Current user's comments (if logged in) - ALL statuses
      const userFilters = user ? [
        { field: "lessonId", op: "==", value: lessonId },
        { field: "parentCommentId", op: "==", value: null },
        { field: "userId", op: "==", value: user.id },
        // Remove status filter to get ALL of user's comments (pending, approved, etc.)
      ] : null;

      // Execute both queries in parallel
      const [approvedResult, userResult] = await Promise.all([
        commentService.getComments(approvedFilters, {
          limit: 15, // Reserve some space for user's comments
          orderBy: { field: 'createdAt', direction: 'desc' }
        }),
        userFilters ? commentService.getComments(userFilters, {
          limit: 10, // Reserve some space for approved comments
          orderBy: { field: 'createdAt', direction: 'desc' }
        }) : Promise.resolve({ success: true, data: { data: [] } } as any)
      ]);

      let allComments = [];

      // Handle user's comments
      if (userResult.success && userResult.data.data) {
        allComments = [...userResult.data.data];
      }

      // Handle approved comments from other users
      if (approvedResult.success && approvedResult.data.data) {
        allComments = [...allComments, ...approvedResult.data.data];
      }

      // Remove duplicates (in case user has approved comments that also appear in the approved query)
      const uniqueComments = allComments.filter((comment, index, array) =>
        array.findIndex(c => c.id === comment.id) === index
      );

      // Sort by creation date (newest first)
      uniqueComments.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Limit to 20 comments total
      const finalComments = uniqueComments.slice(0, 20);

      setComments(finalComments);

      // Set pagination (use the approved result's pagination as base)
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
  }, [lessonId, user]);

  // Recursive function to find and update a comment in the tree
  const updateCommentInTree = useCallback((
    comments: CommentWithReplies[],
    targetId: string,
    updateFn: (comment: CommentWithReplies) => CommentWithReplies
  ): CommentWithReplies[] => {
    return comments.map(comment => {
      if (comment.id === targetId) {
        return updateFn(comment);
      }

      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, targetId, updateFn)
        };
      }

      return comment;
    });
  }, []);

  // Load replies for a specific comment
  const loadReplies = useCallback(async (commentId: string) => {
    try {
      const result = await commentService.getCommentReplies(commentId, {
        limit: 50,
        orderBy: { field: 'createdAt', direction: 'asc' }
      });

      if (result.success) {
        setComments(prev =>
          updateCommentInTree(prev, commentId, (comment) => ({
            ...comment,
            replies: result.data.data
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load replies:', err);
    }
  }, [updateCommentInTree]);

  // Toggle replies visibility for a comment
  const toggleReplies = useCallback((commentId: string, show: boolean) => {
    setComments(prev =>
      updateCommentInTree(prev, commentId, (comment) => ({
        ...comment,
        showReplies: show
      }))
    );
  }, [updateCommentInTree]);

  // Submit a new top-level comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmittingComment(true);
    setError(null);

    try {
      const result = await commentService.createComment({
        lessonId,
        userId: user.id,
        userName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Anonymous',
        content: newComment.trim(),
        parentCommentId: null
      });

      if (result.success) {
        setNewComment('');
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

  // Submit a reply
  const handleSubmitReply = useCallback(async (parentCommentId: string, content: string) => {
    if (!user) return;

    setSubmittingReply(true);
    setError(null);

    try {
      const result = await commentService.createComment({
        lessonId,
        userId: user.id,
        userName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Anonymous',
        content: content.trim(),
        parentCommentId
      });

      if (result.success) {
        // Reload replies for the parent comment to show the new reply
        await loadReplies(parentCommentId);
      } else {
        setError(result.error?.message || 'Failed to submit reply');
      }
    } catch (err) {
      setError('Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
  }, [user, lessonId, loadReplies]);

  // Upvote a comment
  const handleUpvote = useCallback(async (commentId: string) => {
    if (!user) {
      setError('Please sign in to upvote comments');
      return;
    }

    try {
      const result = await commentService.upvoteComment(commentId, user.id);
      if (result.success) {
        setComments(prev =>
          updateCommentInTree(prev, commentId, (comment) => ({
            ...comment,
            upvoteCount: comment.upvoteCount + 1
          }))
        );
      } else {
        setError(result.error?.message || 'Failed to upvote comment');
      }
    } catch (err) {
      setError('Failed to upvote comment');
    }
  }, [user, updateCommentInTree]);

  // Load comments on component mount
  useEffect(() => {
    loadComments();
  }, [loadComments]);

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Comments</h2>
        <div className="text-sm text-muted-foreground">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-destructive mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-destructive-foreground">{error}</span>
          </div>
        </div>
      )}

      {/* Comment form */}
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
          <p className="text-foreground">
            Please sign in to leave a comment.
          </p>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-6">
        {comments.length === 0 ? (
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
              onUpvote={handleUpvote}
              onLoadReplies={loadReplies}
              onToggleReplies={toggleReplies}
              onReply={handleSubmitReply}
              currentUser={user}
            />
          ))
        )}
      </div>

      {/* Load more button */}
      {pagination?.hasNextPage && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => {
              // Implement load more functionality
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

export default React.memo(Comments);

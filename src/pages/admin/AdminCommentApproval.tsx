import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { commentService } from '@/services/commentService';
import { Comment } from '@/types/comment';
import { PaginatedResult } from '@/utils/pagination';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { WhereFilterOp } from 'firebase/firestore';

const AdminCommentApproval: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'deleted'>('pending');
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Load comments
  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedComments(new Set());

    try {
      const filters: {
        field: keyof Comment;
        op: WhereFilterOp;
        value: any;
      }[] = [
          { field: 'status', op: '==', value: selectedTab.toUpperCase() as Comment['status'] }
        ];

      const result = await commentService.getComments(filters, {
        limit: 50,
        orderBy: { field: 'createdAt', direction: 'desc' }
      });

      if (result.success) {
        setComments(result.data.data);
      } else {
        setError(result.error?.message || 'Failed to load comments');
      }
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [selectedTab]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Filter comments
  const filteredComments = useMemo(() => {
    if (!searchTerm.trim()) return comments;
    const searchLower = searchTerm.toLowerCase();
    return comments.filter(comment =>
      comment.content.toLowerCase().includes(searchLower) ||
      comment.userName.toLowerCase().includes(searchLower)
    );
  }, [comments, searchTerm]);

  // Actions
  const handleApproveComment = async (commentId: string) => {
    try {
      const result = await commentService.approveComment(commentId);
      if (result.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      } else {
        setError(result.error?.message || 'Failed to approve comment');
      }
    } catch (err) {
      setError('Failed to approve comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const result = await commentService.deleteComment(commentId);
      if (result.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      } else {
        setError(result.error?.message || 'Failed to delete comment');
      }
    } catch (err) {
      setError('Failed to delete comment');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedComments.size === 0) return;
    setLoading(true);
    try {
      const promises = Array.from(selectedComments).map(commentId =>
        commentService.approveComment(commentId)
      );
      await Promise.all(promises);
      setComments(prev => prev.filter(comment => !selectedComments.has(comment.id)));
      setSelectedComments(new Set());
    } catch (err) {
      setError('Failed to approve comments');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedComments.size === 0) return;
    setLoading(true);
    try {
      const promises = Array.from(selectedComments).map(commentId =>
        commentService.deleteComment(commentId)
      );
      await Promise.all(promises);
      setComments(prev => prev.filter(comment => !selectedComments.has(comment.id)));
      setSelectedComments(new Set());
    } catch (err) {
      setError('Failed to delete comments');
    } finally {
      setLoading(false);
    }
  };

  // Selection
  const toggleCommentSelection = (commentId: string) => {
    setSelectedComments(prev => {
      const newSet = new Set(prev);
      newSet.has(commentId) ? newSet.delete(commentId) : newSet.add(commentId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    setSelectedComments(prev =>
      prev.size === filteredComments.length ? new Set() : new Set(filteredComments.map(c => c.id))
    );
  };

  // Stats
  const [stats, setStats] = useState({ pending: 0, approved: 0, deleted: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [pending, approved, deleted] = await Promise.all([
          commentService.getComments([{ field: 'status', op: '==', value: 'PENDING' }], { limit: 1 }),
          commentService.getComments([{ field: 'status', op: '==', value: 'APPROVED' }], { limit: 1 }),
          commentService.getComments([{ field: 'status', op: '==', value: 'DELETED' }], { limit: 1 })
        ]);
        setStats({
          pending: pending.success ? pending.data.totalCount : 0,
          approved: approved.success ? approved.data.totalCount : 0,
          deleted: deleted.success ? deleted.data.totalCount : 0,
        });
      } catch (err) {
        // Silent fail for stats
      }
    };
    loadStats();
  }, [comments]);

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  if (loading && comments.length === 0) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comment Moderation</h1>
          <p className="text-muted-foreground">Manage and moderate user comments</p>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-destructive">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className={`cursor-pointer transition-colors ${selectedTab === 'pending' ? 'border-primary bg-primary/5' : ''
              }`}
            onClick={() => setSelectedTab('pending')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Badge variant="secondary">{stats.pending}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${selectedTab === 'approved' ? 'border-green-500 bg-green-500/5' : ''
              }`}
            onClick={() => setSelectedTab('approved')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <Badge variant="secondary">{stats.approved}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${selectedTab === 'deleted' ? 'border-destructive bg-destructive/5' : ''
              }`}
            onClick={() => setSelectedTab('deleted')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deleted</CardTitle>
              <Badge variant="secondary">{stats.deleted}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.deleted}</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls Card */}
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
            <CardDescription>
              Manage {selectedTab} comments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Bulk Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex-1">
                <Input
                  placeholder="Search comments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {selectedComments.size > 0 && (
                <div className="flex gap-2">
                  {selectedTab === 'pending' && (
                    <Button onClick={handleBulkApprove} disabled={loading}>
                      Approve Selected ({selectedComments.size})
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleBulkDelete} disabled={loading}>
                    Delete Selected ({selectedComments.size})
                  </Button>
                </div>
              )}
            </div>

            {/* Comments Table */}
            {filteredComments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {selectedTab} comments found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedComments.size === filteredComments.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComments.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedComments.has(comment.id)}
                          onCheckedChange={() => toggleCommentSelection(comment.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{comment.userName}</div>
                          <div className="text-sm text-muted-foreground">
                            {comment.upvoteCount} upvotes • {comment.countReplies} replies
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="line-clamp-2">{comment.content}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {/* {formatDate(new Date(comment.createdAt))} */}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {selectedTab === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveComment(comment.id)}
                              className="h-8 px-2"
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="h-8 px-2"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCommentApproval;

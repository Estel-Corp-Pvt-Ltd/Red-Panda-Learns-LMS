import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { commentService } from '@/services/commentService';
import { courseService } from '@/services/courseService';
import { lessonService } from '@/services/lessonService';
import { Comment } from '@/types/comment';
import { Course } from '@/types/course';
import { Lesson } from '@/types/lesson';
import { formatDate } from '@/utils/date-time';
import { WhereFilterOp } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminCommentApproval: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'deleted'>('pending');
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Course and Lesson filters
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [courseFilter, setCourseFilter] = useState('all');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [courseOpen, setCourseOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);

  // Load courses and lessons on mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const coursesData = await courseService.getAllCourses();
        setCourses(coursesData);

        const lessonsData = await lessonService.getAllLessons();
        setAllLessons(lessonsData);
        setLessons(lessonsData);
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      }
    };

    loadDropdownData();
  }, []);

  // Filter lessons based on selected course
  useEffect(() => {
    if (courseFilter === 'all') {
      setLessons(allLessons);
    } else {
      const filteredLessons = allLessons.filter(
        (lesson) => lesson.courseId === courseFilter
      );
      setLessons(filteredLessons);

      // Reset lesson filter if current selection is not in filtered list
      if (lessonFilter !== 'all' &&
        !filteredLessons.some(l => l.id === lessonFilter)) {
        setLessonFilter('all');
      }
    }
  }, [courseFilter, allLessons, lessonFilter]);

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

      // Add course filter
      if (courseFilter !== 'all') {
        filters.push({ field: 'courseId', op: '==', value: courseFilter });
      }

      // Add lesson filter
      if (lessonFilter !== 'all') {
        filters.push({ field: 'lessonId', op: '==', value: lessonFilter });
      }

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
  }, [selectedTab, courseFilter, lessonFilter]);

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
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Course Combobox */}
              <Popover open={courseOpen} onOpenChange={setCourseOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={courseOpen}
                    className="w-full sm:w-[250px] justify-between"
                  >
                    <span className="truncate">
                      {courseFilter === 'all'
                        ? 'All Courses'
                        : courses.find((c) => c.id === courseFilter)?.title || 'Select course'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search courses..." />
                    <CommandList>
                      <CommandEmpty>No courses found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setCourseFilter('all');
                            setCourseOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              courseFilter === 'all' ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          All Courses
                        </CommandItem>
                        {courses.map((course) => (
                          <CommandItem
                            key={course.id}
                            value={course.id}
                            onSelect={(currentValue) => {
                              setCourseFilter(currentValue);
                              setCourseOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                courseFilter === course.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {course.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Lesson Combobox */}
              <Popover open={lessonOpen} onOpenChange={setLessonOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={lessonOpen}
                    className="w-full sm:w-[250px] justify-between"
                    disabled={lessons.length === 0}
                  >
                    <span className="truncate">
                      {lessonFilter === 'all'
                        ? 'All Lessons'
                        : lessons.find((l) => l.id === lessonFilter)?.title || 'Select lesson'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search lessons..." />
                    <CommandList>
                      <CommandEmpty>No lessons found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setLessonFilter('all');
                            setLessonOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              lessonFilter === 'all' ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          All Lessons
                        </CommandItem>
                        {lessons.map((lesson) => (
                          <CommandItem
                            key={lesson.id}
                            value={lesson.id}
                            onSelect={(currentValue) => {
                              setLessonFilter(currentValue);
                              setLessonOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                lessonFilter === lesson.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {lesson.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search comments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>

              {/* Clear Filters */}
              {(courseFilter !== 'all' || lessonFilter !== 'all' || searchTerm) && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setCourseFilter('all');
                  setLessonFilter('all');
                  setSearchTerm('');
                }}>
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex-1" />

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
                    <TableHead>Course</TableHead>
                    <TableHead>Lesson</TableHead>
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
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate">{comment?.courseName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate">{comment?.lessonName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="line-clamp-2">{comment.content}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Link to={`/courses/${comment.courseId}/lesson/${comment.lessonId}`}>
                            <Button size="sm" variant="ghost" className="h-8 px-2">
                              View Lesson
                            </Button>
                          </Link>
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

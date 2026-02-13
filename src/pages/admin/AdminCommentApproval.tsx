import AdminLayout from "@/components/AdminLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { commentService } from "@/services/commentService";
import { courseService } from "@/services/courseService";
import { lessonService } from "@/services/lessonService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Comment } from "@/types/comment";
import { Course } from "@/types/course";
import { Lesson } from "@/types/lesson";
import { formatDate } from "@/utils/date-time";
import { WhereFilterOp } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronsUpDown,
  Search,
  Keyboard,
  Info,
  Send,
  Loader2,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AdminCommentApproval: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"pending" | "approved" | "deleted">("pending");
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Panel selection state
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "delete";
    commentId: string;
  } | null>(null);

  // Course and Lesson filters
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [courseOpen, setCourseOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);

  // Refs
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const actionedIdRef = useRef<string | null>(null);
  const actionedIndexRef = useRef<number>(-1);

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
        console.error("Error loading dropdown data:", error);
      }
    };

    loadDropdownData();
  }, []);

  // Filter lessons based on selected course
  useEffect(() => {
    if (courseFilter === "all") {
      setLessons(allLessons);
    } else {
      const filteredLessons = allLessons.filter((lesson) => lesson.courseId === courseFilter);
      setLessons(filteredLessons);

      if (lessonFilter !== "all" && !filteredLessons.some((l) => l.id === lessonFilter)) {
        setLessonFilter("all");
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
      }[] = [{ field: "status", op: "==", value: selectedTab.toUpperCase() as Comment["status"] }];

      if (courseFilter !== "all") {
        filters.push({ field: "courseId", op: "==", value: courseFilter });
      }

      if (lessonFilter !== "all") {
        filters.push({ field: "lessonId", op: "==", value: lessonFilter });
      }

      const result = await commentService.getComments(filters, {
        limit: 50,
        orderBy: { field: "createdAt", direction: "desc" },
      });
      if (result.success) {
        setComments(result.data.data);
      } else {
        setError(result.error?.message || "Failed to load comments");
      }
    } catch (err) {
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [selectedTab, courseFilter, lessonFilter]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Lookup maps for course/lesson names
  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, c.title));
    return map;
  }, [courses]);

  const lessonMap = useMemo(() => {
    const map = new Map<string, string>();
    allLessons.forEach((l) => map.set(l.id, l.title));
    return map;
  }, [allLessons]);

  // Filter comments
  const filteredComments = useMemo(() => {
    if (!searchTerm.trim()) return comments;
    const searchLower = searchTerm.toLowerCase();
    return comments.filter(
      (comment) =>
        comment.content.toLowerCase().includes(searchLower) ||
        comment.userName.toLowerCase().includes(searchLower)
    );
  }, [comments, searchTerm]);

  // Load replies for selected comment
  const loadReplies = useCallback(
    async (commentId: string) => {
      if (!user) return;
      setRepliesLoading(true);
      try {
        const result = await commentService.getCommentReplies(user, commentId);
        if (result.success) {
          setReplies(result.data.data);
        } else {
          setReplies([]);
        }
      } catch {
        setReplies([]);
      } finally {
        setRepliesLoading(false);
      }
    },
    [user]
  );

  // Select comment by index
  const selectByIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= filteredComments.length) return;
      setSelectedIndex(index);
      setSelectedComment(filteredComments[index]);
      setReplyText("");
      loadReplies(filteredComments[index].id);
    },
    [filteredComments, loadReplies]
  );

  // Actions
  const handleApproveComment = async (commentId: string) => {
    try {
      const result = await commentService.approveComment(commentId);
      if (result.success) {
        toast({ title: "Comment approved" });
        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      } else {
        setError(result.error?.message || "Failed to approve comment");
      }
    } catch (err) {
      setError("Failed to approve comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const result = await commentService.deleteComment(commentId);
      if (result.success) {
        toast({ title: "Comment deleted" });
        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      } else {
        setError(result.error?.message || "Failed to delete comment");
      }
    } catch (err) {
      setError("Failed to delete comment");
    }
  };

  // Upvote handler
  const handleUpvote = async () => {
    if (!selectedComment || !user) return;
    try {
      const result = await commentService.toggleUpvote(selectedComment.id, user.id);
      if (result.success) {
        const { upvoted, newUpvoteCount } = result.data;
        toast({ title: upvoted ? "Upvoted" : "Upvote removed" });
        // Update the comment in local state
        setComments((prev) =>
          prev.map((c) => (c.id === selectedComment.id ? { ...c, upvoteCount: newUpvoteCount } : c))
        );
        setSelectedComment((prev) => (prev ? { ...prev, upvoteCount: newUpvoteCount } : prev));
      }
    } catch {
      toast({ title: "Failed to toggle upvote", variant: "destructive" });
    }
  };

  // Approve/delete with confirmation + auto-advance
  const requestApproveSelected = () => {
    if (!selectedComment) return;
    setConfirmAction({ type: "approve", commentId: selectedComment.id });
  };

  const requestDeleteSelected = () => {
    if (!selectedComment) return;
    setConfirmAction({ type: "delete", commentId: selectedComment.id });
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, commentId } = confirmAction;
    actionedIdRef.current = commentId;
    actionedIndexRef.current = selectedIndex;
    setConfirmAction(null);

    if (type === "approve") {
      await handleApproveComment(commentId);
    } else {
      await handleDeleteComment(commentId);
    }
  };

  // Auto-advance after action removes a comment from list
  useEffect(() => {
    if (!actionedIdRef.current) return;

    const actionedId = actionedIdRef.current;
    const actionedIdx = actionedIndexRef.current;
    actionedIdRef.current = null;
    actionedIndexRef.current = -1;

    const stillInList = filteredComments.some((c) => c.id === actionedId);
    let nextIdx = stillInList ? actionedIdx + 1 : actionedIdx;

    if (nextIdx >= filteredComments.length) {
      nextIdx = filteredComments.length - 1;
    }

    if (nextIdx >= 0 && filteredComments.length > 0) {
      setSelectedIndex(nextIdx);
      setSelectedComment(filteredComments[nextIdx]);
      setReplyText("");
      loadReplies(filteredComments[nextIdx].id);
      setTimeout(() => {
        const row = tableContainerRef.current?.querySelector(`[data-row-index="${nextIdx}"]`);
        row?.scrollIntoView({ block: "nearest" });
      }, 0);
    } else {
      setSelectedComment(null);
      setSelectedIndex(-1);
      setReplies([]);
    }
  }, [filteredComments]);

  // Reply handler
  const handleReply = useCallback(async () => {
    if (!selectedComment || !user || !replyText.trim() || replyLoading) return;
    setReplyLoading(true);
    try {
      const result = await commentService.createComment(user, {
        lessonId: selectedComment.lessonId,
        courseId: selectedComment.courseId,
        lessonName: courseMap.get(selectedComment.courseId) || "",
        courseName: lessonMap.get(selectedComment.lessonId) || "",
        parentCommentId: selectedComment.id,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        content: replyText.trim(),
      });
      if (result.success) {
        toast({ title: "Reply sent" });
        setReplyText("");
        loadReplies(selectedComment.id);
      } else {
        toast({ title: "Failed to send reply", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to send reply", variant: "destructive" });
    } finally {
      setReplyLoading(false);
    }
  }, [selectedComment, user, replyText, replyLoading, courseMap, lessonMap, loadReplies]);

  const handleBulkApprove = async () => {
    if (selectedComments.size === 0) return;
    setLoading(true);
    try {
      const promises = Array.from(selectedComments).map((commentId) =>
        commentService.approveComment(commentId)
      );
      await Promise.all(promises);
      setComments((prev) => prev.filter((comment) => !selectedComments.has(comment.id)));
      setSelectedComments(new Set());
    } catch (err) {
      setError("Failed to approve comments");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedComments.size === 0) return;
    setLoading(true);
    try {
      const promises = Array.from(selectedComments).map((commentId) =>
        commentService.deleteComment(commentId)
      );
      await Promise.all(promises);
      setComments((prev) => prev.filter((comment) => !selectedComments.has(comment.id)));
      setSelectedComments(new Set());
    } catch (err) {
      setError("Failed to delete comments");
    } finally {
      setLoading(false);
    }
  };

  // Checkbox selection
  const toggleCommentSelection = (commentId: string) => {
    setSelectedComments((prev) => {
      const newSet = new Set(prev);
      newSet.has(commentId) ? newSet.delete(commentId) : newSet.add(commentId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    setSelectedComments((prev) =>
      prev.size === filteredComments.length ? new Set() : new Set(filteredComments.map((c) => c.id))
    );
  };

  // Stats
  const [stats, setStats] = useState({ pending: 0, approved: 0, deleted: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [pending, approved, deleted] = await Promise.all([
          commentService.getComments([{ field: "status", op: "==", value: "PENDING" }], {
            limit: 1,
          }),
          commentService.getComments([{ field: "status", op: "==", value: "APPROVED" }], {
            limit: 1,
          }),
          commentService.getComments([{ field: "status", op: "==", value: "DELETED" }], {
            limit: 1,
          }),
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

  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // If confirm dialog is open, Enter confirms and Escape cancels
      if (confirmAction) {
        if (e.key === "Enter") {
          e.preventDefault();
          executeConfirmedAction();
        }
        // Escape is handled by AlertDialog's onOpenChange
        return;
      }

      // Escape: blur if typing, otherwise deselect
      if (e.key === "Escape") {
        if (isTyping) {
          (e.target as HTMLElement).blur();
        } else if (selectedComment) {
          setSelectedComment(null);
          setSelectedIndex(-1);
          setReplies([]);
          setReplyText("");
        }
        return;
      }

      // Don't intercept other keys while typing
      if (isTyping) return;

      switch (e.key) {
        case "/": {
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        }
        case "1": {
          e.preventDefault();
          setSelectedTab("pending");
          break;
        }
        case "2": {
          e.preventDefault();
          setSelectedTab("approved");
          break;
        }
        case "3": {
          e.preventDefault();
          setSelectedTab("deleted");
          break;
        }
        case "ArrowDown":
        case "j": {
          e.preventDefault();
          const next =
            selectedIndex < filteredComments.length - 1 ? selectedIndex + 1 : selectedIndex;
          if (selectedIndex === -1 && filteredComments.length > 0) {
            selectByIndex(0);
          } else {
            selectByIndex(next);
          }
          const row = tableContainerRef.current?.querySelector(
            `[data-row-index="${selectedIndex === -1 ? 0 : next}"]`
          );
          row?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "ArrowUp":
        case "k": {
          e.preventDefault();
          const prev = selectedIndex > 0 ? selectedIndex - 1 : selectedIndex;
          selectByIndex(prev);
          const row = tableContainerRef.current?.querySelector(`[data-row-index="${prev}"]`);
          row?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "a": {
          if (selectedComment && selectedTab === "pending") {
            e.preventDefault();
            requestApproveSelected();
          }
          break;
        }
        case "d": {
          if (selectedComment) {
            e.preventDefault();
            requestDeleteSelected();
          }
          break;
        }
        case "u": {
          if (selectedComment) {
            e.preventDefault();
            handleUpvote();
          }
          break;
        }
        case "v": {
          if (selectedComment) {
            e.preventDefault();
            navigate(`/courses/${selectedComment.courseId}/lesson/${selectedComment.lessonId}`);
          }
          break;
        }
        case "r": {
          if (selectedComment) {
            e.preventDefault();
            replyTextareaRef.current?.focus();
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIndex,
    selectedComment,
    filteredComments,
    selectByIndex,
    confirmAction,
    selectedTab,
    navigate,
  ]);

  // Re-sync selected comment after comments list changes
  useEffect(() => {
    if (actionedIdRef.current) return; // auto-advance will handle this
    if (selectedComment) {
      const updated = filteredComments.find((c) => c.id === selectedComment.id);
      if (updated) {
        setSelectedComment(updated);
        setSelectedIndex(filteredComments.indexOf(updated));
      } else {
        setSelectedComment(null);
        setSelectedIndex(-1);
        setReplies([]);
        setReplyText("");
      }
    }
  }, [filteredComments]);

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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comment Moderation</h1>
            <p className="text-muted-foreground">Manage and moderate user comments</p>
          </div>

          {/* Shortcut help */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Keyboard shortcuts"
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 text-sm">
              <div className="flex items-center gap-2 mb-3 font-semibold">
                <Keyboard className="h-4 w-4" />
                Keyboard Shortcuts
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex justify-between">
                  <span>Search</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/</span>
                </li>
                <li className="flex justify-between">
                  <span>Navigate rows</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    ↑ / ↓ or j / k
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Pending / Approved / Deleted</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    1 / 2 / 3
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Approve comment</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">A</span>
                </li>
                <li className="flex justify-between">
                  <span>Delete comment</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">D</span>
                </li>
                <li className="flex justify-between">
                  <span>Upvote comment</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">U</span>
                </li>
                <li className="flex justify-between">
                  <span>View in lesson</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">V</span>
                </li>
                <li className="flex justify-between">
                  <span>Focus reply</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">R</span>
                </li>
                <li className="flex justify-between">
                  <span>Send reply</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    Ctrl + Enter
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Confirm action</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Enter</span>
                </li>
                <li className="flex justify-between">
                  <span>Deselect / Cancel / Blur</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Esc</span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
                Use arrow keys to select a comment. Detail panel and reply open automatically.
              </p>
            </PopoverContent>
          </Popover>
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
            className={`cursor-pointer transition-colors ${
              selectedTab === "pending" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelectedTab("pending")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Review <span className="font-mono text-xs text-muted-foreground">(1)</span>
              </CardTitle>
              <Badge variant="secondary">{stats.pending}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              selectedTab === "approved" ? "border-green-500 bg-green-500/5" : ""
            }`}
            onClick={() => setSelectedTab("approved")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Approved <span className="font-mono text-xs text-muted-foreground">(2)</span>
              </CardTitle>
              <Badge variant="secondary">{stats.approved}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              selectedTab === "deleted" ? "border-destructive bg-destructive/5" : ""
            }`}
            onClick={() => setSelectedTab("deleted")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Deleted <span className="font-mono text-xs text-muted-foreground">(3)</span>
              </CardTitle>
              <Badge variant="secondary">{stats.deleted}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.deleted}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main content: Table + Detail Panel */}
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
          {/* Left: Comment Table */}
          <ResizablePanel defaultSize={selectedComment ? 45 : 100} minSize={30}>
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Comments</CardTitle>
                    <CardDescription>Manage {selectedTab} comments</CardDescription>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-3 mt-3">
                  {/* Course Combobox */}
                  <Popover open={courseOpen} onOpenChange={setCourseOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={courseOpen}
                        className="w-full sm:w-[200px] justify-between"
                      >
                        <span className="truncate">
                          {courseFilter === "all"
                            ? "All Courses"
                            : courses.find((c) => c.id === courseFilter)?.title || "Select course"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full sm:w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search courses..." />
                        <CommandList>
                          <CommandEmpty>No courses found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setCourseFilter("all");
                                setCourseOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  courseFilter === "all" ? "opacity-100" : "opacity-0"
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
                                    "mr-2 h-4 w-4",
                                    courseFilter === course.id ? "opacity-100" : "opacity-0"
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
                        className="w-full sm:w-[200px] justify-between"
                        disabled={lessons.length === 0}
                      >
                        <span className="truncate">
                          {lessonFilter === "all"
                            ? "All Lessons"
                            : lessons.find((l) => l.id === lessonFilter)?.title || "Select lesson"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full sm:w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search lessons..." />
                        <CommandList>
                          <CommandEmpty>No lessons found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setLessonFilter("all");
                                setLessonOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  lessonFilter === "all" ? "opacity-100" : "opacity-0"
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
                                    "mr-2 h-4 w-4",
                                    lessonFilter === lesson.id ? "opacity-100" : "opacity-0"
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
                      ref={searchInputRef}
                      placeholder="Search comments... ( / )"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>

                  {/* Clear Filters */}
                  {(courseFilter !== "all" || lessonFilter !== "all" || searchTerm) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCourseFilter("all");
                        setLessonFilter("all");
                        setSearchTerm("");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-auto" ref={tableContainerRef}>
                {/* Bulk Actions */}
                {selectedComments.size > 0 && (
                  <div className="flex gap-2 mb-3">
                    {selectedTab === "pending" && (
                      <Button size="sm" onClick={handleBulkApprove} disabled={loading}>
                        Approve Selected ({selectedComments.size})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      disabled={loading}
                    >
                      Delete Selected ({selectedComments.size})
                    </Button>
                  </div>
                )}

                {filteredComments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {selectedTab} comments found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              filteredComments.length > 0 &&
                              selectedComments.size === filteredComments.length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Lesson</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead className="w-28">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComments.map((comment, idx) => (
                        <TableRow
                          key={comment.id}
                          data-row-index={idx}
                          className={`cursor-pointer transition-colors ${
                            selectedIndex === idx ? "bg-accent" : "hover:bg-muted/50"
                          }`}
                          onClick={() => selectByIndex(idx)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") selectByIndex(idx);
                          }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedComments.has(comment.id)}
                              onCheckedChange={() => toggleCommentSelection(comment.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{comment.userName}</div>
                              <div className="text-xs text-muted-foreground">
                                {comment.upvoteCount} upvotes
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[120px] hover:max-w-[300px] transition-all duration-300 ease-in-out overflow-hidden">
                              <p className="text-xs truncate">
                                {courseMap.get(comment.courseId) || "Unknown"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[120px] hover:max-w-[300px] transition-all duration-300 ease-in-out overflow-hidden">
                              <p className="text-xs truncate">
                                {lessonMap.get(comment.lessonId) || "Unknown"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm line-clamp-2 max-w-[200px]">{comment.content}</p>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(comment.createdAt)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </ResizablePanel>

          {/* Right: Detail + Reply Panel */}
          {selectedComment && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={55} minSize={30}>
                <div className="h-full flex flex-col overflow-hidden pl-2">
                  {/* Comment Detail */}
                  <Card className="flex-1 flex flex-col min-h-0">
                    <CardHeader className="pb-3 shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-lg">{selectedComment.userName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(selectedComment.createdAt)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            selectedComment.status === "APPROVED"
                              ? "default"
                              : selectedComment.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {selectedComment.status}
                        </Badge>
                      </div>

                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>{courseMap.get(selectedComment.courseId) || "Unknown Course"}</span>
                        <span>•</span>
                        <span>{lessonMap.get(selectedComment.lessonId) || "Unknown Lesson"}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-auto space-y-4 min-h-0">
                      {/* Original comment */}
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {selectedComment.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{selectedComment.upvoteCount} upvotes</span>
                        <span>•</span>
                        <span>{selectedComment.countReplies} replies</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={handleUpvote}>
                          <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                          Upvote <span className="ml-1 text-xs text-muted-foreground">(U)</span>
                        </Button>
                        <Link
                          to={`/courses/${selectedComment.courseId}/lesson/${selectedComment.lessonId}`}
                        >
                          <Button variant="outline" size="sm">
                            View in Lesson{" "}
                            <span className="ml-1 text-xs text-muted-foreground">(V)</span>
                          </Button>
                        </Link>
                        {selectedTab === "pending" && (
                          <Button size="sm" onClick={requestApproveSelected}>
                            Approve <span className="ml-1 text-xs text-white">(A)</span>
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={requestDeleteSelected}>
                          Delete{" "}
                          <span className="ml-1 text-xs text-destructive-foreground/70">(D)</span>
                        </Button>
                      </div>

                      {/* Replies section */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-3">Replies ({replies.length})</p>

                        {repliesLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : replies.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No replies yet</p>
                        ) : (
                          <div className="space-y-3">
                            {replies.map((reply) => (
                              <div key={reply.id} className="p-3 rounded-lg bg-muted/50 border">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">{reply.userName}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={
                                        reply.status === "APPROVED"
                                          ? "default"
                                          : reply.status === "PENDING"
                                            ? "secondary"
                                            : "destructive"
                                      }
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {reply.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(reply.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>

                    {/* Reply input - pinned to bottom */}
                    <div className="shrink-0 border-t p-4">
                      <div className="flex gap-2">
                        <Textarea
                          ref={replyTextareaRef}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply... (R to focus, Ctrl+Enter to send)"
                          className="min-h-[60px] max-h-[120px] resize-none flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleReply();
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={handleReply}
                          disabled={replyLoading || !replyText.trim()}
                          className="shrink-0 self-end"
                        >
                          {replyLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "approve" ? "Approve Comment" : "Delete Comment"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "approve"
                ? "Are you sure you want to approve this comment? It will become visible to all users."
                : "Are you sure you want to delete this comment? This action can be reversed from the Deleted tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel <span className="ml-1 text-xs text-muted-foreground">(Esc)</span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmedAction}
              className={
                confirmAction?.type === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {confirmAction?.type === "approve" ? "Approve" : "Delete"}{" "}
              <span className="ml-1 text-xs opacity-70">(Enter)</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminCommentApproval;

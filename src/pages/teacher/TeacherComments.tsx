import TeacherLayout from "@/components/TeacherLayout";
import { ClassDivisionFilter } from "@/components/teacher/ClassDivisionFilter";
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
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { commentService } from "@/services/commentService";
import { teacherService } from "@/services/teacherService";
import { Comment } from "@/types/comment";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  HelpCircle,
  Loader2,
  MessageSquareText,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "@/types/user";

type FilterTab = "all" | "pending" | "approved";

const TeacherComments = () => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const handleFilterChange = useCallback(
    (cls: string | null, div: string | null) => {
      setSelectedClass(cls);
      setSelectedDivision(div);
    },
    []
  );

  useEffect(() => {
    fetchComments();
  }, [user?.organizationId]);

  const fetchComments = async () => {
    if (!user?.organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [result, studentsResult] = await Promise.all([
        teacherService.getOrganizationComments(user.organizationId),
        teacherService.getAllOrganizationStudents(user.organizationId),
      ]);
      if (studentsResult.success && studentsResult.data) {
        setAllStudents(studentsResult.data);
      }
      if (result.success && result.data) {
        setComments(result.data);
      } else {
        toast({ title: "Error", description: "Failed to load comments", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      toast({ title: "Error", description: "Failed to load comments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveComment = async (commentId: string) => {
    setApprovingId(commentId);
    try {
      const result = await commentService.approveComment(commentId);
      if (result.success) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, status: "APPROVED" as Comment["status"] } : c))
        );
        toast({ title: "Approved", description: "Comment approved successfully!" });
      } else {
        toast({ title: "Error", description: "Failed to approve comment", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to approve comment:", error);
      toast({ title: "Error", description: "Failed to approve comment", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteClick = (comment: Comment) => {
    setSelectedComment(comment);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedComment) return;

    setDeleting(true);
    try {
      const result = await commentService.deleteComment(selectedComment.id);
      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== selectedComment.id));
        toast({ title: "Deleted", description: "Comment deleted successfully!" });
        setIsDeleteDialogOpen(false);
      } else {
        toast({ title: "Error", description: "Failed to delete comment", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast({ title: "Error", description: "Failed to delete comment", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    try {
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return date.toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Approved
          </Badge>
        );
      case "DELETED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Build a set of student IDs matching class/division filter
  const classFilteredStudentIds = useMemo(() => {
    if (!selectedClass && !selectedDivision) return null;
    return new Set(
      allStudents
        .filter((s) => {
          if (selectedClass && s.class !== selectedClass) return false;
          if (selectedDivision && s.division !== selectedDivision) return false;
          return true;
        })
        .map((s) => s.id)
    );
  }, [allStudents, selectedClass, selectedDivision]);

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      // Filter by class/division
      if (classFilteredStudentIds && !classFilteredStudentIds.has(comment.userId)) return false;

      // Filter by tab
      const matchesTab =
        filterTab === "all" ||
        (filterTab === "pending" && comment.status === "PENDING") ||
        (filterTab === "approved" && comment.status === "APPROVED");

      // Filter by search
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        comment.userName?.toLowerCase().includes(searchLower) ||
        comment.content?.toLowerCase().includes(searchLower);

      return matchesTab && matchesSearch;
    });
  }, [comments, filterTab, searchQuery, classFilteredStudentIds]);

  if (!user?.organizationId) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
          <h2 className="text-2xl font-bold">Not Assigned to an Organization</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Please contact your administrator to get assigned to an organization.
          </p>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Comments</h1>
              <p className="text-muted-foreground">
                Review and moderate comments from students in your organization
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>Review and moderate comments from students in your organization</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Class/Division Filter */}
        {user?.organizationId && (
          <ClassDivisionFilter
            organizationId={user.organizationId}
            onFilterChange={handleFilterChange}
            students={allStudents}
          />
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student or comment content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "approved"] as const).map((tab) => (
              <Button
                key={tab}
                variant={filterTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab(tab)}
                className="capitalize"
              >
                {tab === "all" ? "All" : tab === "pending" ? "Pending" : "Approved"}
              </Button>
            ))}
          </div>
        </div>

        {/* Comments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Comments</CardTitle>
            <CardDescription>
              {filteredComments.length} comment{filteredComments.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading comments...</span>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquareText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No comments found</p>
                <p className="text-sm mt-1">
                  {searchQuery || filterTab !== "all"
                    ? "Try adjusting your filters"
                    : "No comments from your organization students yet"}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Comment Content</TableHead>
                      <TableHead>Course / Lesson</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComments.map((comment) => (
                      <TableRow key={comment.id}>
                        <TableCell>
                          <p className="font-medium">{comment.userName}</p>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="line-clamp-2 text-sm">{comment.content}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium truncate max-w-[180px]">
                              {comment.courseName || "N/A"}
                            </p>
                            <p className="text-muted-foreground truncate max-w-[180px]">
                              {comment.lessonName || "N/A"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(comment.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {comment.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => handleApproveComment(comment.id)}
                                disabled={approvingId === comment.id}
                                title="Approve comment"
                              >
                                {approvingId === comment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(comment)}
                              title="Delete comment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Delete Comment
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this comment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TeacherLayout>
  );
};

export default TeacherComments;

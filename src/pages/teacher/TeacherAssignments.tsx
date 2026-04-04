import TeacherLayout from "@/components/TeacherLayout";
import { ClassDivisionFilter } from "@/components/teacher/ClassDivisionFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { assignmentService } from "@/services/assignmentService";
import { teacherService } from "@/services/teacherService";
import { AssignmentSubmission } from "@/types/assignment";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  NotepadText,
  Save,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { User } from "@/types/user";

const TeacherAssignments = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "graded" | "ungraded">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [gradeMarks, setGradeMarks] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [saving, setSaving] = useState(false);
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
    fetchSubmissions();
  }, [user?.organizationId]);

  const fetchSubmissions = async () => {
    if (!user?.organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [result, studentsResult] = await Promise.all([
        teacherService.getOrganizationSubmissions(user.organizationId),
        teacherService.getAllOrganizationStudents(user.organizationId),
      ]);
      if (studentsResult.success && studentsResult.data) {
        setAllStudents(studentsResult.data);
      }
      if (result.success && result.data) {
        setSubmissions(result.data);
      } else {
        toast({ title: "Error", description: "Failed to load submissions", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
      toast({ title: "Error", description: "Failed to load submissions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setGradeMarks(submission.marks !== undefined && submission.marks !== null ? String(submission.marks) : "");
    setGradeFeedback(submission.feedback || "");
    setIsDetailOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;

    const marks = gradeMarks.trim() !== "" ? Number(gradeMarks) : null;
    if (marks !== null && isNaN(marks)) {
      toast({ title: "Invalid marks", description: "Please enter a valid number", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await assignmentService.updateSubmission(selectedSubmission.id, {
        marks: marks,
        feedback: gradeFeedback.trim() || null,
      });

      if (result.success) {
        toast({ title: "Graded", description: "Submission graded successfully!" });
        // Update local state
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === selectedSubmission.id
              ? { ...s, marks: marks, feedback: gradeFeedback.trim() || null }
              : s
          )
        );
        setSelectedSubmission((prev) =>
          prev ? { ...prev, marks: marks, feedback: gradeFeedback.trim() || null } : prev
        );
      } else {
        toast({ title: "Error", description: "Failed to save grade", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to save grade:", error);
      toast({ title: "Error", description: "Failed to save grade", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Build a set of student IDs matching class/division filter
  const classFilteredStudentIds = (selectedClass || selectedDivision)
    ? new Set(
        allStudents
          .filter((s) => {
            if (selectedClass && s.class !== selectedClass) return false;
            if (selectedDivision && s.division !== selectedDivision) return false;
            return true;
          })
          .map((s) => s.id)
      )
    : null;

  const filteredSubmissions = submissions.filter((sub) => {
    if (classFilteredStudentIds && !classFilteredStudentIds.has(sub.studentId)) return false;

    const matchesSearch =
      sub.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.assignmentTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    const isGraded = sub.marks !== undefined && sub.marks !== null;
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "graded" && isGraded) ||
      (filterStatus === "ungraded" && !isGraded);

    return matchesSearch && matchesFilter;
  });

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
            <NotepadText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Assignments</h1>
              <p className="text-muted-foreground">
                Review and grade assignment submissions from your students
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
              <p>Click on a submission to view details, download attachments, and provide marks and feedback.</p>
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
              placeholder="Search by student or assignment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "ungraded", "graded"] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="capitalize"
              >
                {status === "all" ? "All" : status === "ungraded" ? "Ungraded" : "Graded"}
              </Button>
            ))}
          </div>
        </div>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading submissions...</span>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <NotepadText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No submissions found</p>
                <p className="text-sm mt-1">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "No assignment submissions from your students yet"}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => {
                      const isGraded =
                        submission.marks !== undefined && submission.marks !== null;
                      return (
                        <TableRow
                          key={submission.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openDetail(submission)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{submission.studentName}</p>
                              <p className="text-xs text-muted-foreground">
                                {submission.studentEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {submission.assignmentTitle || submission.assignmentId}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {submission.createdAt
                              ? new Date(submission.createdAt as any).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {isGraded ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                Graded
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit text-orange-600">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {isGraded ? submission.marks : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail / Grading Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submission Details
              </DialogTitle>
              <DialogDescription>
                Review the submission and provide marks and feedback
              </DialogDescription>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Student</p>
                    <p className="font-medium">{selectedSubmission.studentName}</p>
                    <p className="text-sm text-muted-foreground">{selectedSubmission.studentEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assignment</p>
                    <p className="font-medium">
                      {selectedSubmission.assignmentTitle || selectedSubmission.assignmentId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Submitted:{" "}
                      {selectedSubmission.createdAt
                        ? new Date(selectedSubmission.createdAt as any).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Text Submissions */}
                {selectedSubmission.textSubmissions && selectedSubmission.textSubmissions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Text Submission</Label>
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg border">
                      {selectedSubmission.textSubmissions.map((text: string, idx: number) => (
                        <p key={idx} className="text-sm whitespace-pre-wrap">{text}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Attachments */}
                {selectedSubmission.submissionFiles && selectedSubmission.submissionFiles.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Attachments</Label>
                    <div className="mt-2 space-y-2">
                      {selectedSubmission.submissionFiles.map((file: any, idx: number) => (
                        <a
                          key={idx}
                          href={file.url || file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <Download className="h-4 w-4 text-primary" />
                          <span className="text-sm">{file.name || `Attachment ${idx + 1}`}</span>
                          <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                {selectedSubmission.links && selectedSubmission.links.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Links</Label>
                    <div className="mt-2 space-y-2">
                      {selectedSubmission.links.map((link: string, idx: number) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="text-sm truncate">{link}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grading Section */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    Grading
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter marks and feedback for this submission. Click Save to update.</p>
                      </TooltipContent>
                    </Tooltip>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="marks">Marks</Label>
                      <Input
                        id="marks"
                        type="number"
                        placeholder="Enter marks"
                        value={gradeMarks}
                        onChange={(e) => setGradeMarks(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feedback">Feedback</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Provide feedback for the student..."
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                    <Button onClick={handleSaveGrade} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Grade
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TeacherLayout>
  );
};

export default TeacherAssignments;

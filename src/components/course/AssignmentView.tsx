import { useAuth } from "@/contexts/AuthContext";
import { assignmentService } from "@/services/assignmentService";
import { fileService } from "@/services/fileService";
import { Assignment, AssignmentSubmission } from "@/types/assignment";
import { formatDate } from "@/utils/date-time";
import { logError } from "@/utils/logger";
import {
  Award,
  Clock,
  FileDown,
  FileText,
  Link,
  Plus,
  Send,
  Star,
  Trash2,
  Upload,
  X,
  Maximize2,
  Minimize2,
  Eye,
  Edit3,
  Split,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MarkdownViewer from "../MarkdownViewer";
import MDEditor from "@uiw/react-md-editor";
import { adminAssignedStudentsService } from "@/services/adminAssignedStudentsService";
import { notificationApiService } from "@/services/notificationApiService";
import { authService } from "@/services/authService";

type AssignmentProps = {
  assignmentId: string;
  onComplete: (isCompleted: boolean) => void;
  onNavigateToNext?: () => void;
};

const AssignmentView: React.FC<AssignmentProps> = ({
  assignmentId,
  onComplete,
  onNavigateToNext,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [existingSubmission, setExistingSubmission] = useState<AssignmentSubmission | null>(null);

  const [textSubmissions, setTextSubmissions] = useState<string[]>([]);
  const [currentTextSubmission, setCurrentTextSubmission] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState("");

  const [isEditorMaximized, setIsEditorMaximized] = useState(false);
  const [isResponsesMaximized, setIsResponsesMaximized] = useState(false);
  const [editorView, setEditorView] = useState<"edit" | "preview" | "live">("live");

  const [isAssigned, setIsAssigned] = useState<boolean | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  // Helper functions for grading display
  const isGraded = existingSubmission?.marks !== null && existingSubmission?.marks !== undefined;

  const isPassing = () => {
    if (!isGraded || !assignment) return false;
    return (existingSubmission?.marks || 0) >= (assignment.minimumPassPoint || 0);
  };

  const getGradePercentage = () => {
    if (!isGraded || !assignment?.totalPoints) return 0;
    return Math.round(((existingSubmission?.marks || 0) / assignment.totalPoints) * 100);
  };

  useEffect(() => {
    const fetchAssignment = async () => {
      setIsLoading(true);
      if (!assignmentId) return;
      const result = await assignmentService.getAssignmentById(assignmentId);
      if (result.success) {
        setAssignment(result.data);
      }
      setIsLoading(false);
    };

    const fetchSubmission = async () => {
      if (!assignmentId || !user) return;
      const submissionResult = await assignmentService.getSubmissionByStudentAndAssignment(
        user.id,
        assignmentId
      );
      if (submissionResult.success && submissionResult.data) {
        setExistingSubmission(submissionResult.data);
        setTextSubmissions(submissionResult.data.textSubmissions || []);
        setLinks(submissionResult.data.links || []);
      }
    };

    fetchAssignment();
    fetchSubmission();
  }, [assignmentId, user]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditorMaximized) {
        setIsEditorMaximized(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isEditorMaximized]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setSubmissionFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSubmissionFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const checkAssignment = async () => {
      if (!user || !assignment) return;
      const assigned = await adminAssignedStudentsService.isStudentAssignedToAdmin(user.id);
      setIsAssigned(assigned);
    };

    checkAssignment();
  }, [user, assignment]);

  const addLink = () => {
    if (currentLink && isValidUrl(currentLink)) {
      setLinks((prev) => [...prev, currentLink]);
      setCurrentLink("");
    } else {
      setMessage("Please enter a valid URL");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const addTextSubmission = () => {
    if (currentTextSubmission.trim()) {
      setTextSubmissions((prev) => [...prev, currentTextSubmission.trim()]);
      setCurrentTextSubmission("");
    }
  };

  const removeTextSubmission = (index: number) => {
    setTextSubmissions((prev) => prev.filter((_, i) => i !== index));
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!assignment) {
      setMessage("Assignment not found.");
      return;
    }

    if (submissionFiles.length === 0 && textSubmissions.length === 0 && links.length === 0) {
      setMessage("Please provide at least one type of submission (files, text, or links).");
      return;
    }

    setIsSubmitting(true);
    setUploading(true);
    setMessage("");

    try {
      if (assignment.deadline && new Date() > assignment.deadline.toDate()) {
        setMessage("Assignment deadline has passed. Submission is not allowed.");
        setIsSubmitting(false);
        setUploading(false);
        return;
      }

      const uploadedUrls: string[] = [];
      for (const file of submissionFiles) {
        const result = await fileService.uploadAttachment(`/submissions/${assignmentId}`, file);
        if (result.success) {
          uploadedUrls.push(result.data);
        }
      }

      const submission = {
        assignmentId,
        studentId: user.id,
        studentName: user.firstName + " " + user.lastName,
        studentEmail: user.email,
        courseId: assignment.courseId,
        submissionFiles: uploadedUrls,
        textSubmissions: textSubmissions,
        marks: null,
        feedback: null,
        links: links,
      };

      const submissionResult = await assignmentService.createSubmission(submission);

      if (isAssigned && submissionResult.success && submissionResult.data) {
        try {
          const idToken = await authService.getToken();
          const submissionId = submissionResult.data;
          await notificationApiService.createNotification(
            {
              submissionId: submissionId,
              assignmentId: assignmentId,
              studentId: user.id,
            },
            idToken
          );
        } catch (notifError) {
          console.error("Failed to create notification:", notifError);
        }
      }

      await onComplete(true);
      setShowCompletionModal(true);
      setSubmissionFiles([]);
      setTextSubmissions([]);
      setLinks([]);
      setCurrentTextSubmission("");
    } catch (error) {
      logError("Error submitting assignment", error);
      setMessage("❌ Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isResponsesMaximized) setIsResponsesMaximized(false);
        if (isEditorMaximized) setIsEditorMaximized(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isEditorMaximized, isResponsesMaximized]);

  const handleDeleteSubmission = async () => {
    if (!existingSubmission) return;
    setIsSubmitting(true);
    setMessage("");

    try {
      await assignmentService.deleteSubmission(existingSubmission.id);
      setExistingSubmission(null);
      setTextSubmissions([]);
      setLinks([]);
      setMessage("Submission deleted successfully!");
      await onComplete(false);
    } catch (error) {
      logError("Error deleting submission", error);
      setMessage("❌ Failed to delete submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Completion Modal Component
  function AssignmentCompletionModal({
    isOpen,
    onClose,
    assignmentTitle,
    onContinue,
  }: {
    isOpen: boolean;
    onClose: () => void;
    assignmentTitle: string;
    onContinue: () => void;
  }) {
    if (!isOpen) return null;

    const handleContinue = () => {
      onClose();
      onContinue();
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        {/* Backdrop with Blur */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />

        {/* The Modern Geometric Modal */}
        <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
          {/* Main Background Shape with Cut Corners */}
          <div
            className="relative bg-white dark:bg-gray-900 p-8 sm:p-10 shadow-2xl"
            style={{
              clipPath: "polygon(0 0, 90% 0, 100% 10%, 100% 100%, 10% 100%, 0 90%)",
            }}
          >
            {/* Top-Left Heavy Bracket */}
            <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none">
              <div className="absolute top-4 left-4 w-full h-full border-t-[12px] border-l-[12px] border-green-500/90" />
            </div>

            {/* Bottom-Right Heavy Bracket */}
            <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none">
              <div className="absolute bottom-4 right-4 w-full h-full border-b-[12px] border-r-[12px] border-green-500/90" />
            </div>

            {/* Decorative "Tech" lines */}
            <div className="absolute top-4 right-12 w-12 h-1 bg-green-500/20" />
            <div className="absolute bottom-4 left-12 w-12 h-1 bg-green-500/20" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-20"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>

            {/* Content Wrapper */}
            <div className="relative z-10 text-center">
              {/* Success Icon */}
              <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                <Send className="h-10 w-10 text-green-500" />
              </div>

              <h3 className="text-2xl font-bold uppercase tracking-wider mb-4 text-green-500">
                ASSIGNMENT SUBMITTED!
              </h3>

              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Great work! You've successfully submitted:
              </p>

              <p className="font-semibold text-lg mb-6 text-gray-900 dark:text-white">
                "{assignmentTitle}"
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Your submission is pending review</span>
              </div>

              <button
                onClick={handleContinue}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Continue Learning
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
          <p>Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
        <p>Assignment not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  const colorMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  return (
    <div className="mx-auto p-6 no-scrollbar .no-scrollbar::-webkit-scrollbar  ">
      {/* Assignment Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          {assignment.title}
        </h1>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {formatDate(assignment.deadline)}
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4" /> {assignment.totalPoints} pts
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="h-4 w-4" /> Pass: {assignment.minimumPassPoint} pts
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <MarkdownViewer value={assignment.content} />
        </div>

        {assignment.attachments?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Attachments
            </h2>
            <ul className="space-y-2">
              {assignment.attachments.map((url, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <FileDown className="h-4 w-4 text-gray-400" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      File {idx + 1}
                    </a>
                  </div>
                  <a href={url} download className="text-primary text-xs hover:underline">
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Graded Submission Display - Minimal */}
      {existingSubmission && isGraded && (
        <div className="mt-6 space-y-4">
          {/* Grade Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Graded</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isPassing() ? "Passed" : "Did not meet passing criteria"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {existingSubmission.marks}
                  <span className="text-sm font-normal text-gray-400">
                    /{assignment.totalPoints}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{getGradePercentage()}%</p>
              </div>
            </div>

            {/* Simple Progress Bar */}
            <div className="mt-4">
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary dark:bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(getGradePercentage(), 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                <span>0</span>
                <span>Pass: {assignment.minimumPassPoint}</span>
                <span>{assignment.totalPoints}</span>
              </div>
            </div>
          </div>

          {/* Feedback Card */}
          {existingSubmission.feedback && existingSubmission.feedback.trim() && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Feedback</h3>
                </div>
              </div>
              <div className="p-5">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownViewer value={existingSubmission.feedback} />
                </div>
              </div>
            </div>
          )}

          {/* No Feedback */}
          {(!existingSubmission.feedback || !existingSubmission.feedback.trim()) && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
              <MessageSquare className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No feedback provided</p>
            </div>
          )}
        </div>
      )}

      {/* Submission Section */}
      <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-5 flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {existingSubmission ? "Your Submission" : "Submit Your Work"}
        </h2>

        {existingSubmission ? (
          <div className="space-y-5">
            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              {isGraded ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Received {existingSubmission.marks}/{assignment.totalPoints} points
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-600 dark:text-gray-400">Pending review</span>
                </>
              )}
            </div>

            {/* Text Submissions */}
            {existingSubmission.textSubmissions &&
              existingSubmission.textSubmissions.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Text Responses
                  </h3>
                  {existingSubmission.textSubmissions.map((text, idx) => (
                    <div
                      key={idx}
                      className="mb-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <MarkdownViewer value={text} />
                    </div>
                  ))}
                </div>
              )}

            {/* Links */}
            {existingSubmission.links && existingSubmission.links.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Links
                </h3>
                <ul className="space-y-1.5">
                  {existingSubmission.links.map((link, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                    >
                      <Link className="h-3.5 w-3.5 text-gray-400" />
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Files */}
            {existingSubmission.submissionFiles &&
              existingSubmission.submissionFiles.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Files
                  </h3>
                  <ul className="space-y-1.5">
                    {existingSubmission.submissionFiles.map((url, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <FileDown className="h-3.5 w-3.5 text-gray-400" />
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-gray-700 dark:text-gray-300"
                          >
                            File {idx + 1}
                          </a>
                        </div>
                        <a href={url} download className="text-primary text-xs hover:underline">
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Delete Button */}
            {!isGraded && (
              <button
                className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1.5 mt-4"
                onClick={handleDeleteSubmission}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Submission
              </button>
            )}

            {isGraded && (
              <p className="text-xs text-gray-400 mt-4">Graded submissions cannot be deleted.</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Text Submission Editor */}
            <div
              className={`${
                isEditorMaximized ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Text Response
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEditorView("edit")}
                      className={`px-2.5 py-1 text-xs ${
                        editorView === "edit"
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                          : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView("preview")}
                      className={`px-2.5 py-1 text-xs border-l border-gray-200 dark:border-gray-700 ${
                        editorView === "preview"
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                          : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView("live")}
                      className={`px-2.5 py-1 text-xs border-l border-gray-200 dark:border-gray-700 ${
                        editorView === "live"
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                          : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Split className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditorMaximized(!isEditorMaximized)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    {isEditorMaximized ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div
                data-color-mode={colorMode}
                className={`border rounded-lg dark:border-gray-700 overflow-hidden ${
                  isEditorMaximized ? "h-[calc(100vh-150px)]" : ""
                }`}
              >
                <MDEditor
                  value={currentTextSubmission}
                  onChange={(value) => setCurrentTextSubmission(value || "")}
                  preview={editorView}
                  height={isEditorMaximized ? undefined : 300}
                  hideToolbar={false}
                  visibleDragbar={!isEditorMaximized}
                  textareaProps={{
                    placeholder: "Write your answer here... Supports Markdown formatting.",
                  }}
                />
              </div>

              <div className={`flex gap-2 ${isEditorMaximized ? "mt-4" : "mt-2"}`}>
                <button
                  type="button"
                  onClick={addTextSubmission}
                  disabled={!currentTextSubmission.trim()}
                  className="px-3 py-1.5 bg-primary dark:bg-primary text-white dark:text-white text-sm rounded-lg disabled:opacity-40"
                >
                  Add Response
                </button>
                {isEditorMaximized && (
                  <button
                    type="button"
                    onClick={() => setIsEditorMaximized(false)}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg"
                  >
                    Close
                  </button>
                )}
              </div>

              {/* Added Responses */}
              {textSubmissions.length > 0 && !isEditorMaximized && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-400">Added responses:</p>
                  {textSubmissions.map((text, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownViewer
                            value={text.substring(0, 100) + (text.length > 100 ? "..." : "")}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTextSubmission(idx)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            {!isEditorMaximized && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                  Links
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={currentLink}
                    onChange={(e) => setCurrentLink(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {links.length > 0 && (
                  <ul className="space-y-1.5">
                    {links.map((link, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate flex-1"
                        >
                          {link}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeLink(idx)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* File Upload */}
            {!isEditorMaximized && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                  Files
                </label>
                <label
                  htmlFor="submission-files"
                  className="inline-flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Upload className="h-4 w-4 mr-2" /> Choose Files
                </label>
                <input
                  id="submission-files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {submissionFiles.length > 0 && (
                  <ul className="space-y-1.5 mt-2">
                    {submissionFiles.map((file, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                      >
                        <span className="truncate flex-1 text-gray-700 dark:text-gray-300">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Submit Button */}
            {!isEditorMaximized && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || uploading}
                className="px-4 py-2 bg-primary dark:bg-primary text-white dark:text-white-900 text-sm rounded-lg flex items-center gap-2 disabled:opacity-50 hover:accent dark:hover:bg-accent"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white dark:border-gray-900 border-t-transparent animate-spin rounded-full"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {message && (
          <p
            className={`mt-4 text-sm ${
              message.includes("❌") || message.includes("not allowed")
                ? "text-red-500"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {/* Completion Modal */}
      <AssignmentCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        assignmentTitle={assignment?.title || ""}
        onContinue={() => {
          if (onNavigateToNext) {
            onNavigateToNext();
          }
        }}
      />
    </div>
  );
};

export default AssignmentView;

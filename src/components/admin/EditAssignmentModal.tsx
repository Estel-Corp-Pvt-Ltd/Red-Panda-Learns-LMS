import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { X, NotepadText, FileText, FileUp, Trash2, Save } from "lucide-react";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { assignmentService } from "@/services/assignmentService";
import { fileService } from "@/services/fileService";
import { Assignment } from "@/types/assignment";
import { logError } from "@/utils/logger";
import { timestampToLocalInput } from "@/utils/date-time";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import MarkdownEditor from "../MarkdownEditor";
/* ------------------------------------------------------------------ */

interface EditAssignmentModalProps {
  assignmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: Assignment) => void;
}

/* ------------------------------------------------------------------ */

const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  assignmentId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [assignment, setAssignment] = useState<Omit<Assignment, "deadline"> & { deadline: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const { toast } = useToast();

  // ──────────────────────────────────────────────────────────────
  useEffect(() => {

    if (!isOpen || !assignmentId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await assignmentService.getAssignmentById(assignmentId);
        if (res.success) setAssignment({ ...res.data, deadline: timestampToLocalInput(res.data.deadline?.toDate()) });
      } catch (err) {
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, assignmentId]);

  // ──────────────────────────────────────────────────────────────
  const handleChange = (field: keyof Assignment, value: any) => {
    setAssignment((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };
  const removeNewFile = (i: number) =>
    setNewFiles((prev) => prev.filter((_, idx) => idx !== i));

  const removeExistingFile = (i: number) => {
    if (!assignment) return;
    setAssignment({
      ...assignment,
      attachments: assignment.attachments.filter((_, idx) => idx !== i),
    });
  };

  // ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignment) return;

    setSaving(true);
    try {
      const appended: string[] = [];

      if (newFiles.length) {
        setUploading(true);
        for (const f of newFiles) {
          const res = await fileService.uploadAttachment("assignments", f);
          if (res.success) appended.push(res.data);
        }
        setUploading(false);
      }
      const updated: Assignment = {
        ...assignment,
        deadline: assignment.deadline
          ? Timestamp.fromDate(new Date(assignment.deadline as any))
          : null,
        attachments: [...assignment.attachments, ...appended],
      };

      const res = await assignmentService.updateAssignment(
        assignment.id,
        updated
      );
      if (res.success) {
        toast({
          title: "Assignment Updated Successfully",
          description: "The assignment details have been updated successfully.",
          variant: "default",
        });
        onUpdated?.(updated);
        onClose();
      }
    } catch (err) {
      logError("Error updating assignment", err);
      alert("Failed to update assignment.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const colorMode =
    typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  if (!isOpen) return null;

  // ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full p-8 overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <NotepadText className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Edit Assignment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {loading || !assignment ? (
          <div className="flex items-center justify-center py-24 text-gray-600">
            Loading...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={assignment.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content
              </label>
              <div
                data-color-mode={colorMode}
                className="border rounded-lg dark:border-gray-700"
              >
                <MarkdownEditor
                  value={assignment.content}
                  onChange={(val) => handleChange("content", val || "")}
                  height={400}
                  uploadPath="/courses/assignments/attachments"
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <FileUp className="h-4 w-4 text-primary-500" /> Attachments
                </h3>
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-primary-600 dark:text-primary-400 text-xs hover:underline"
                >
                  + Add
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Existing */}
              {assignment.attachments.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {assignment.attachments.map((url, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-md px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary-500" />
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Attachment {i + 1}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingFile(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* New files */}
              {newFiles.length > 0 && (
                <ul className="space-y-2">
                  {newFiles.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-md px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary-500" />
                        {f.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewFile(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {(uploading || newFiles.length > 0) && (
                <p className="text-xs text-blue-500 mt-2 animate-pulse">
                  {uploading
                    ? "Uploading attachments..."
                    : "New files ready for upload"}
                </p>
              )}
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm dark:text-gray-300 mb-1">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={assignment.deadline || ''}
                  onChange={(e) => handleChange("deadline", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              {(
                Object.entries({
                  fileUploadLimit: "File Upload Limit",
                  maximumUploadSize: "Max File Size (MB)",
                  totalPoints: "Total Points",
                  minimumPassPoint: "Min Pass Points",
                }) as [keyof Assignment, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm dark:text-gray-300 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={assignment[key] as number}
                    onChange={(e) => handleChange(key, Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-6 py-2 rounded-lg bg-primary text-white flex items-center gap-2 disabled:opacity-50"
              >
                {saving || uploading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default EditAssignmentModal;

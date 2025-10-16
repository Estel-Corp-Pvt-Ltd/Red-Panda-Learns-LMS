import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { NotepadText, FileText, FileUp, Trash2, X, Save } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

import { assignmentService } from '@/services/assignmentService';
import { fileService } from '@/services/fileService';
import { logError } from '@/utils/logger';
import { Assignment } from '@/types/assignment';
import { Header } from '@/components/Header';

const EditAssignmentPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        if (!assignmentId) return;
        const data = await assignmentService.getAssignmentById(assignmentId);
        setAssignment(data);
      } catch (error) {
        logError('Error loading assignment', error);
        alert('Failed to load assignment.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignment();
  }, [assignmentId]);

  const handleChange = (field: keyof Assignment, value: any) => {
    setAssignment(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index: number) => {
    if (!assignment) return;
    setAssignment({
      ...assignment,
      attachments: assignment.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assignment) return;

    setIsSaving(true);
    try {
      let uploadedUrls: string[] = [];

      if (newFiles.length > 0) {
        setIsUploading(true);
        for (const file of newFiles) {
          const url = await fileService.uploadAttachment('assignments', file);
          uploadedUrls.push(url);
        }
        setIsUploading(false);
      }

      const updatedData = {
        ...assignment,
        attachments: [...assignment.attachments, ...uploadedUrls],
        updatedAt: new Date().toISOString(),
      };

      await assignmentService.updateAssignment(assignment.id, updatedData);
      alert('Assignment updated successfully!');
    } catch (error) {
      logError('Error updating assignment', error);
      alert('Failed to update assignment.');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading assignment...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        Assignment not found.
      </div>
    );
  }

  const colorMode =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';

  return (
    <>
      <Header />
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <NotepadText className="h-6 w-6 text-primary-600" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Edit Assignment
            </h1>
          </div>

          <Link to={`/admin/assignments/${assignmentId}/submissions`}>Submissions</Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={assignment.title}
              onChange={e => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          {/* Markdown Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content
            </label>
            <div
              data-color-mode={colorMode}
              className="border rounded-lg dark:border-gray-700"
            >
              <MDEditor
                value={assignment.content}
                onChange={(value) => handleChange('content', value || '')}
                height={350}
                preview="live"
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
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

            {/* Existing Attachments */}
            {assignment.attachments.length > 0 && (
              <ul className="space-y-2 mb-4">
                {assignment.attachments.map((url, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-md px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary-500" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Attachment {idx + 1}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingFile(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* New Files */}
            {newFiles.length > 0 && (
              <ul className="space-y-2">
                {newFiles.map((file, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-md px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary-500" />
                      {file.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewFile(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {(isUploading || newFiles.length > 0) && (
              <p className="text-xs text-blue-500 mt-2 animate-pulse">
                {isUploading ? 'Uploading attachments...' : 'New files ready for upload'}
              </p>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ['duration', 'Duration (minutes)'],
                ['fileUploadLimit', 'File Upload Limit'],
                ['maximumUploadSize', 'Max File Size (MB)'],
                ['totalPoints', 'Total Points'],
                ['minimumPassPoint', 'Minimum Pass Points'],
              ] as [keyof Assignment, string][]
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input
                  type="number"
                  value={assignment[key] as number}
                  onChange={e => handleChange(key, Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving || isUploading ? (
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
        </form>
      </div>
    </>
  );
};

export default EditAssignmentPage;

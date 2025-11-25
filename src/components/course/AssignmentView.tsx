import { useAuth } from '@/contexts/AuthContext';
import { assignmentService } from '@/services/assignmentService';
import { fileService } from '@/services/fileService';
import { Assignment, AssignmentSubmission } from '@/types/assignment';
import { formatDate } from '@/utils/date-time';
import { logError } from '@/utils/logger';
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
  Split
} from 'lucide-react';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownViewer from '../MarkdownViewer';
import MDEditor from '@uiw/react-md-editor';

type AssignmentProps = {
  assignmentId: string;
  onComplete: () => void
};

const AssignmentView: React.FC<AssignmentProps> = ({ assignmentId, onComplete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingSubmission, setExistingSubmission] = useState<AssignmentSubmission | null>(null);
  
  // New states for text submission and links
  const [textSubmissions, setTextSubmissions] = useState<string[]>([]);
  const [currentTextSubmission, setCurrentTextSubmission] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState('');
  
  // Editor states
  const [isEditorMaximized, setIsEditorMaximized] = useState(false);
  const [isResponsesMaximized, setIsResponsesMaximized] = useState(false);
  const [editorView, setEditorView] = useState<'edit' | 'preview' | 'live'>('live');

  // ✅ Load assignment by ID
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
      const submissionResult = await assignmentService.getSubmissionByStudentAndAssignment(user.id, assignmentId);
      if (submissionResult.success && submissionResult.data) {
        setExistingSubmission(submissionResult.data);
        // Populate existing submission data
        setTextSubmissions(submissionResult.data.textSubmission || []);
        setLinks(submissionResult.data.link || []);
      }
    };

    fetchAssignment();
    fetchSubmission();
  }, [assignmentId, user]);

  // Handle escape key for maximized editor
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditorMaximized) {
        setIsEditorMaximized(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isEditorMaximized]);

  // ✅ Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setSubmissionFiles((prev) => [...prev, ...newFiles]);
  };

  // ✅ Remove file from submission list
  const removeFile = (index: number) => {
    setSubmissionFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Add link to submission
  const addLink = () => {
    if (currentLink && isValidUrl(currentLink)) {
      setLinks((prev) => [...prev, currentLink]);
      setCurrentLink('');
    } else {
      setMessage('Please enter a valid URL');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // ✅ Remove link from submission
  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Add text submission
  const addTextSubmission = () => {
    if (currentTextSubmission.trim()) {
      setTextSubmissions((prev) => [...prev, currentTextSubmission.trim()]);
      setCurrentTextSubmission('');
    }
  };

  // ✅ Remove text submission
  const removeTextSubmission = (index: number) => {
    setTextSubmissions((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Validate URL
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // ✅ Handle submission upload
  const handleSubmit = async () => {
    if (!assignment) {
      setMessage('Assignment not found.');
      return;
    }

    // Check if at least one type of submission is provided
    if (submissionFiles.length === 0 && textSubmissions.length === 0 && links.length === 0) {
      setMessage('Please provide at least one type of submission (files, text, or links).');
      return;
    }

    setIsSubmitting(true);
    setUploading(true);
    setMessage('');

    try {
      if (assignment.deadline && new Date() > assignment.deadline.toDate()) {
        setMessage('Assignment deadline has passed. Submission is not allowed.');
        setIsSubmitting(false);
        setUploading(false);
        return;
      }

      // Upload files
      const uploadedUrls: string[] = [];
      for (const file of submissionFiles) {
        const result = await fileService.uploadAttachment(`/submissions/${assignmentId}`, file);
        if (result.success) {
          uploadedUrls.push(result.data);
        }
      }

      // Save submission record
      const submission = {
        assignmentId,
        studentId: user.id,
        studentName: user.firstName + " " + user.lastName,
        submissionFiles: uploadedUrls,
        textSubmission: textSubmissions,
        link: links
      };

      await assignmentService.createSubmission(submission);
      await onComplete();
      setMessage('Assignment submitted successfully!');
      setSubmissionFiles([]);
      setTextSubmissions([]);
      setLinks([]);
      setCurrentTextSubmission('');
    } catch (error) {
      logError('Error submitting assignment', error);
      setMessage('❌ Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  };



  useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isResponsesMaximized) setIsResponsesMaximized(false);
      if (isEditorMaximized) setIsEditorMaximized(false);
    }
  };
  
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isEditorMaximized, isResponsesMaximized]);

  const handleDeleteSubmission = async () => {
    if (!existingSubmission) return;
    setIsSubmitting(true);
    setMessage('');

    try {
      await assignmentService.deleteSubmission(existingSubmission.id);
      setExistingSubmission(null);
      setTextSubmissions([]);
      setLinks([]);
      setMessage('Submission deleted successfully!');
      await onComplete();
    } catch (error) {
      logError('Error deleting submission', error);
      setMessage('❌ Failed to delete submission. Please try again.');
    } finally {
      setIsSubmitting(false);
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

  const colorMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light';

  return (
    <div className="mx-auto p-6">
      {/* Assignment Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-3">
          {assignment.title}
        </h1>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-primary-500" /> {formatDate(assignment.deadline)}
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" /> {assignment.totalPoints} pts
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4 text-green-600" /> Pass: {assignment.minimumPassPoint} pts
          </div>
        </div>

        {/* Content */}
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownViewer value={assignment.content} />
        </div>

        {/* Attachments */}
        {assignment.attachments?.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" /> Attachments
            </h2>
            <ul className="space-y-3">
              {assignment.attachments.map((url, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-md px-4 py-2 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-300">
                    <FileDown className="h-4 w-4 text-primary-500" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      File {idx + 1}
                    </a>
                  </div>
                  <a
                    href={url}
                    download
                    className="text-primary-600 dark:text-primary-400 text-xs hover:underline"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Submission Section */}
      <div className="mt-10 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Submit Your Work
        </h2>

        {existingSubmission ? (
          <div className="space-y-6">
            {/* Display existing text submissions */}
            {existingSubmission.textSubmission && existingSubmission.textSubmission.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Text Submissions
                </h3>
                {existingSubmission.textSubmission.map((text, idx) => (
                  <div key={idx} className="mb-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <MarkdownViewer value={text} />
                  </div>
                ))}
              </div>
            )}

            {/* Display existing links */}
            {existingSubmission.link && existingSubmission.link.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Submitted Links
                </h3>
                <ul className="space-y-2">
                  {existingSubmission.link.map((link, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                    >
                      <Link className="h-4 w-4 text-primary-500" />
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex-1"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Display existing files */}
            {existingSubmission.submissionFiles && existingSubmission.submissionFiles.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Submitted Files
                </h3>
                <ul className="space-y-2">
                  {existingSubmission.submissionFiles.map((url, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        File {idx + 1}
                      </a>
                      <a
                        href={url}
                        download
                        className="text-primary-600 dark:text-primary-400 text-xs hover:underline"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button 
              className='bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors' 
              onClick={handleDeleteSubmission}
              disabled={isSubmitting}
            >
              Delete Submission
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enhanced Text Submission Field with Markdown Editor */}
            <div className={`${isEditorMaximized ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Text Submission (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {/* View Mode Buttons */}
                  <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => setEditorView('edit')}
                      className={`px-3 py-1.5 text-xs flex items-center gap-1 ${
                        editorView === 'edit' 
                          ? 'bg-primary text-white' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Edit3 className="h-3 w-3" />
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView('preview')}
                      className={`px-3 py-1.5 text-xs flex items-center gap-1 border-l border-gray-300 dark:border-gray-600 ${
                        editorView === 'preview' 
                          ? 'bg-primary text-white' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView('live')}
                      className={`px-3 py-1.5 text-xs flex items-center gap-1 border-l border-gray-300 dark:border-gray-600 ${
                        editorView === 'live' 
                          ? 'bg-primary text-white' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      } rounded-r-lg`}
                    >
                      <Split className="h-3 w-3" />
                      Split
                    </button>
                  </div>
                  
                  {/* Maximize Button */}
                  <button
                    type="button"
                    onClick={() => setIsEditorMaximized(!isEditorMaximized)}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    title={isEditorMaximized ? "Exit fullscreen" : "Fullscreen"}
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
                className={`border rounded-lg dark:border-gray-700 ${
                  isEditorMaximized ? 'h-[calc(100vh-150px)]' : ''
                }`}
              >
                <MDEditor
                  value={currentTextSubmission}
                  onChange={(value) => setCurrentTextSubmission(value || '')}
                  preview={editorView}
                  height={isEditorMaximized ? undefined : 400}
                  hideToolbar={false}
                  visibleDragbar={!isEditorMaximized}
                  textareaProps={{
                    placeholder: 'Write your answer here... Supports **Markdown** formatting.\n\n### Tips:\n- Use **bold** for emphasis\n- Create lists with - or 1.\n- Add code blocks with ```\n- Insert links with [text](url)'
                  }}
                />
              </div>

              <div className={`flex gap-2 ${isEditorMaximized ? 'mt-4' : 'mt-2'}`}>
                <button
                  type="button"
                  onClick={addTextSubmission}
                  disabled={!currentTextSubmission.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Text Response
                </button>
                {isEditorMaximized && (
                  <button
                    type="button"
                    onClick={() => setIsEditorMaximized(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Close Fullscreen
                  </button>
                )}
              </div>

              {/* Added Text Submissions */}
            {textSubmissions.length > 0 && !isEditorMaximized && (
  <div className={`mt-3 space-y-2 ${isResponsesMaximized ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6 overflow-y-auto' : ''}`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">Added responses:</p>
      <button
        type="button"
        onClick={() => setIsResponsesMaximized(!isResponsesMaximized)}
        className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        title={isResponsesMaximized ? "Exit fullscreen" : "Expand all"}
      >
        {isResponsesMaximized ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </button>
    </div>
    
    {textSubmissions.map((text, idx) => (
      <div
        key={idx}
        className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 prose dark:prose-invert max-w-none text-sm">
            <MarkdownViewer value={isResponsesMaximized ? text : (text.substring(0, 100) + (text.length > 100 ? '...' : ''))} />
          </div>
          <button
            type="button"
            onClick={() => removeTextSubmission(idx)}
            className="text-red-500 hover:text-red-700 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    ))}
    
    {isResponsesMaximized && (
      <button
        type="button"
        onClick={() => setIsResponsesMaximized(false)}
        className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
      >
        Close Fullscreen
      </button>
    )}
  </div>
)}

            </div>

            {/* Links Submission - Hide when editor is maximized */}
            {!isEditorMaximized && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Links (Optional)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={currentLink}
                    onChange={(e) => setCurrentLink(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
                {links.length > 0 && (
                  <ul className="space-y-2">
                    {links.map((link, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex-1"
                        >
                          {link}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeLink(idx)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* File Upload - Hide when editor is maximized */}
            {!isEditorMaximized && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  File Attachments (Optional)
                </label>
                <label
                  htmlFor="submission-files"
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
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
                  <ul className="space-y-2 mt-3">
                    {submissionFiles.map((file, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                      >
                        <span className="truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Submit Button - Hide when editor is maximized */}
            {!isEditorMaximized && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || uploading}
                className="px-6 py-2 bg-primary text-white rounded-lg flex items-center gap-2 disabled:opacity-50 hover:bg-primary-600 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Assignment
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {message && (
          <p className={`mt-4 text-sm ${message.includes('❌') || message.includes('not allowed') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AssignmentView;
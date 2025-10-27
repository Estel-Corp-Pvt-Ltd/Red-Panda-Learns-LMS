import { useAuth } from '@/contexts/AuthContext';
import { assignmentService } from '@/services/assignmentService';
import { fileService } from '@/services/fileService';
import { Assignment } from '@/types/assignment';
import { formatDate } from '@/utils/date-time';
import { logError } from '@/utils/logger';
import {
  Award,
  Clock,
  FileDown,
  FileText,
  Send,
  Star,
  Trash2,
  Upload
} from 'lucide-react';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownViewer from '../MarkdownViewer';

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
    fetchAssignment();
  }, [assignmentId]);

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

  // ✅ Handle submission upload
  const handleSubmit = async () => {
    if (!assignment || submissionFiles.length === 0) {
      setMessage('Please upload at least one file before submitting.');
      return;
    }

    setIsSubmitting(true);
    setUploading(true);
    setMessage('');

    try {
      // Upload files
      const uploadedUrls: string[] = [];
      for (const file of submissionFiles) {
        const result = await fileService.uploadAttachment(`submissions/${assignmentId}`, file);
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
      };

      await assignmentService.createSubmission(submission);
      await onComplete();
      setMessage('✅ Assignment submitted successfully!');
      setSubmissionFiles([]);
    } catch (error) {
      logError('Error submitting assignment', error);
      setMessage('❌ Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploading(false);
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

  return (
    <div className="max-w-5xl mx-auto p-6">
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Submit Your Work
        </h2>

        <label
          htmlFor="submission-files"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg cursor-pointer mb-4"
        >
          <Upload className="h-4 w-4 mr-2" /> Upload Files
        </label>
        <input
          id="submission-files"
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {submissionFiles.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {submissionFiles.map((file, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
              >
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic mb-4">No files selected yet.</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || uploading}
          className="px-6 py-2 bg-primary text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
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

        {message && (
          <p className={`mt-4 text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AssignmentView;

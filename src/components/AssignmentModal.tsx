import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import {
  Plus,
  Trash2,
  FileText,
  FileUp,
  X,
  NotepadText,
} from 'lucide-react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

import { fileService } from '@/services/fileService';
import { assignmentService } from '@/services/assignmentService';
import { logError } from '@/utils/logger';
import { Assignment } from '@/types/assignment';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import MarkdownEditor from './MarkdownEditor';

export interface AssignmentFormData {
  title: string;
  content: string;
  deadline: string | null;
  fileUploadLimit: number;
  maximumUploadSize: number;
  totalPoints: number;
  minimumPassPoint: number;
  attachments: File[];
  authorId: string;
}

interface FormErrors {
  title?: string;
  content?: string;
  deadline?: string;
}

interface AssignmentModalProps {
  courseId: string;
  onSave: (assignment: Assignment) => void;
  onCancel: () => void;
}

type FormField = keyof Omit<Assignment, 'attachments'>;

const AssignmentModal: React.FC<AssignmentModalProps> = ({ courseId, onSave, onCancel }) => {
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    content: '',
    deadline: null,
    fileUploadLimit: 5,
    maximumUploadSize: 10,
    totalPoints: 100,
    minimumPassPoint: 60,
    attachments: [],
    authorId: '',

  });


  const [errors, setErrors] = useState<FormErrors>({});
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();


  // Set authorId whenever user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, authorId: user.id }));

    }
  }, [user]);

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newFiles],
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleTextInputChange =
    (field: string) =>
      (e: ChangeEvent<HTMLInputElement>) =>
        handleInputChange(field, e.target.value);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setIsUploadingAttachment(true);

      const uploadedUrls: string[] = [];

      for (const file of formData.attachments) {
        const result = await fileService.uploadAttachment('assignments', file);
        if (result.success) {
          uploadedUrls.push(result.data);
        }
      }

      setIsUploadingAttachment(false);

      const newAssignmentData = {
        title: formData.title,
        courseId: courseId,
        content: formData.content,
        deadline: formData.deadline
          ? Timestamp.fromDate(new Date(formData.deadline))
          : null,
        fileUploadLimit: formData.fileUploadLimit,
        maximumUploadSize: formData.maximumUploadSize,
        totalPoints: formData.totalPoints,
        minimumPassPoint: formData.minimumPassPoint,
        attachments: uploadedUrls,
        authorId: formData.authorId,
      };

      const result = await assignmentService.createAssignment(newAssignmentData);
      if (result.success) {
        onSave({ ...newAssignmentData, id: result.data });
      }
    } catch (error) {
      logError('Error creating assignment', error);
      alert('Failed to create assignment. Please try again.');
    } finally {
      setIsUploadingAttachment(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full p-8 overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <NotepadText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Create New Assignment
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* LEFT SIDE */}
          <div className="md:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={handleTextInputChange('title')}
                placeholder="Enter assignment title"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Markdown Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Content *
              </label>
              <div
                data-color-mode={
                  document.documentElement.classList.contains('dark')
                    ? 'dark'
                    : 'light'
                }
                className={`border rounded-lg ${errors.content
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
                  }`}
              >
                <MarkdownEditor
                  value={formData.content}
                  onChange={(value) =>
                    handleInputChange('content', value || '')
                  }
                  height={350}
                  uploadPath='/courses/assignments/attachments'
                />
              </div>
              {errors.content && (
                <p className="text-sm text-red-500 mt-1">{errors.content}</p>
              )}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">
            {/* Attachments */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {formData.attachments.length > 0 ? (
                <ul className="space-y-2">
                  {formData.attachments.map((file, idx) => (
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
                        onClick={() => removeAttachment(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  No files uploaded
                </p>
              )}

              {isUploadingAttachment && (
                <p className="text-xs text-blue-500 mt-2 animate-pulse">
                  Uploading attachments...
                </p>
              )}
            </div>

            {/* Settings */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Assignment Settings
              </h3>

              {/* Deadline */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Deadline *
                </label>
                <input
                  type="datetime-local"
                  value={formData.deadline || ''}
                  onChange={(e) =>
                    handleInputChange('deadline', e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.deadline ? 'border-red-500' : ''
                    }`}
                />
                {errors.deadline && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.deadline}
                  </p>
                )}
              </div>

              {/* Other Numeric Fields */}
              {(
                [
                  ['fileUploadLimit', 'File Upload Limit'],
                  ['maximumUploadSize', 'Maximum File Size (MB)'],
                  ['totalPoints', 'Total Points'],
                  ['minimumPassPoint', 'Minimum Pass Points'],
                ] as [FormField, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={formData[key] as number}
                    onChange={(e) =>
                      handleInputChange(key, Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingAttachment}
                className="px-6 py-2 rounded-lg bg-primary text-white flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting || isUploadingAttachment ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AssignmentModal;

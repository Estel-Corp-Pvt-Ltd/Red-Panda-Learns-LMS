// components/MarkdownEditor/ImageUploadModal.tsx
import React, { useState, useCallback, useRef } from 'react';
import { fileService } from '@/services/fileService';
import { getDownloadURL, UploadTask } from 'firebase/storage';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, alt: string) => void;
  uploadPath: string;
}

type TabType = 'upload' | 'url';

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  uploadPath,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setImageUrl('');
    setAltText('');
    setPreviewUrl(null);
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);
    setActiveTab('upload');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPG, PNG, GIF, WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);

      // Set alt text from filename
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setAltText(fileNameWithoutExt.replace(/[-_]/g, ' '));

      try {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const fileName = `${timestamp}_${random}_${file.name.replace(/\s+/g, '_')}`;

        const result = fileService.startResumableUpload(
          `${uploadPath}/${fileName}`,
          file
        );

        if (result.success && result.data) {
          const uploadTask: UploadTask = result.data;

          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              setIsUploading(false);
              setError('Upload failed. Please try again.');
              console.error(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setImageUrl(downloadURL);
                setIsUploading(false);
                setUploadProgress(100);
              } catch (error) {
                setIsUploading(false);
                setError('Failed to get image URL');
              }
            }
          );
        } else {
          // Fallback to simple upload
          const simpleResult = await fileService.uploadAttachment(uploadPath, file);
          if (simpleResult.success && simpleResult.data) {
            setImageUrl(simpleResult.data);
            setIsUploading(false);
            setUploadProgress(100);
          } else {
            throw new Error('Upload failed');
          }
        }
      } catch (error) {
        setIsUploading(false);
        setError('Upload failed. Please try again.');
        console.error(error);
      }
    },
    [uploadPath]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleInsert = () => {
    if (imageUrl) {
      onInsert(imageUrl, altText);
      handleClose();
    }
  };

  const handleUrlPreview = () => {
    if (imageUrl) {
      setPreviewUrl(imageUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Insert Image
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload
            </span>
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              URL
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {activeTab === 'upload' ? (
            <>
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  accept="image/*"
                  className="hidden"
                />

                {isUploading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto">
                      <svg className="animate-spin text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                ) : previewUrl && activeTab === 'upload' ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Image uploaded successfully
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                      Drop your image here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Supports JPG, PNG, GIF, WebP (max 5MB)
                    </p>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* URL Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleUrlPreview}
                      disabled={!imageUrl}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {/* URL Preview */}
                {previewUrl && activeTab === 'url' && (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                      onError={() => {
                        setError('Failed to load image from URL');
                        setPreviewUrl(null);
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Alt Text Input */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alt Text (optional)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Alt text helps with accessibility and SEO
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!imageUrl || isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Insert Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;
import React, { useCallback, useRef, useState } from 'react';
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import { fileService } from '@/services/fileService';
import { getDownloadURL, UploadTask } from 'firebase/storage';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
  uploadPath?: string;
  disabled?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  height = 350,
  placeholder = 'Start writing your markdown here...',
  uploadPath = 'markdown-images',
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom image upload command
  const createImageUploadCommand = (): ICommand => {
    return {
      name: 'upload-image',
      keyCommand: 'upload-image',
      buttonProps: { 'aria-label': 'Upload image' },
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <polyline points="21 15 16 10 5 21" strokeWidth="2" />
        </svg>
      ),
      execute: () => {
        fileInputRef.current?.click();
      },
    };
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, etc.)');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const fileName = `${timestamp}_${random}_${file.name.replace(/\s+/g, '_')}`;

      const result = fileService.startResumableUpload(
        `${uploadPath}/${fileName}`,
        file
      );

      if (result.success && result.data) {
        return new Promise<string>((resolve, reject) => {
          const uploadTask: UploadTask = result.data!;

          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              setIsUploading(false);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(result.data.snapshot.ref);
                setIsUploading(false);
                setUploadProgress(100);
                resolve(downloadURL);
              } catch (error) {
                setIsUploading(false);
                reject(error);
              }
            }
          );
        });
      } else {
        // Fallback to simple upload
        const simpleResult = await fileService.uploadAttachment(uploadPath, file);
        if (simpleResult.success) {
          setIsUploading(false);
          return simpleResult.data;
        } else {
          throw new Error(simpleResult.error.message || 'Upload failed');
        }
      }
    } catch (error) {
      setIsUploading(false);
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
      return null;
    }
  }, [uploadPath]);

  // Insert markdown image syntax
  const insertImageMarkdown = useCallback((url: string, altText: string = '') => {
    const cursorPos = document.activeElement instanceof HTMLTextAreaElement
      ? document.activeElement.selectionStart
      : value.length;

    const beforeText = value.substring(0, cursorPos);
    const afterText = value.substring(cursorPos);
    const markdownImage = `![${altText}](${url})`;

    const newValue = beforeText + markdownImage + (afterText ? '\n' + afterText : '');
    onChange(newValue);

    // Focus back on editor
    setTimeout(() => {
      const textarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
      if (textarea) {
        const newCursorPos = cursorPos + markdownImage.length + 1;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 100);
  }, [value, onChange]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const url = await handleFileUpload(file);

    if (url) {
      insertImageMarkdown(url, file.name.split('.')[0]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload, insertImageMarkdown]);

  // Handle paste event for images
  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();

        const file = items[i].getAsFile();
        if (file) {
          const url = await handleFileUpload(file);
          if (url) {
            insertImageMarkdown(url, 'pasted image');
          }
        }
        break;
      }
    }
  }, [handleFileUpload, insertImageMarkdown]);

  // Handle drag and drop
  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      await handleFileSelect(files);
    }
  }, [handleFileSelect]);

  // Custom toolbar commands
  const customCommands = [
    commands.group(
      [
        commands.title1,
        commands.title2,
        commands.title3,
        commands.title4,
      ],
      {
        name: 'title',
        groupName: 'title',
        buttonProps: { 'aria-label': 'Insert title' },
      }
    ),
    commands.divider,
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.divider,
    commands.link,
    commands.image,
    createImageUploadCommand(),
    commands.divider,
    commands.code,
    commands.codeBlock,
    commands.divider,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.checkedListCommand,
    commands.divider,
    commands.quote,
    commands.divider,
    commands.fullscreen,
  ];

  return (
    <div className="markdown-editor-container" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileSelect(e.target.files)}
        accept="image/*"
        className="hidden"
      />

      {/* Upload progress overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-md">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Uploading Image
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Please wait while your image is being uploaded...
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(uploadProgress)}% complete
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MDEditor with custom toolbar */}
      <MDEditor
        value={value}
        onChange={onChange}
        height={height}
        preview="live"
        commands={customCommands}
        extraCommands={[]}
        textareaProps={{
          onPaste: handlePaste,
          disabled,
          placeholder,
        }}
        previewOptions={{
          components: {
            img: ({ src, alt, title }) => (
              <img
                src={src}
                alt={alt || ''}
                title={title}
                className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 my-2"
                loading="lazy"
                style={{ maxHeight: '400px' }}
              />
            ),
          },
        }}
      />

      {/* Upload tips */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Tip: You can drag & drop images, paste from clipboard, or use the upload button</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs">
            Supports: JPG, PNG, GIF, WebP
          </span>
          <span className="text-xs">
            Max size: 5MB
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor;

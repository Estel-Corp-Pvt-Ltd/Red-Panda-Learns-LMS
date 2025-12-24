// components/MarkdownEditor/MarkdownEditor.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor, } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import ImageUploadModal from './ImageUploadMarkdown';
import EditorToolbar from './EditorToolbar';
import LinkModal from './ImageLinkUpload';

const lowlight = createLowlight(common);

// Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});

// ✅ If <a href="URL">URL</a> => store as plain URL (not [URL](URL))
turndownService.addRule('link-plain-url', {
  filter: (node) => node.nodeName === 'A',
  replacement: (content, node) => {
    const a = node as HTMLAnchorElement;

    const href = (a.getAttribute('href') || '').trim();
    const text = (a.textContent || '').trim();

    if (!href) return content;

    // If user pasted a URL and Tiptap auto-linked it, keep it as-is:
    if (text === href) {
      return href;
    }

    // Otherwise keep normal markdown link syntax for "real" links
    const title = (a.getAttribute('title') || '').trim();
    const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : '';

    return `[${content}](${href}${titlePart})`;
  },
});

// Custom rule for images
turndownService.addRule('image', {
  filter: 'img',
  replacement: (content, node) => {
    const img = node as HTMLImageElement;
    const alt = img.alt || '';
    const src = img.src || '';
    const title = img.title ? ` "${img.title}"` : '';
    return `![${alt}](${src}${title})`;
  },
});

// Helper function to check if text is just URLs (one or more)
const isPlainUrl = (text: string): boolean => {
  const trimmedText = text.trim();
  
  // Check if it's a single URL
  const singleUrlPattern = /^https?:\/\/[^\s]+$/;
  if (singleUrlPattern.test(trimmedText)) {
    return true;
  }
  
  // Check if it's multiple URLs (one per line)
  const lines = trimmedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0 && lines.every(line => singleUrlPattern.test(line))) {
    return true;
  }
  
  return false;
};

// Helper function to detect if text is markdown
const isMarkdown = (text: string): boolean => {
  const trimmedText = text.trim();
  
  // If it's just plain URLs, don't treat as markdown
  if (isPlainUrl(trimmedText)) {
    return false;
  }
  
  // Check for actual markdown syntax patterns
  const markdownPatterns = [
    /^#{1,6}\s+.+/m,                      // Headers: # Header
    /\*\*[^*]+\*\*/,                      // Bold: **text**
    /(?<![*\w])\*[^*\s][^*]*\*(?![*\w])/, // Italic: *text* (not URLs with asterisks)
    /__[^_]+__/,                          // Bold: __text__
    /(?<![_\w])_[^_\s][^_]*_(?![_\w])/,   // Italic: _text_ (not snake_case)
    /\[([^\]]+)\]\(([^)]+)\)/,            // Links: [text](url)
    /!\[([^\]]*)\]\(([^)]+)\)/,           // Images: ![alt](url)
    /^>\s+.+/m,                           // Blockquotes: > text
    /^[\t ]*[-*+]\s+.+/m,                 // Unordered lists: - item
    /^[\t ]*\d+\.\s+.+/m,                 // Ordered lists: 1. item
    /`[^`\n]+`/,                          // Inline code: `code`
    /^```/m,                              // Code blocks start: ```
    /^\|.+\|.+\|/m,                       // Tables: | col | col |
    /^-{3,}$/m,                           // Horizontal rules: ---
    /^={3,}$/m,                           // Horizontal rules: ===
    /~~[^~]+~~/,                          // Strikethrough: ~~text~~
    /^\s*[-*+] \[[x ]\]/im,               // Task lists: - [ ] or - [x]
  ];

  // Must match at least one markdown pattern
  const hasMarkdown = markdownPatterns.some(pattern => pattern.test(trimmedText));
  
  // Additional check: if it's a very short text without clear markdown, skip
  if (!hasMarkdown) {
    return false;
  }
  
  // Avoid false positives: check if the markdown characters are meaningful
  // For example, "I love *cats*" is markdown, but "5 * 3 = 15" is not
  const meaningfulMarkdown = [
    /^#{1,6}\s+\S/m,                      // Real headers have content
    /\*\*\S.*\S\*\*/,                     // Bold has content
    /\*\S.*\S\*/,                         // Italic has content
    /\[[^\]]+\]\([^)]+\)/,                // Links have both text and URL
    /^>\s+\S/m,                           // Blockquotes have content
    /^[\t ]*[-*+]\s+\S/m,                 // Lists have content
    /^[\t ]*\d+\.\s+\S/m,                 // Ordered lists have content
    /`\S[^`]*`/,                          // Code has content
    /^```/m,                              // Code blocks
  ];
  
  return meaningfulMarkdown.some(pattern => pattern.test(trimmedText));
};

// Custom extension to handle markdown paste
const MarkdownPasteHandler = Extension.create({
  name: 'markdownPasteHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPasteHandler'),
        props: {
          handlePaste: (view, event, slice) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            // Check if there's HTML content (from rich text copy)
            const htmlContent = clipboardData.getData('text/html');
            if (htmlContent && htmlContent.trim()) {
              // Let Tiptap handle HTML paste normally
              return false;
            }

            // Get plain text
            const text = clipboardData.getData('text/plain');
            if (!text) return false;

            // If it's just a plain URL, let Tiptap handle it normally (as plain text)
            if (isPlainUrl(text)) {
              return false; // Don't intercept, paste as plain text
            }

            // Check if it looks like markdown
            if (isMarkdown(text)) {
              event.preventDefault();

              try {
                // Convert markdown to HTML
                const html = marked.parse(text, { async: false }) as string;

                // Insert the HTML content
                this.editor.commands.insertContent(html);

                return true;
              } catch (error) {
                console.error('Error parsing markdown:', error);
                return false;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

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
  placeholder = 'Start writing your content here...',
  uploadPath = 'markdown-images',
  disabled = false,
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);

  // Convert markdown to HTML for initial content
  const getInitialContent = useCallback(() => {
    if (!value) return '';
    try {
      return marked.parse(value, { async: false }) as string;
    } catch {
      return value;
    }
  }, [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      MarkdownPasteHandler, // Add the custom paste handler
    ],
    content: getInitialContent(),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (!isSourceMode) {
        const html = editor.getHTML();
        const markdown = turndownService.turndown(html);
        onChange(markdown);
      }
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentMarkdown = turndownService.turndown(editor.getHTML());
      if (currentMarkdown !== value) {
        const html = marked.parse(value || '', { async: false }) as string;
        editor.commands.setContent(html);
      }
    }
  }, [value, editor]);

  // Handle source mode toggle
  const toggleSourceMode = useCallback(() => {
    if (isSourceMode && editor) {
      // Switching from source to WYSIWYG
      const html = marked.parse(sourceValue, { async: false }) as string;
      editor.commands.setContent(html);
      onChange(sourceValue);
    } else if (editor) {
      // Switching from WYSIWYG to source
      setSourceValue(value);
    }
    setIsSourceMode(!isSourceMode);
  }, [isSourceMode, editor, sourceValue, value, onChange]);

  // Handle source value change
  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceValue(e.target.value);
    onChange(e.target.value);
  };

  // Image insertion handler
  const handleImageInsert = useCallback(
    (url: string, alt: string = '') => {
      if (editor) {
        editor.chain().focus().setImage({ src: url, alt }).run();
      }
      setIsImageModalOpen(false);
    },
    [editor]
  );

  // Link insertion handler
  const handleLinkInsert = useCallback(
    (url: string, text?: string) => {
      if (editor) {
        if (text) {
          editor
            .chain()
            .focus()
            .insertContent(`<a href="${url}">${text}</a>`)
            .run();
        } else {
          editor.chain().focus().setLink({ href: url }).run();
        }
      }
      setIsLinkModalOpen(false);
    },
    [editor]
  );

  if (!editor) {
    return (
      <div
        className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg"
        style={{ height }}
      />
    );
  }

  return (
    <div className="markdown-editor-wrapper border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <EditorToolbar
        editor={editor}
        onImageClick={() => setIsImageModalOpen(true)}
        onLinkClick={() => setIsLinkModalOpen(true)}
        isSourceMode={isSourceMode}
        onToggleSourceMode={toggleSourceMode}
        disabled={disabled}
      />

      {/* Editor Content */}
      <div
        className="editor-content-wrapper overflow-y-auto"
        style={{ height: height - 50 }}
      >
        {isSourceMode ? (
          <textarea
            value={sourceValue}
            onChange={handleSourceChange}
            disabled={disabled}
            className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
            placeholder={placeholder}
          />
        ) : (
          <>
            {/* Bubble Menu for quick formatting */}
            <BubbleMenu
              editor={editor}
              className="bubble-menu bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg p-1 flex gap-1"
            >
              <BubbleButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
              >
                <BoldIcon />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
              >
                <ItalicIcon />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
              >
                <UnderlineIcon />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
              >
                <StrikeIcon />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
              >
                <CodeIcon />
              </BubbleButton>
              <BubbleButton
                onClick={() => setIsLinkModalOpen(true)}
                isActive={editor.isActive('link')}
              >
                <LinkIcon />
              </BubbleButton>
            </BubbleMenu>

            <EditorContent
              editor={editor}
              className="prose dark:prose-invert max-w-none p-4 focus:outline-none min-h-full"
            />
          </>
        )}
      </div>

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={handleImageInsert}
        uploadPath={uploadPath}
      />

      {/* Link Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onInsert={handleLinkInsert}
        initialUrl={editor.isActive('link') ? editor.getAttributes('link').href : ''}
      />
    </div>
  );
};

// Bubble Menu Button Component
const BubbleButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    className={`p-1.5 rounded transition-colors ${
      isActive
        ? 'bg-blue-500 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {children}
  </button>
);

// Icons
const BoldIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
  </svg>
);

const ItalicIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0v16m4-16h-4m0 16h4" transform="skewX(-10)" />
  </svg>
);

const UnderlineIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v6a5 5 0 0010 0V8M5 20h14" />
  </svg>
);

const StrikeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 12H7m10 0a4 4 0 01-4 4H9a4 4 0 01-4-4m12 0a4 4 0 00-4-4H9a4 4 0 00-4 4" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

export default MarkdownEditor;
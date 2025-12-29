// components/MarkdownEditor/EditorToolbar.tsx
import React, { useState } from "react";
import { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
  onImageClick: () => void;
  onLinkClick: () => void;
  isSourceMode: boolean;
  onToggleSourceMode: () => void;
  disabled?: boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onImageClick,
  onLinkClick,
  isSourceMode,
  onToggleSourceMode,
  disabled = false,
}) => {
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);

  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, isActive = false, disabled: btnDisabled = false, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || btnDisabled}
      title={title}
      className={`p-2 rounded transition-colors ${
        isActive
          ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />;

  return (
    <div className="toolbar flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
      {/* Heading Dropdown */}
      <div className="relative">
        <button
        type="button"
          onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
          disabled={disabled || isSourceMode}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          <span>
            {editor.isActive("heading", { level: 1 })
              ? "H1"
              : editor.isActive("heading", { level: 2 })
              ? "H2"
              : editor.isActive("heading", { level: 3 })
              ? "H3"
              : "Paragraph"}
          </span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showHeadingDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
            <button
            type="button"
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                setShowHeadingDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              Paragraph
            </button>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <button
                key={level}
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
                    .run();
                  setShowHeadingDropdown(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  level === 1
                    ? "text-2xl font-bold"
                    : level === 2
                    ? "text-xl font-bold"
                    : level === 3
                    ? "text-lg font-semibold"
                    : level === 4
                    ? "text-base font-semibold"
                    : "text-sm font-medium"
                }`}
              >
                Heading {level}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        disabled={isSourceMode}
        title="Bold (Ctrl+B)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h6.5a4.5 4.5 0 013.256 7.606A5 5 0 0113.5 20H6V4zm2 2v5h4.5a2.5 2.5 0 100-5H8zm0 7v5h5.5a3 3 0 000-6H8z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        disabled={isSourceMode}
        title="Italic (Ctrl+I)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 4v2h2.21l-3.42 12H6v2h8v-2h-2.21l3.42-12H18V4z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        disabled={isSourceMode}
        title="Underline (Ctrl+U)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 5v7a5 5 0 0010 0V5h-2v7a3 3 0 01-6 0V5H7zM5 19h14v2H5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        disabled={isSourceMode}
        title="Strikethrough"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.154 14a3.997 3.997 0 01-.586 2.097A4.002 4.002 0 0113 18.5H7.5V16H13a2 2 0 001.732-3H17.154zM3 12h18v2H3v-2zm2.846-2H13a2 2 0 00-1.732-3H7.5v2.5H13a4.002 4.002 0 013.568 2.403c.209.387.362.81.454 1.252z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        disabled={isSourceMode}
        title="Highlight"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.243 4.515l-6.738 6.737-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.737-6.738-4.242-4.242zm6.364 3.536a1 1 0 010 1.414l-7.778 7.778-2.122.707-1.414 1.414a1 1 0 01-1.414 0l-4.243-4.243a1 1 0 010-1.414l1.414-1.414.707-2.121 7.778-7.778a1 1 0 011.414 0l5.657 5.657zM5.636 18.364l2.828 2.828-4.242.707.707-4.243 .707.708z" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        disabled={isSourceMode}
        title="Bullet List"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 6a2 2 0 100-4 2 2 0 000 4zm5-3h12v2H9V3zm-5 9a2 2 0 100-4 2 2 0 000 4zm5-3h12v2H9V9zm-5 9a2 2 0 100-4 2 2 0 000 4zm5-3h12v2H9v-2z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        disabled={isSourceMode}
        title="Numbered List"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2 5V3h1v2H2zm0 6V9h1v2H2zm0 6v-2h1v2H2zm3-12h16v2H5V5zm0 6h16v2H5v-2zm0 6h16v2H5v-2z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
        disabled={isSourceMode}
        title="Task List"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 4h4v4H4V4zm6 1h10v2H10V5zM4 10h4v4H4v-4zm6 1h10v2H10v-2zM4 16h4v4H4v-4zm6 1h10v2H10v-2z" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* Quote & Code */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        disabled={isSourceMode}
        title="Quote"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        disabled={isSourceMode}
        title="Inline Code"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8.293 6.293L2.586 12l5.707 5.707 1.414-1.414L5.414 12l4.293-4.293-1.414-1.414zm7.414 0l-1.414 1.414L18.586 12l-4.293 4.293 1.414 1.414L21.414 12l-5.707-5.707z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        disabled={isSourceMode}
        title="Code Block"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm3 3h8v2H8V8zm0 4h5v2H8v-2z" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* Media */}
      <ToolbarButton onClick={onImageClick} disabled={isSourceMode} title="Insert Image">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm1 2v10h14V7H5zm3 3a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-2 6l3-3 2 2 4-4 4 4v1H6v0z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={onLinkClick}
        isActive={editor.isActive("link")}
        disabled={isSourceMode}
        title="Insert Link"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={isSourceMode || !editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5.828 7l2.536 2.536L6.95 10.95 2 6l4.95-4.95 1.414 1.414L5.828 5H13a8 8 0 110 16H5v-2h8a6 6 0 100-12H5.828z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={isSourceMode || !editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.172 7l-2.536 2.536 1.414 1.414L22 6l-4.95-4.95-1.414 1.414L18.172 5H11a8 8 0 100 16h8v-2h-8a6 6 0 110-12h7.172z" />
        </svg>
      </ToolbarButton>

      <div className="flex-1" />

      {/* Source Mode Toggle */}
      <ToolbarButton
        onClick={onToggleSourceMode}
        isActive={isSourceMode}
        title="Toggle Source Mode"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 17h4v-2H5v-2H3v4zm0-8h2V7h2V5H3v4zm8 12h2v-4h-2v1H9v2h2v1zm6-12h2v2h2V5h-4v2zm-8-4v2H7v2H5V3h6zm8 16v-2h2v-2h2v4h-4zm-8 0H7v-2H5v-2H3v4h6z" />
        </svg>
      </ToolbarButton>
    </div>
  );
};

export default EditorToolbar;

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThumbsUp, Edit2, Trash2, EyeOff, Check, X, Image as ImageIcon, FileText, Download, Video, Music, File } from 'lucide-react';
import { ChannelMessage, MessageAttachment } from '@/types/forum';
import { USER_ROLE } from '@/constants';

interface MessageContentProps {
  message: ChannelMessage;
  currentUserId?: string;
  currentUserRole?: string;
  isUpvoted: boolean;
  onToggleUpvote: (messageId: string) => void;
  onUpdateMessage: (messageId: string, text: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => void;
  onToggleHideMessage: (messageId: string, currentStatus: string) => void;
  className?: string;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-5 w-5" />;
    case 'video':
      return <Video className="h-5 w-5" />;
    case 'audio':
      return <Music className="h-5 w-5" />;
    case 'document':
      return <FileText className="h-5 w-5" />;
    default:
      return <File className="h-5 w-5" />;
  }
};

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  currentUserId,
  currentUserRole,
  isUpvoted,
  onToggleUpvote,
  onUpdateMessage,
  onDeleteMessage,
  onToggleHideMessage,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [selectedAttachment, setSelectedAttachment] = useState<MessageAttachment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const canModerate = currentUserId && (
    currentUserId === message.senderId ||
    currentUserRole === USER_ROLE.ADMIN ||
    currentUserRole === USER_ROLE.INSTRUCTOR
  );

  const canEdit = currentUserId === message.senderId;

  // Auto-resize textarea
  useEffect(() => {
    if (editTextareaRef.current && isEditing) {
      const textarea = editTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [editText, isEditing]);

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await onUpdateMessage(message.id, editText.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  const openAttachment = (attachment: MessageAttachment) => {
    setSelectedAttachment(attachment);
    setIsModalOpen(true);
  };

  const downloadAttachment = (attachment: MessageAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2 mt-1">
        <Textarea
          ref={editTextareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit();
            }
            if (e.key === 'Escape') {
              handleCancelEdit();
            }
          }}
          className="flex-1 min-h-[60px] max-h-[200px] text-base resize-none no-scrollbar"
          autoFocus
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className={`relative hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-sm group ${(message.senderRole === USER_ROLE.ADMIN || message.senderRole === USER_ROLE.INSTRUCTOR) ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-blue-500'
      : ''
      }`}>
      {message.status === 'HIDDEN' && (currentUserRole === USER_ROLE.ADMIN || currentUserRole === USER_ROLE.INSTRUCTOR) && (
        <div className="mb-1">
          <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium">
            <EyeOff className="h-3 w-3" />
            Hidden message - Click eye icon to approve/unhide
          </span>
        </div>
      )}
      <div className={`markdown-content text-lg text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap ${className}`}>
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="my-1 first:mt-0 last:mb-0">{children}</p>,
            // Bold
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,

            // Italic
            em: ({ children }) => <em className="italic">{children}</em>,

            // Inline code
            code: ({ inline, children, ...props }: any) =>
              inline ? (
                <code
                  className="bg-gray-200 dark:bg-gray-700 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-lg font-mono"
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <code className="text-sm font-mono text-gray-800 dark:text-gray-200" {...props}>
                  {children}
                </code>
              ),

            // Code block
            pre: ({ children }) => (
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md my-2 overflow-x-auto">
                {children}
              </pre>
            ),

            // Blockquote
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 py-1 my-2 italic text-gray-600 dark:text-gray-400">
                {children}
              </blockquote>
            ),

            // Links
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {children}
              </a>
            ),

            // Lists
            ul: ({ children }) => (
              <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="ml-2">{children}</li>,

            // Headings
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-bold mt-3 mb-2 first:mt-0">{children}</h3>
            ),

            // Horizontal rule
            hr: () => <hr className="my-4 border-gray-300 dark:border-gray-600" />,

            // Tables (if using remark-gfm)
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full border border-gray-300 dark:border-gray-600">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-gray-300 dark:border-gray-600">{children}</tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-2 text-left font-semibold">{children}</th>
            ),
            td: ({ children }) => <td className="px-4 py-2">{children}</td>,
          }}
        >
          {message.text}
        </ReactMarkdown>
      </div>

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {message.attachments.map((attachment, idx) => (
            <button
              key={idx}
              onClick={() => openAttachment(attachment)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors group cursor-pointer"
            >
              <div className="text-gray-600 dark:text-gray-400">
                {getFileIcon(attachment.type)}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                  {attachment.name || 'File'}
                </span>
                {attachment.size && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Attachment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <div className="mt-4 flex items-center justify-center">
            {selectedAttachment?.type === 'image' ? (
              <img
                src={selectedAttachment.url}
                alt={selectedAttachment.name || 'Image'}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : selectedAttachment?.type === 'video' ? (
              <video
                src={selectedAttachment.url}
                controls
                className="max-w-full max-h-[70vh] rounded-lg"
              />
            ) : selectedAttachment?.type === 'audio' ? (
              <div className="w-full max-w-md">
                <audio
                  src={selectedAttachment.url}
                  controls
                  className="w-full"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center text-center p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  {selectedAttachment && getFileIcon(selectedAttachment.type)}
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {selectedAttachment?.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  This file type cannot be previewed
                </p>
                <Button
                  onClick={() => selectedAttachment && downloadAttachment(selectedAttachment)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="truncate pr-4">{selectedAttachment?.name || 'Attachment'}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedAttachment && downloadAttachment(selectedAttachment)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action buttons */}
      <div className="absolute right-3 -top-5 flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleUpvote(message.id)}
          className={`h-8 px-2 text-sm ${isUpvoted ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <ThumbsUp className={`h-4 w-4 mr-1 ${isUpvoted ? 'fill-current' : ''}`} />
          {message.upvoteCount > 0 && message.upvoteCount}
        </Button>

        {canModerate && (
          <>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 px-2 text-sm text-gray-500"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteMessage(message.id)}
              className="h-8 px-2 text-sm text-gray-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {(currentUserRole === USER_ROLE.ADMIN || currentUserRole === USER_ROLE.INSTRUCTOR) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleHideMessage(message.id, message.status)}
                className={`h-8 px-2 text-sm ${message.status === 'HIDDEN' ? 'text-orange-600' : 'text-gray-500'
                  }`}
                title={message.status === 'HIDDEN' ? 'Unhide message' : 'Hide message'}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

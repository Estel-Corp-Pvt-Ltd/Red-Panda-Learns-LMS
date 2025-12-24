import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ForumChannel, ChannelMessage, MessageAttachment } from '@/types/forum';
import { forumChannelService, channelMessageService, messageUpvoteService } from '@/services/forumService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Hash, Send, MessageSquare, Loader2, Paperclip, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { USER_ROLE } from '@/constants';
import { Header } from '@/components/Header';
import { fileService } from '@/services/fileService';
import { MessageContent } from '@/components/MessageContent';

const Forum: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [channels, setChannels] = useState<ForumChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ForumChannel | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  // Message input
  const [messageText, setMessageText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedFilePreviews, setAttachedFilePreviews] = useState<{ file: File; preview: string | null }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    adjustTextareaHeight(textInputRef.current);
  }, [messageText]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load channels
  useEffect(() => {
    if (!courseId) return;

    setLoading(true);
    const unsubscribe = forumChannelService.subscribeToChannels(courseId, (loadedChannels) => {
      setChannels(loadedChannels);
      if (loadedChannels.length > 0 && !selectedChannel) {
        setSelectedChannel(loadedChannels[0]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  // Load messages
  useEffect(() => {
    if (!selectedChannel || !user) return;

    const unsubscribe = channelMessageService.subscribeToMessages(
      user.role || USER_ROLE.STUDENT,
      selectedChannel.id,
      user.id,
      (loadedMessages) => {
        setMessages(loadedMessages);
        setTimeout(scrollToBottom, 100);
      }
    );

    return () => unsubscribe();
  }, [selectedChannel, user]);

  // Load user upvotes
  useEffect(() => {
    if (!user || messages.length === 0) return;

    const loadUpvotes = async () => {
      const messageIds = messages.map((m) => m.id);
      const upvotes = await messageUpvoteService.getUserUpvotesForMessages(user.id, messageIds);
      setUserUpvotes(upvotes);
    };

    loadUpvotes();
  }, [user, messages]);

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const newPreviews: { file: File; preview: string | null }[] = [];

      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            newPreviews.push({ file, preview: reader.result as string });
            if (newPreviews.length === files.length) {
              setAttachedFilePreviews((prev) => [...prev, ...newPreviews]);
            }
          };
          reader.readAsDataURL(file);
        } else {
          newPreviews.push({ file, preview: null });
          if (newPreviews.length === files.length) {
            setAttachedFilePreviews((prev) => [...prev, ...newPreviews]);
          }
        }
      });

      setAttachedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const newPreviews: { file: File; preview: string | null }[] = [];

      newFiles.forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            newPreviews.push({ file, preview: reader.result as string });
            if (newPreviews.length === newFiles.length) {
              setAttachedFilePreviews((prev) => [...prev, ...newPreviews]);
            }
          };
          reader.readAsDataURL(file);
        } else {
          newPreviews.push({ file, preview: null });
          if (newPreviews.length === newFiles.length) {
            setAttachedFilePreviews((prev) => [...prev, ...newPreviews]);
          }
        }
      });

      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setAttachedFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      setUploadingFile(true);
      const path = `forum/${courseId}/${selectedChannel?.id}/${Date.now()}_${file.name}`;
      const result = await fileService.uploadAttachment(path, file);

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedChannel || !courseId) return;
    if (!messageText.trim() && attachedFiles.length === 0) return;

    setSending(true);
    const textToSend = messageText.trim();
    try {
      const attachments: MessageAttachment[] = [];

      // Upload all attached files
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const fileUrl = await uploadFile(file);
          if (!fileUrl) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          // Determine attachment type based on file type
          let attachmentType: MessageAttachment['type'] = 'other';
          if (file.type.startsWith('image/')) {
            attachmentType = 'image';
          } else if (file.type.startsWith('video/')) {
            attachmentType = 'video';
          } else if (file.type.startsWith('audio/')) {
            attachmentType = 'audio';
          } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
            attachmentType = 'document';
          }

          attachments.push({
            url: fileUrl,
            type: attachmentType,
            name: file.name,
            size: file.size,
          });
        }
      }

      const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
      const result = await channelMessageService.sendMessage({
        senderId: user.id,
        senderName: displayName,
        senderRole: (user.role as any) || USER_ROLE.STUDENT,
        text: textToSend,
        attachments,
        status: 'ACTIVE',
        courseId,
        channelId: selectedChannel.id,
      }, selectedChannel.isModerated);

      if (result.success) {
        setMessageText('');
        setAttachedFiles([]);
        setAttachedFilePreviews([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Show message if channel is moderated and user is not admin/instructor
        if (selectedChannel.isModerated && user.role !== USER_ROLE.ADMIN && user.role !== USER_ROLE.INSTRUCTOR) {
          toast({
            title: 'Message submitted for review',
            description: 'Your message will be visible after approval from an instructor or admin.',
          });
        }
      } else {
        throw new Error(result.error?.message || 'Failed to send message');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleToggleUpvote = async (messageId: string) => {
    if (!user || !courseId || !selectedChannel) return;

    try {
      const result = await messageUpvoteService.toggleUpvote(
        user.id,
        messageId,
        courseId,
        selectedChannel.id
      );

      if (result.success) {
        if (result.data.isUpvoted) {
          setUserUpvotes((prev) => new Set(prev).add(messageId));
        } else {
          setUserUpvotes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            return newSet;
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to toggle upvote',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateMessage = async (messageId: string, text: string) => {
    try {
      const result = await channelMessageService.updateMessage(messageId, text);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update message');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;

    try {
      const result = await channelMessageService.deleteMessage(messageId);

      if (result.success) {
        toast({
          title: 'Message deleted',
        });
      } else {
        throw new Error(result.error?.message || 'Failed to delete message');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleHideMessage = async (messageId: string, currentStatus: string) => {
    try {
      const result = await channelMessageService.toggleMessageVisibility(
        messageId,
        currentStatus as any
      );

      if (result.success) {
        toast({
          title: currentStatus === 'HIDDEN' ? 'Message unhidden' : 'Message hidden',
        });
      } else {
        throw new Error(result.error?.message || 'Failed to toggle message visibility');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Channels */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Channels
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {channels.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No channels
              </div>
            ) : (
              <div className="space-y-0.5 px-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full text-left px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${selectedChannel?.id === channel.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <Hash className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-lg font-medium">{channel.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="h-14 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Hash className="h-5 w-5 text-gray-500" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedChannel.name}
                  </h1>
                  {selectedChannel.description && (
                    <p className="text-base text-muted-foreground">{selectedChannel.description}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-2"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-lg">No messages yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {messages.map((message, idx) => {
                      const showAvatar = idx === 0 || messages[idx - 1].senderId !== message.senderId;

                      return (
                        <div
                          key={message.id}
                          className={`-mx-2 px-1 rounded ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
                        >
                          <div className="flex gap-2">
                            {showAvatar ? (
                              <Avatar className="h-9 w-9 mt-0.5">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                                  {getInitials(message.senderName)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-9" />
                            )}

                            <div className="flex-1 min-w-0">
                              {showAvatar && (
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className="font-semibold text-lg text-gray-900 dark:text-white">
                                    {message.senderName}
                                  </span>
                                  <span className="text-base text-gray-500">
                                    {formatMessageTime(message.createdAt)}
                                  </span>
                                  {message.isEdited && (
                                    <span className="text-base text-gray-400">(edited)</span>
                                  )}
                                </div>
                              )}

                              <MessageContent
                                message={message}
                                currentUserId={user?.id}
                                currentUserRole={user?.role}
                                isUpvoted={userUpvotes.has(message.id)}
                                onToggleUpvote={handleToggleUpvote}
                                onUpdateMessage={handleUpdateMessage}
                                onDeleteMessage={handleDeleteMessage}
                                onToggleHideMessage={handleToggleHideMessage}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Drag overlay */}
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-50/90 dark:bg-blue-900/20 flex items-center justify-center border-4 border-dashed border-blue-400 dark:border-blue-600 rounded-lg z-50">
                    <div className="text-center">
                      <Paperclip className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">Drop file to attach</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {attachedFilePreviews.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {attachedFilePreviews.map((item, index) => (
                        <div key={index} className="relative group">
                          {item.preview ? (
                            <div className="relative">
                              <img
                                src={item.preview}
                                alt={item.file.name}
                                className="w-24 h-24 rounded-lg border-2 border-gray-300 dark:border-gray-600 object-cover"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate">
                                {item.file.name}
                              </div>
                            </div>
                          ) : (
                            <div className="relative w-24 h-24 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center p-2">
                              <Paperclip className="h-6 w-6 text-gray-500 mb-1" />
                              <span className="text-xs text-gray-600 dark:text-gray-400 text-center truncate w-full px-1">
                                {item.file.name}
                              </span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || uploadingFile}
                    className="h-9 w-9 p-0 flex-shrink-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Textarea
                    ref={textInputRef}
                    placeholder="Type a message... (Shift+Enter for new line)"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sending || uploadingFile}
                    className="flex-1 min-h-[60px] max-h-[200px] resize-none text-lg"
                    rows={1}
                  />

                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || uploadingFile || (!messageText.trim() && attachedFiles.length === 0)}
                    size="sm"
                    className="h-9 px-3 flex-shrink-0"
                  >
                    {sending || uploadingFile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Select a channel to start</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default Forum;

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ForumChannel, ChannelMessage, MessageType } from '@/types/forum';
import { forumChannelService, channelMessageService, messageUpvoteService } from '@/services/forumService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Hash, Send, ThumbsUp, Edit2, Trash2, Eye, EyeOff, Link as LinkIcon, Image as ImageIcon, MessageSquare, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { USER_ROLE } from '@/constants';

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

  // Message input
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('TEXT');
  const [messageUrl, setMessageUrl] = useState('');

  // Edit modal
  const [editingMessage, setEditingMessage] = useState<ChannelMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!selectedChannel) return;

    const unsubscribe = channelMessageService.subscribeToMessages(
      selectedChannel.id,
      (loadedMessages) => {
        setMessages(loadedMessages);
        scrollToBottom();
      }
    );

    return () => unsubscribe();
  }, [selectedChannel]);

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

  const handleSendMessage = async () => {
    if (!user || !selectedChannel || !courseId || !messageText.trim()) return;

    setSending(true);
    try {
      const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
      const result = await channelMessageService.sendMessage({
        senderId: user.id,
        senderName: displayName,
        senderRole: (user.role as any) || USER_ROLE.STUDENT,
        messageType,
        content: {
          text: messageText.trim(),
          url: messageType !== 'TEXT' && messageUrl.trim() ? messageUrl.trim() : null,
        },
        status: 'ACTIVE',
        courseId,
        channelId: selectedChannel.id,
      });

      if (result.success) {
        setMessageText('');
        setMessageUrl('');
        setMessageType('TEXT');
        toast({
          title: 'Message sent',
          description: 'Your message has been posted successfully.',
        });
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

  const handleEditMessage = (message: ChannelMessage) => {
    setEditingMessage(message);
    setEditText(message.content.text);
    setEditUrl(message.content.url || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      const result = await channelMessageService.updateMessage(editingMessage.id, {
        text: editText.trim(),
        url: editUrl.trim() || null,
      });

      if (result.success) {
        setShowEditModal(false);
        setEditingMessage(null);
        toast({
          title: 'Message updated',
          description: 'Your message has been updated successfully.',
        });
      } else {
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
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const result = await channelMessageService.deleteMessage(messageId);

      if (result.success) {
        toast({
          title: 'Message deleted',
          description: 'The message has been deleted successfully.',
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

  const handleHideMessage = async (messageId: string) => {
    try {
      const result = await channelMessageService.hideMessage(messageId);

      if (result.success) {
        toast({
          title: 'Message hidden',
          description: 'The message has been hidden successfully.',
        });
      } else {
        throw new Error(result.error?.message || 'Failed to hide message');
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

  const canModerateMessage = (message: ChannelMessage) => {
    if (!user) return false;
    return (
      user.id === message.senderId ||
      user.role === USER_ROLE.ADMIN ||
      user.role === USER_ROLE.INSTRUCTOR
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Channels */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Forum Channels
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {channels.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No channels available
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${selectedChannel?.id === channel.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  <Hash className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm font-medium">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-gray-500" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedChannel.name}
                </h1>
              </div>
              {selectedChannel.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedChannel.description}</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No messages yet. Be the first to start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <Card key={message.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(message.senderName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {message.senderName}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {message.senderRole}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.createdAt)}
                            </span>
                            {message.isEdited && (
                              <span className="text-xs text-muted-foreground italic">(edited)</span>
                            )}
                          </div>

                          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                            {message.content.text}
                          </div>

                          {message.content.url && (
                            <div className="mt-2">
                              {message.messageType === 'IMAGE' ? (
                                <img
                                  src={message.content.url}
                                  alt="Attached image"
                                  className="max-w-md rounded-lg border border-gray-200 dark:border-gray-700"
                                />
                              ) : (
                                <a
                                  href={message.content.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                  {message.content.url}
                                </a>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUpvote(message.id)}
                              className={`gap-1 ${userUpvotes.has(message.id) ? 'text-primary' : ''
                                }`}
                            >
                              <ThumbsUp
                                className={`h-4 w-4 ${userUpvotes.has(message.id) ? 'fill-current' : ''
                                  }`}
                              />
                              {message.upvoteCount}
                            </Button>

                            {canModerateMessage(message) && (
                              <>
                                {user?.id === message.senderId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditMessage(message)}
                                    className="gap-1"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    Edit
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="gap-1 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </Button>

                                {(user?.role === USER_ROLE.ADMIN ||
                                  user?.role === USER_ROLE.INSTRUCTOR) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleHideMessage(message.id)}
                                      className="gap-1"
                                    >
                                      <EyeOff className="h-4 w-4" />
                                      Hide
                                    </Button>
                                  )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={messageType}
                    onValueChange={(value: MessageType) => setMessageType(value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="LINK">Link</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                    </SelectContent>
                  </Select>

                  {messageType !== 'TEXT' && (
                    <Input
                      placeholder={messageType === 'LINK' ? 'Enter URL' : 'Enter image URL'}
                      value={messageUrl}
                      onChange={(e) => setMessageUrl(e.target.value)}
                      className="flex-1"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 min-h-[60px] max-h-[200px]"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !messageText.trim()}
                    className="gap-2"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Message Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>Make changes to your message</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-text">Message</Label>
              <Textarea
                id="edit-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>

            {editingMessage?.messageType !== 'TEXT' && (
              <div>
                <Label htmlFor="edit-url">
                  {editingMessage?.messageType === 'LINK' ? 'URL' : 'Image URL'}
                </Label>
                <Input
                  id="edit-url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editText.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Forum;

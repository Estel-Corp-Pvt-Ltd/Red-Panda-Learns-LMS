import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { forumChannelService } from "@/services/forumService";
import { ForumChannel } from "@/types/forum";
import { Archive, Edit2, Hash, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from "react";

interface AdditionalTabProps {
  isMailSendingEnabled: boolean;
  setIsMailSendingEnabled: (value: boolean) => void;
  isCertificateEnabled?: boolean;
  setIsCertificateEnabled?: (value: boolean) => void;
  isForumEnabled: boolean;
  setIsForumEnabled: (value: boolean) => void;
  courseId?: string;
  customCertificateName: string;
  setCustomCertificateName: (value: string) => void;
  onSave: () => Promise<void> | void;
};

const AdditionalTab = ({
  isMailSendingEnabled,
  setIsMailSendingEnabled,
  isCertificateEnabled,
  setIsCertificateEnabled,
  isForumEnabled,
  setIsForumEnabled,
  courseId,
  customCertificateName,
  setCustomCertificateName,
  onSave,
}: AdditionalTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [channels, setChannels] = useState<ForumChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ForumChannel | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order: 1,
    isModerated: false,
  });

  useEffect(() => {
    if (courseId) {
      loadChannels();
    }
  }, [courseId]);

  const loadChannels = async () => {
    if (!courseId) return;

    setLoadingChannels(true);
    try {
      const result = await forumChannelService.getChannelsByCourse(courseId);
      if (result.success && result.data) {
        setChannels(result.data);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleOpenModal = (channel?: ForumChannel) => {
    if (channel) {
      setEditingChannel(channel);
      setFormData({
        name: channel.name,
        description: channel.description,
        order: channel.order,
        isModerated: channel.isModerated || false,
      });
    } else {
      setEditingChannel(null);
      setFormData({
        name: '',
        description: '',
        order: channels.length + 1,
        isModerated: false,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingChannel(null);
    setFormData({
      name: '',
      description: '',
      order: 1,
      isModerated: false,
    });
  };

  const handleSaveChannel = async () => {
    if (!courseId || !user) return;

    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Channel name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingChannel) {
        // Update existing channel
        const result = await forumChannelService.updateChannel(editingChannel.id, formData);
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Channel updated successfully',
          });
          loadChannels();
          handleCloseModal();
        } else {
          throw new Error(result.error?.message || 'Failed to update channel');
        }
      } else {
        // Create new channel
        const result = await forumChannelService.createChannel({
          ...formData,
          courseId,
          createdBy: user.id,
          isArchived: false,
          isModerated: formData.isModerated,
        });

        if (result.success) {
          toast({
            title: 'Success',
            description: 'Channel created successfully',
          });
          loadChannels();
          handleCloseModal();
        } else {
          throw new Error(result.error?.message || 'Failed to create channel');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (channelId: string) => {
    if (!confirm('Are you sure you want to archive this channel?')) return;

    try {
      const result = await forumChannelService.archiveChannel(channelId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Channel archived successfully',
        });
        loadChannels();
      } else {
        throw new Error(result.error?.message || 'Failed to archive channel');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm('Are you sure you want to permanently delete this channel? This action cannot be undone.')) return;

    try {
      const result = await forumChannelService.deleteChannel(channelId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Channel deleted successfully',
        });
        loadChannels();
      } else {
        throw new Error(result.error?.message || 'Failed to delete channel');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6 p-6 bg-card rounded-lg border">
        <h2 className="text-xl font-semibold">Additional Settings</h2>

        {/* Mail Sending Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="mail-sending" className="text-base font-medium">
              Enable Mail Sending
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, email notifications will be automatically sent to
              students enrolled in the course whenever a new assignment or lesson
              is added.
              <br />
              If not enabled, an announcement will still be created for the added
              assignment or lesson, but no email notifications will be sent.
            </p>
          </div>

          <Switch
            id="mail-sending"
            checked={isMailSendingEnabled}
            onCheckedChange={setIsMailSendingEnabled}
            className="bg-gray-200 dark:bg-gray-700 dark:data-[state=checked]:bg-primary"
          />
        </div>

        {/* Certificate Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="enable-certificate" className="text-base font-medium">
              Enable Certificate
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, students will receive a certificate upon completing the course.
              <br />
              Disabling this option will prevent students from receiving a certificate.
            </p>
          </div>

          <Switch
            id="enable-certificate"
            checked={isCertificateEnabled}
            onCheckedChange={(checked) => setIsCertificateEnabled?.(checked)}
            className="bg-gray-200 dark:bg-gray-700 dark:data-[state=checked]:bg-primary"
          />
        </div>

        {/* Forum Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="enable-forum" className="text-base font-medium">
              Enable Forum
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, students will have access to forum channels for discussions.
              <br />
              You can create and manage multiple channels below once the forum is enabled.
            </p>
          </div>

          <Switch
            id="enable-forum"
            checked={isForumEnabled}
            onCheckedChange={(checked) => setIsForumEnabled?.(checked)}
            className="bg-gray-200 dark:bg-gray-700 dark:data-[state=checked]:bg-primary"
          />
        </div>

        {/* Custom Certificate Name Input (Conditionally Rendered) */}
        {isCertificateEnabled && (
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="certificate-name" className="text-base font-medium">
                Custom Certificate Name
              </Label>
              <p className="text-sm text-muted-foreground">
                Customize the name that appears on the certificate. By default, it
                uses the course title.
              </p>
            </div>
            <Input
              id="certificate-name"
              value={customCertificateName}
              onChange={(e) => setCustomCertificateName(e.target.value)}
              placeholder="Enter custom certificate name"
            />
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={onSave}>Save Settings</Button>
        </div>

        {/* Forum Channels Section */}
        {isForumEnabled && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Forum Channels</CardTitle>
                  <CardDescription>
                    {channels.length} channel{channels.length !== 1 ? 's' : ''} configured
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenModal()} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Channel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingChannels ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Hash className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No channels created yet</p>
                  <Button onClick={() => handleOpenModal()} variant="outline" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Channel
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-40 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.map((channel) => (
                      <TableRow key={channel.id}>
                        <TableCell>
                          <Badge variant="outline">{channel.order}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{channel.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {channel.description || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={channel.isArchived ? 'secondary' : 'default'}>
                              {channel.isArchived ? 'Archived' : 'Active'}
                            </Badge>
                            {channel.isModerated && (
                              <Badge variant="outline" className="text-xs">
                                Moderated
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(channel)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {!channel.isArchived && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(channel.id)}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(channel.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingChannel ? 'Edit Channel' : 'Create Channel'}</DialogTitle>
              <DialogDescription>
                {editingChannel ? 'Update channel details' : 'Add a new discussion channel'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Channel Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., General Discussion"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this channel"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers appear first in the channel list
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="moderation" className="text-base font-medium">
                    Enable Moderation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, all messages in this channel will be hidden by default and require approval from an admin or instructor before becoming visible to students.
                  </p>
                </div>
                <Switch
                  id="moderation"
                  checked={formData.isModerated}
                  onCheckedChange={(checked) => setFormData({ ...formData, isModerated: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button onClick={handleSaveChannel}>
                {editingChannel ? 'Update' : 'Create'} Channel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdditionalTab;

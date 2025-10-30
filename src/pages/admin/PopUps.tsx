import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import { popUpService } from '@/services/popupService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  PlusCircle
} from 'lucide-react';
import { PopUpCourseType } from '@/types/general';
import { PopUp } from '@/types/pop-up';
import { POPUP_COURSE_TYPE } from '@/constants';
import ConfirmDialog from '@/components/ConfirmDialog';

interface PaginatedPopUps {
  data: PopUp[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const StatusBadge = ({ active }: { active: boolean }) => (
  <Badge variant={active ? "default" : "secondary"}>
    {active ? "Active" : "Inactive"}
  </Badge>
);

const AdminPopUps: React.FC = () => {
  const { toast } = useToast();
  const [popUps, setPopUps] = useState<PaginatedPopUps>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [type, setType] = useState<PopUpCourseType>(POPUP_COURSE_TYPE.LIVE);
  const [autoClose, setAutoClose] = useState(false);
  const [duration, setDuration] = useState(5000);
  const [active, setActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPopUp, setSelectedPopUp] = useState<PopUp | null>(null);

  const loadPopUps = async (options = {}) => {
    setIsLoading(true);
    try {
      const result = await popUpService.getPopUps([], {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setPopUps(prev => ({
          ...result.data,
          totalCount: result.data.data.length
        }));
      } else {
        toast({
          title: "Error",
          description: "Failed to load pop-ups",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pop-ups",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!popUps.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: popUps.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadPopUps({
      cursor: popUps.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!popUps.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: popUps.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadPopUps({
      cursor: popUps.previousCursor,
      pageDirection: 'previous'
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Validation",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingId) {
        await popUpService.updatePopUp(editingId, {
          title,
          description,
          type,
          ctaText,
          ctaLink,
          active,
          autoClose,
          duration,
        });
        toast({
          title: "Updated",
          description: "Pop-up updated successfully.",
        });
      } else {
        await popUpService.createPopUp({
          title,
          description,
          type,
          ctaText,
          ctaLink,
          autoClose,
          duration,
          active,
        });
        toast({
          title: "Created",
          description: "Pop-up created successfully.",
        });
      }

      resetForm();
      await loadPopUps();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save pop-up",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedPopUp) return;
    const result = await popUpService.deletePopUp(selectedPopUp.id);
    if (!result.success) {
      toast({
        title: "Error",
        description: "Failed to delete pop-up.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Deleted", description: "Pop-up deleted successfully." });
    await loadPopUps();
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setCtaText("");
    setCtaLink("");
    setType(POPUP_COURSE_TYPE.LIVE);
    setActive(false);
    setAutoClose(false);
    setDuration(5000);
    setIsEditing(false);
    setEditingId(null);
  }

  const formatDuration = (ms: number) => {
    return `${ms}ms`;
  };

  useEffect(() => {
    loadPopUps();
  }, []);

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Pop-Ups</CardTitle>
              <CardDescription>
                Manage all pop-ups and their configurations.
                {popUps.totalCount > 0 && ` (Page ${paginationState.currentPage})`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Form wrapper */}
            <div className="rounded-lg border bg-card p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Title */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Pop-up title"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Description"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select value={type} onValueChange={(v) => setType(v as PopUpCourseType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(POPUP_COURSE_TYPE).map((val) => (
                          <SelectItem key={val} value={val}>
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CTA Text */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">CTA Text</label>
                    <Input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="CTA text"
                    />
                  </div>

                  {/* CTA Link */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">CTA Link</label>
                    <Input
                      type="text"
                      value={ctaLink}
                      onChange={(e) => setCtaLink(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  {/* Status */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={active ? "true" : "false"} onValueChange={(v) => setActive(v === "true")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auto-close */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Settings</label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="autoClose"
                        checked={autoClose}
                        onCheckedChange={(checked) => setAutoClose(checked as boolean)}
                      />
                      <label htmlFor="autoClose" className="text-sm font-medium leading-none">
                        Auto-close
                      </label>
                    </div>
                  </div>

                  {/* Duration (ms) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Duration (ms)</label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      placeholder="5000"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="flex items-center gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isEditing ? "Update Pop-up" : "Add Pop-up"}
                  </Button>

                  {isEditing && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Pop-ups List */}
            {isLoading && popUps.data.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : popUps.data.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No pop-ups</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started by creating your first pop-up.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>CTA</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Auto Close</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {popUps.data.map((pop) => (
                        <TableRow key={pop.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {pop.title}
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate">
                            {pop.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{pop.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {pop.ctaText ? (
                              <a
                                href={pop.ctaLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {pop.ctaText}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge active={pop.active} />
                          </TableCell>
                          <TableCell>{pop.autoClose ? "Yes" : "No"}</TableCell>
                          <TableCell>{formatDuration(pop.duration || 5000)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setIsEditing(true);
                                  setEditingId(pop.id);
                                  setTitle(pop.title);
                                  setDescription(pop.description);
                                  setType(pop.type);
                                  setCtaText(pop.ctaText);
                                  setCtaLink(pop.ctaLink);
                                  setActive(pop.active);
                                  setAutoClose(pop.autoClose || false);
                                  setDuration(pop.duration || 5000);
                                }}
                                title="Edit pop-up"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPopUp(pop);
                                  setConfirmOpen(true);
                                }}
                                title="Delete pop-up"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {popUps.data.length} pop-ups
                    {popUps.totalCount > popUps.data.length &&
                      ` (page ${paginationState.currentPage})`
                    }
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={!popUps.hasPreviousPage || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!popUps.hasNextPage || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          handleDelete()
          setConfirmOpen(false);
        }}
        title="Delete"
        body="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </AdminLayout>
  );
};

export default AdminPopUps;

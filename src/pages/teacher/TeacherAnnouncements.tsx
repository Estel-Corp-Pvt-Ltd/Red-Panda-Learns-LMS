import TeacherLayout from "@/components/TeacherLayout";
import TeacherAddAnnouncementModal from "@/components/teacher/TeacherAddAnnouncementModal";
import { ClassDivisionFilter } from "@/components/teacher/ClassDivisionFilter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { announcementService } from "@/services/announcementService";
import { Announcement } from "@/types/announcements";
import {
  AlertTriangle,
  Building2,
  Calendar,
  HelpCircle,
  Loader2,
  Megaphone,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const TeacherAnnouncements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const handleFilterChange = useCallback(
    (cls: string | null, div: string | null) => {
      setSelectedClass(cls);
      setSelectedDivision(div);
    },
    []
  );

  const filteredAnnouncements = useMemo(() => {
    if (!selectedClass && !selectedDivision) return announcements;
    return announcements.filter((a) => {
      const matchesClass = !selectedClass || !a.targetClass || a.targetClass === selectedClass;
      const matchesDivision = !selectedDivision || !a.targetDivision || a.targetDivision === selectedDivision;
      return matchesClass && matchesDivision;
    });
  }, [announcements, selectedClass, selectedDivision]);

  useEffect(() => {
    fetchAnnouncements();
  }, [user?.organizationId]);

  const fetchAnnouncements = async () => {
    if (!user?.organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await announcementService.getOrganizationAnnouncements(user.organizationId);
      if (result.success && result.data) {
        setAnnouncements(result.data);
      } else {
        toast({ title: "Error", description: "Failed to fetch announcements", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setEditTitle(announcement.title);
    setEditBody(announcement.body);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedAnnouncement) return;
    if (!editTitle.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    setEditSaving(true);
    try {
      const result = await announcementService.updateOrganizationAnnouncement(
        selectedAnnouncement.id,
        { title: editTitle.trim(), body: editBody.trim() }
      );

      if (result.success) {
        toast({ title: "Updated", description: "Announcement updated successfully!" });
        setIsEditDialogOpen(false);
        fetchAnnouncements();
      } else {
        toast({ title: "Error", description: "Failed to update announcement", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to update announcement:", error);
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAnnouncement) return;

    setDeleting(true);
    try {
      const result = await announcementService.deleteOrganizationAnnouncement(selectedAnnouncement.id);
      if (result.success) {
        toast({ title: "Deleted", description: "Announcement deleted successfully!" });
        setIsDeleteDialogOpen(false);
        fetchAnnouncements();
      } else {
        toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    try {
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return date.toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  if (!user?.organizationId) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
          <h2 className="text-2xl font-bold">Not Assigned to an Organization</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Please contact your administrator to get assigned to an organization.
          </p>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Announcements</h1>
              <p className="text-muted-foreground">
                Create and manage announcements for your organization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p>Announcements you create here are visible only to users in your organization. They will not be seen by other organizations.</p>
              </TooltipContent>
            </Tooltip>
            <Button variant="outline" onClick={fetchAnnouncements} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </div>
        </div>

        {/* Filter */}
        <ClassDivisionFilter
          organizationId={user.organizationId}
          onFilterChange={handleFilterChange}
        />

        {/* Announcements List */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Announcements</CardTitle>
            <CardDescription>
              {selectedClass || selectedDivision
                ? `${filteredAnnouncements.length} of ${announcements.length} announcement${announcements.length !== 1 ? "s" : ""}`
                : `${announcements.length} announcement${announcements.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading announcements...</span>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No announcements yet</p>
                <p className="text-sm mt-1">Click "Create Announcement" to add your first one</p>
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No announcements match the current filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Organization
                          </Badge>
                          {announcement.targetClass && (
                            <Badge variant="secondary" className="text-xs">
                              {announcement.targetClass}
                            </Badge>
                          )}
                          {announcement.targetDivision && (
                            <Badge variant="secondary" className="text-xs">
                              Div {announcement.targetDivision}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg">{announcement.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {announcement.body}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {formatDate(announcement.createdAt)}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditClick(announcement)}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(announcement)}
                            className="flex items-center gap-2 text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Modal */}
        <TeacherAddAnnouncementModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          organizationId={user.organizationId}
          createdBy={user.id}
          onSuccess={fetchAnnouncements}
        />

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit Announcement
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-body">Content</Label>
                <Textarea
                  id="edit-body"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={editSaving}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={editSaving}>
                  {editSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Delete Announcement
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this announcement? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TeacherLayout>
  );
};

export default TeacherAnnouncements;

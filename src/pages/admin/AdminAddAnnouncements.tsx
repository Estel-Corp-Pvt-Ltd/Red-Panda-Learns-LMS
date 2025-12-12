import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { announcementService } from "@/services/announcementService";
import { createAnnouncementApi } from "@/services/createAnnouncementApi";
import {
  Megaphone,
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Globe,
  BookOpen,
  RefreshCw,
  Calendar,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import AddAnnouncementModal from "@/components/admin/AdminAddAnnouncementsModal";
import EditAnnouncementModal from "@/components/admin/EditAnnouncementModal";
import { Announcement } from "@/types/announcements";
import { Timestamp } from "firebase/firestore";
import { ANNOUNCEMENT_SCOPE } from "@/constants";
import { formatDate } from "@/utils/date-time";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const AdminAnnouncements: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const result = await announcementService.getAllAnnouncements(100);
      if (result.success && result.data) {
        setAnnouncements(result.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch announcements",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      toast({
        title: "Error",
        description: "Failed to fetch announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementCreated = () => {
    fetchAnnouncements();
  };

  const handleEditClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDeleteDialogOpen(true);
  };

  const handleLinkClick = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();

    if (!link) return;

    if (isExternalLink(link)) {
      // External link - open in new tab
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      // Internal link - use navigate
      navigate(link);
    }
  };

  const stripHtmlTags = (html: string): string => {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "").trim();
  };

  const isExternalLink = (url: string): boolean => {
    if (!url) return false;

    // Check if it starts with http://, https://, or //
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("//")
    ) {
      // Check if it's pointing to the same domain
      try {
        const linkUrl = new URL(url, window.location.origin);
        return linkUrl.origin !== window.location.origin;
      } catch {
        return true;
      }
    }

    // If it starts with /, it's internal
    return false;
  };
  const extractLinkFromHtml = (html: string): string | null => {
    if (!html) return null;

    // Match anchor tag and extract href
    const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>/i;
    const match = html.match(anchorRegex);

    return match ? match[1] : null;
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAnnouncement?.id) return;

    setDeleting(true);
    try {
      const idToken = await authService.getToken();
      await createAnnouncementApi.deleteAnnouncement(
        selectedAnnouncement.id,
        idToken
      );

      toast({
        title: "Success",
        description: "Announcement deleted successfully!",
      });

      setIsDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      toast({
        title: "Error",
        description: "Failed to delete announcement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getScopeLabel = (scope: string | undefined) => {
    if (scope === ANNOUNCEMENT_SCOPE.GLOBAL) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          Global
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <BookOpen className="h-3 w-3" />
        Course
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Announcements</h1>
              <p className="text-muted-foreground">
                Manage and create announcements for students
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchAnnouncements}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Announcement
            </Button>
          </div>
        </div>

        {/* Announcements List */}
        <Card>
          <CardHeader>
            <CardTitle>All Announcements</CardTitle>
            <CardDescription>
              View and manage all announcements ({announcements.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                  Loading announcements...
                </span>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No announcements found</p>
                <p className="text-sm mt-1">
                  Click "Create Announcement" to add a new one
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => {
                  const link = extractLinkFromHtml(announcement.body);
                  const hasLink = link !== null;
                  const plainText = stripHtmlTags(announcement.body);
                  const isExternal = hasLink && isExternalLink(link);

                  return (
                    // <-- Add the return statement here
                    <div
                      key={announcement.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getScopeLabel(announcement.scope)}
                            {announcement.courseId && (
                              <Badge variant="outline" className="text-xs">
                                {announcement.courseId}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg truncate">
                            {announcement.title}
                          </h3>
                          {/* Body Content */}
                          <div className="mb-2">
                            {plainText && (
                              <p className={cn("text-sm line-clamp-2")}>
                                {plainText}
                              </p>
                            )}

                            {/* View Button */}
                            {/* View Button */}
                            {hasLink && link && (
                              <button
                                onClick={(e) => handleLinkClick(e, link)}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 group bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                {isExternal ? "Open Link" : "View"}
                                {isExternal ? (
                                  <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                ) : (
                                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created: {formatDate(announcement.createdAt)}
                            </span>
                            {announcement.updatedAt && (
                              <span className="flex items-center gap-1">
                                Updated: {formatDate(announcement.updatedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0"
                            >
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Announcement Modal */}
        <AddAnnouncementModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onSuccess={handleAnnouncementCreated}
        />

        {/* Edit Announcement Modal */}
        <EditAnnouncementModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          announcement={selectedAnnouncement}
          onSuccess={fetchAnnouncements}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Delete Announcement
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Are you sure you want to delete this announcement? This
                    action cannot be undone.
                  </p>
                  {selectedAnnouncement && (
                    <div className="bg-muted rounded-md p-3">
                      <p className="font-medium">
                        {selectedAnnouncement.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {selectedAnnouncement.body}
                      </p>
                    </div>
                  )}
                </div>
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
    </AdminLayout>
  );
};

export default AdminAnnouncements;

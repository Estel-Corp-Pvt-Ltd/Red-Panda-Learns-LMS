import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { Loader2, Save, Pencil } from "lucide-react";
import React, { useState, useEffect } from "react";
import { createAnnouncementApi } from "@/services/createAnnouncementApi";
import { Announcement } from "@/types/announcements";

interface EditAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement | null;
  onSuccess?: () => void;
}

const EditAnnouncementModal: React.FC<EditAnnouncementModalProps> = ({
  open,
  onOpenChange,
  announcement,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when announcement changes
  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || "");
      setBody(announcement.body || "");
    }
  }, [announcement]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!announcement?.id) {
      toast({
        title: "Error",
        description: "No announcement selected",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter an announcement title.",
        variant: "destructive",
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: "Body required",
        description: "Please enter the announcement content.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // const idToken = await authService.getToken();
      //
      // await createAnnouncementApi.updateAnnouncement(
      //   announcement.id,
      //   { title: title.trim(), body: body.trim() },
      //   idToken
      // );
      //
      // toast({
      //   title: "Success",
      //   description: "Announcement updated successfully!",
      // });
      //
      // onOpenChange(false);
      // onSuccess?.();
      console.warn("updateAnnouncement call is disabled");
      toast({
        title: "Temporarily Disabled",
        description: "Updating announcements is temporarily disabled.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Failed to update announcement:", error);
      toast({
        title: "Error",
        description: "Failed to update announcement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Announcement
          </DialogTitle>
          <DialogDescription>
            Update the announcement title and content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-title"
              placeholder="Enter announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/200
            </p>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="edit-body">
              Content <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-body"
              placeholder="Write your announcement here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSubmitting}
              rows={6}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length}/2000
            </p>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Preview
              </p>
              <h3 className="font-semibold text-lg">
                {title || "Untitled"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {body || "No content"}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !body.trim()}
              className="flex-1 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAnnouncementModal;
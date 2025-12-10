import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BACKEND_URL } from "@/config";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { Loader2, Megaphone, Send } from "lucide-react";
import React, { useState } from "react";
import { AnnouncementStatus } from "@/types/general";
import { ANNOUNCEMENT_STATUS } from "@/constants";

interface AnnouncementForm {
  title: string;
  body: string;
  status: AnnouncementStatus;
}

const AdminCreateAnnouncement: React.FC = () => {
  const [form, setForm] = useState<AnnouncementForm>({
    title: "",
    body: "",
    status: ANNOUNCEMENT_STATUS.PUBLISHED, // Default status is PUBLISHED
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: AnnouncementStatus) => {
    setForm((prev) => ({ ...prev, status: value }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      body: "",
      status: ANNOUNCEMENT_STATUS.PUBLISHED, // Reset to PUBLISHED
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter an announcement title.",
        variant: "destructive",
      });
      return;
    }

    if (!form.body.trim()) {
      toast({
        title: "Body required",
        description: "Please enter the announcement content.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await authService.getToken();

      const res = await fetch(`${BACKEND_URL}/createGlobalAnnouncement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body.trim(),
          status: form.status, // Send status directly
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create announcement");
      }

      toast({
        title: "Announcement Created! 🎉",
        description:
          form.status === ANNOUNCEMENT_STATUS.PUBLISHED
            ? "Your announcement is now live."
            : "Your announcement has been saved as draft.",
      });

      resetForm();
    } catch (error: any) {
      console.error("Create announcement error:", error);
      toast({
        title: "Failed to Create Announcement",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Card className="max-w-2xl mx-auto mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <CardTitle>Create Global Announcement</CardTitle>
          </div>
          <CardDescription>
            Create an announcement that will be visible to all students across
            all courses.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter announcement title..."
                value={form.title}
                onChange={handleInputChange}
                disabled={isSubmitting}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.title.length}/200
              </p>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Write your announcement here..."
                value={form.body}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={6}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.body.length}/2000
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={handleStatusChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANNOUNCEMENT_STATUS.PUBLISHED}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Published
                    </div>
                  </SelectItem>
                  <SelectItem value={ANNOUNCEMENT_STATUS.DRAFT}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      Draft
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {form.status === ANNOUNCEMENT_STATUS.PUBLISHED
                  ? "This announcement will be visible to all students immediately."
                  : "This announcement will be saved but not visible to students."}
              </p>
            </div>

            {/* Preview */}
            {(form.title || form.body) && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Preview
                </p>
                <h3 className="font-semibold text-lg">
                  {form.title || "Untitled"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {form.body || "No content"}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1"
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.title.trim() || !form.body.trim()}
                className="flex-1 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {form.status === ANNOUNCEMENT_STATUS.PUBLISHED ? "Publish" : "Save Draft"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminCreateAnnouncement;

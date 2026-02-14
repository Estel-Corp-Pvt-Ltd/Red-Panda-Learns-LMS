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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { announcementService } from "@/services/announcementService";
import { organizationService } from "@/services/organizationService";
import { Organization } from "@/types/organization";
import { HelpCircle, Loader2, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";

interface TeacherAddAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  createdBy: string;
  onSuccess: () => void;
}

const TeacherAddAnnouncementModal: React.FC<TeacherAddAnnouncementModalProps> = ({
  open,
  onOpenChange,
  organizationId,
  createdBy,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [targetDivision, setTargetDivision] = useState("");
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);

  useEffect(() => {
    if (open && organizationId) {
      organizationService.getOrganizationById(organizationId).then((result) => {
        if (result) {
          setOrg(result);
        }
      });
    }
  }, [open, organizationId]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the announcement",
        variant: "destructive",
      });
      return;
    }
    if (!body.trim()) {
      toast({
        title: "Body required",
        description: "Please enter the announcement content",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await announcementService.createOrganizationAnnouncement({
        title: title.trim(),
        body: body.trim(),
        organizationId,
        createdBy,
        targetClass: targetClass || undefined,
        targetDivision: targetDivision || undefined,
      });

      if (result.success) {
        toast({ title: "Success", description: "Announcement created successfully!" });
        setTitle("");
        setBody("");
        setTargetClass("");
        setTargetDivision("");
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: "Failed to create announcement",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to create announcement:", error);
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasClasses = org?.classes && org.classes.length > 0;
  const hasDivisions = org?.divisions && org.divisions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Create Announcement
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            This announcement will be visible only to users in your organization.
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground inline" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Organization announcements are only visible to students and staff members in your
                  organization. You can optionally target a specific class or division.
                </p>
              </TooltipContent>
            </Tooltip>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              placeholder="Write your announcement here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
            />
          </div>

          {/* Target Class/Division (optional) */}
          {(hasClasses || hasDivisions) && (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">
                Target Audience (optional — leave blank for entire organization)
              </p>
              <div className="flex gap-3">
                {hasClasses && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Class</Label>
                    <Select
                      value={targetClass || "all"}
                      onValueChange={(val) => setTargetClass(val === "all" ? "" : val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {org!.classes.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {hasDivisions && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Division</Label>
                    <Select
                      value={targetDivision || "all"}
                      onValueChange={(val) => setTargetDivision(val === "all" ? "" : val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Divisions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        {org!.divisions.map((div) => (
                          <SelectItem key={div} value={div}>
                            {div}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                "Publish Announcement"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherAddAnnouncementModal;

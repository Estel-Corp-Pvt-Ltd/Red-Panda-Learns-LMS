import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { contentLockService } from "@/services/contentLockService";
import { ContentLock } from "@/types/content-lock";
import { LearningUnit } from "@/types/general";
import { formatDateTime } from "@/utils/date-time";
import { Timestamp } from "firebase/firestore";

type ContentLockFormProps = {
  contentType: LearningUnit;
  contentId: string;

  /** If provided → edit mode */
  existingLock?: ContentLock | null;

  /** Callbacks */
  onSaved?: (lockId: string) => void;
  onDeleted?: () => void;
};

export const ContentLockForm = ({
  contentType,
  contentId,
  existingLock,
  onSaved,
  onDeleted,
}: ContentLockFormProps) => {
  const { toast } = useToast();
  const isEditMode = Boolean(existingLock);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    appliesToAllUsers: false,
    organizationId: "",
    class: "",
    division: "",
    isLocked: false,
    scheduledAt: "",
  });

  useEffect(() => {
    if (existingLock) {
      setForm({
        appliesToAllUsers: existingLock.appliesToAllUsers ?? false,
        organizationId: existingLock.organizationId || "",
        class: existingLock.class || "",
        division: existingLock.division || "",
        isLocked: existingLock.isLocked,
        scheduledAt: existingLock.scheduledAt
          ? existingLock.scheduledAt.toDate().toISOString().slice(0, 16)
          : "",
      });
    }
  }, [existingLock]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        contentType,
        contentId,
        appliesToAllUsers: form.appliesToAllUsers,
        organizationId: form.appliesToAllUsers ? null : form.organizationId || null,
        class: form.appliesToAllUsers ? null : form.class || null,
        division: form.appliesToAllUsers ? null : form.division || null,
        isLocked: form.isLocked,
        scheduledAt: form.scheduledAt ? Timestamp.fromDate(new Date(form.scheduledAt)) : null,
      };

      let result;

      if (isEditMode && existingLock) {
        result = await contentLockService.updateContentLock(existingLock.id, payload);
      } else {
        result = await contentLockService.createContentLock(payload);
      }

      if (!result.success) {
        toast({ title: result.message || "Failed to save lock", variant: "destructive" });
        return;
      }

      toast({ title: isEditMode ? "Lock updated" : "Lock created" });
      onSaved?.(isEditMode ? existingLock!.id : result.data);
    } catch (error) {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingLock) return;

    try {
      setDeleting(true);
      const result = await contentLockService.deleteContentLock(existingLock.id);

      if (!result.success) {
        toast({ title: "Failed to delete lock", variant: "destructive" });
        return;
      }

      toast({ title: "Lock removed" });
      onDeleted?.();
    } catch {
      toast({ title: "Failed to delete lock", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border dark:border-neutral-800">
      <CardContent className="space-y-5 pt-6">

        {/* Lock Toggle */}
        <div className="flex items-center justify-between">
          <Label>Lock Content</Label>
          <Switch
            checked={form.isLocked}
            onCheckedChange={(val) => handleChange("isLocked", val)}
          />
        </div>

        {/* Global Lock */}
        <div className="flex items-center justify-between">
          <Label>Apply to all users</Label>
          <Switch
            checked={form.appliesToAllUsers}
            onCheckedChange={(val) => handleChange("appliesToAllUsers", val)}
          />
        </div>

        {/* Scoped fields */}
        {!form.appliesToAllUsers && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Organization ID</Label>
              <Input
                value={form.organizationId}
                onChange={(e) => handleChange("organizationId", e.target.value)}
                placeholder="org_123"
              />
            </div>

            <div>
              <Label>Class</Label>
              <Input
                value={form.class}
                onChange={(e) => handleChange("class", e.target.value)}
                placeholder="10-A"
              />
            </div>

            <div>
              <Label>Division</Label>
              <Input
                value={form.division}
                onChange={(e) => handleChange("division", e.target.value)}
                placeholder="Science"
              />
            </div>
          </div>
        )}

        {/* Scheduling */}
        <div>
          <Label>Schedule Lock (optional)</Label>
          <Input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => handleChange("scheduledAt", e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t dark:border-neutral-800">
          {isEditMode && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEditMode ? "Update Lock" : "Create Lock"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

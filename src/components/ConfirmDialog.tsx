import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmVariant = "default" | "danger";

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;

  title: React.ReactNode;
  body?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  dismissible?: boolean; // allow ESC/backdrop/close (we'll just respect onOpenChange)
}

const ConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  title,
  body,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default",
  dismissible = true,
}: ConfirmDialogProps) => {
  // Simple body scroll lock (same as your CreateLessonModal)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) onCancel();
      }}
    >
      <DialogContent className="w-[90%] sm:max-w-md bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {body && (
            <DialogDescription className="text-sm text-muted-foreground">
              {body}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

const ModalDemo = () => {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Same simple body scroll lock for this demo modal
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
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Modal + Confirm demo</h1>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setOpen(true)} className="font-medium">
          Open custom modal
        </Button>

        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          className="font-medium"
        >
          Ask for confirmation
        </Button>
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        Tip: press Escape or click the backdrop to close.
      </p>

      {/* Custom modal using Dialog directly (exact same pattern as your CreateLessonModal) */}
      <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
        <DialogContent className="w-[90%] sm:max-w-lg bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Universal Modal</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Use this for forms, previews, confirmations…
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <p>
              This is a reusable modal with ESC/backdrop close via Dialog. It’s portaled so it appears
              above everything in your app.
            </p>
            <ul className="list-disc pl-6">
              <li>Accessible (role="dialog")</li>
              <li>Smooth enough and dead-simple</li>
              <li>Close via backdrop, ESC, or buttons</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ConfirmDialog (no context) */}
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          console.log("Deleting…");
        }}
        title="Delete 42 records?"
        body="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </div>
  );
};

export default ModalDemo;
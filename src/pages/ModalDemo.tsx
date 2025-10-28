import React, { useState } from "react";
import Modal from "@/components/Modal";
import { useConfirm } from "@/services/providers/ConfirmProvider";

const ModalDemo: React.FC = () => {
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();

  const handleDangerousAction = async () => {
    const ok = await confirm({
      title: "Delete 42 records?",
      body: "This action cannot be undone.",
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      dismissible: true,
    });
    if (ok) {
      console.log("Deleting…");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Modal + Confirm demo</h1>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900"
        >
          Open custom modal
        </button>

        <button
          type="button"
          onClick={handleDangerousAction}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:ring-offset-slate-900"
        >
          Ask for confirmation
        </button>
      </div>

      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
        Tip: press Escape or click the backdrop to close.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Universal Modal"
        subtitle="Use this for forms, previews, confirmations…"
        size="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-lg px-3.5 py-2.5 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:text-slate-200 dark:hover:bg-slate-800 dark:ring-offset-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="grid gap-2">
          <p>
            This is a reusable modal with focus trapping, ESC to close, and backdrop click.
            It’s portaled to body so it appears above everything in your app.
          </p>
          <ul className="list-disc pl-6">
            <li>Accessible (role="dialog", aria-modal, focus trap)</li>
            <li>Smooth open/close animations</li>
            <li>Sizes: sm / md / lg / xl / full</li>
            <li>Close button, backdrop click, ESC</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default ModalDemo;
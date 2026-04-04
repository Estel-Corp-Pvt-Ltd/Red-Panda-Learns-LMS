import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMPLAINT_STATUS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { complaintService } from "@/services/complaintService";
import { Complaint, ComplaintAction } from "@/types/complaint";
import { ClipboardCheck, Loader2, MessageSquare } from "lucide-react";
import React, { useEffect, useImperativeHandle, useState } from "react";

export interface DetailPanelHandle {
  container: HTMLDivElement | null;
  resolve: () => Promise<void>;
}

interface ComplaintDetailPanelProps {
  complaint: Complaint;
  onResolved?: () => void;
}

const statusColorMap: Record<string, string> = {
  SUBMITTED: "outline",
  UNDER_REVIEW: "secondary",
  RESOLVED: "default",
  ESCALATED: "destructive",
};

const actionTypeColorMap: Record<string, string> = {
  COMMENT: "secondary",
  STATUS_CHANGE: "default",
  ASSIGNED: "outline",
  ESCALATED: "destructive",
  RESOLVED: "default",
};

const ComplaintDetailPanel = React.forwardRef<DetailPanelHandle, ComplaintDetailPanelProps>(
  ({ complaint, onResolved }, ref) => {
    const { user } = useAuth();
    const [actions, setActions] = useState<ComplaintAction[]>([]);
    const [isLoadingActions, setIsLoadingActions] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const resolveComplaint = async () => {
      if (complaint.status === COMPLAINT_STATUS.RESOLVED) return;
      const response = await complaintService.resolveComplaint(complaint.id, user.id);
      if (response.success) {
        toast({ title: "Complaint Resolved" });
        onResolved?.();
        return;
      }
      toast({
        title: "Failed to resolve complaint",
        variant: "destructive",
      });
    };

    useImperativeHandle(ref, () => ({
      container: containerRef.current,
      resolve: resolveComplaint,
    }));

    useEffect(() => {
      const fetchActions = async () => {
        if (!complaint?.id) return;

        setIsLoadingActions(true);
        try {
          const response = await complaintService.getComplaintActions(complaint.id);
          console.log("Fetched actions:", response);
          if (response.success && response.data) {
            setActions(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch actions:", error);
        } finally {
          setIsLoadingActions(false);
        }
      };

      fetchActions();
    }, [complaint.id]);

    const isValidUrl = (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    };

    const formatDate = (date: Date | any) => {
      if (date instanceof Date) {
        return date.toLocaleString();
      }
      if (date?.toDate) {
        return date.toDate().toLocaleString();
      }
      return "—";
    };

    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        className="flex flex-col border rounded-lg bg-card focus:outline-none h-full"
      >
        {/* Header */}
        <div className="px-4 py-2 border-b space-y-0.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Complaint Details</span>
              <Badge variant={statusColorMap[complaint.status] as any}>{complaint.status}</Badge>
            </div>
            {complaint.status !== COMPLAINT_STATUS.RESOLVED && (
              <Button
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={resolveComplaint}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Resolve
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {complaint.userName} ({complaint.userEmail}) &middot; #{complaint.id}
          </p>
        </div>

        {/* Grid: Left = Meta + Description, Right = Activity Log */}
        <div className="flex-1 grid grid-cols-2 divide-x min-h-0">
          {/* Left column: meta, description, attachments, resolution */}
          <div className="px-4 py-3 overflow-auto space-y-3">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoItem label="Category" value={complaint.category} />
              <InfoItem label="Severity" value={complaint.severity} />
              {complaint.relatedEntityId &&
                (isValidUrl(complaint.relatedEntityId) ? (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">Related Entity</span>
                    <a
                      href={complaint.relatedEntityId}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-primary underline underline-offset-2 hover:opacity-80 break-all text-sm"
                    >
                      {complaint.relatedEntityId}
                    </a>
                  </div>
                ) : (
                  <InfoItem label="Related Entity" value={complaint.relatedEntityId} />
                ))}
              <InfoItem label="Created" value={formatDate(complaint.createdAt)} />
              {complaint.assignedTo && (
                <InfoItem label="Assigned To" value={complaint.assignedTo} />
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
                Description
              </h4>
              <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>
            </div>

            {/* Images */}
            {complaint.imageUrls && complaint.imageUrls.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
                  Attachments
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {complaint.imageUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="group">
                      <img
                        src={url}
                        alt={`Attachment ${i + 1}`}
                        className="h-16 w-full object-cover rounded-md border group-hover:opacity-90 transition"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution */}
            {complaint.resolutionSummary && (
              <div>
                <h4 className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
                  Resolution Summary
                </h4>
                <p className="text-sm whitespace-pre-wrap">{complaint.resolutionSummary}</p>
              </div>
            )}
          </div>

          {/* Right column: Activity Log */}
          <div className="px-4 py-3 overflow-auto">
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Activity Log ({actions.length})
            </h4>

            {isLoadingActions ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : actions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {actions.map((action) => (
                  <ActionItem key={action.id} action={action} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ComplaintDetailPanel.displayName = "ComplaintDetailPanel";

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ActionItem({ action }: { action: ComplaintAction }) {
  const formatDate = (date: Date | any) => {
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    if (date?.toDate) {
      return date.toDate().toLocaleString();
    }
    return "—";
  };

  return (
    <div className="border rounded-md p-2 bg-muted/30">
      <Badge
        variant={(actionTypeColorMap[action.actionType] as any) || "outline"}
        className="text-[10px] h-5"
      >
        {action.actionType}
      </Badge>

      {action.comment && <p className="mt-1.5 text-base whitespace-pre-wrap">{action.comment}</p>}

      <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(action.createdAt)}</p>
    </div>
  );
}

export default ComplaintDetailPanel;

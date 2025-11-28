import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Complaint } from "@/types/complaint";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ComplaintDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    complaint: Complaint | null;
};

const statusColorMap: Record<string, string> = {
    SUBMITTED: "outline",
    UNDER_REVIEW: "secondary",
    RESOLVED: "default",
    ESCALATED: "destructive",
};

export default function ComplaintDetailModal({
    open,
    onOpenChange,
    complaint,
}: ComplaintDetailModalProps) {
    if (!complaint) return null;

    const isValidUrl = (value: string) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-[95vw] p-0">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle className="flex flex-wrap items-center gap-3">
                        <span>Complaint #{complaint.id}</span>
                        <Badge variant={statusColorMap[complaint.status] as any}>
                            {complaint.status}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Submitted by {complaint.userName} ({complaint.userEmail})
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[75vh] px-6 pb-6">
                    {/* Meta info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                        <InfoItem label="Category" value={complaint.category} />
                        {complaint.relatedEntityId &&
                            isValidUrl(complaint.relatedEntityId) ? (
                            <div>
                                <InfoItem
                                    label="Related Entity"
                                    value={""}
                                />
                                <a
                                    href={complaint.relatedEntityId}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
                                >
                                    {complaint.relatedEntityId}
                                </a>
                            </div>
                        ) : (
                            <InfoItem
                                label="Related Entity"
                                value={complaint.relatedEntityId}
                            />
                        )
                        }
                        <InfoItem label="Severity" value={complaint.severity} />
                        <InfoItem
                            label="Created At"
                            value={
                                complaint.createdAt instanceof Date
                                    ? complaint.createdAt.toLocaleString()
                                    : "—"
                            }
                        />
                        {complaint.assignedTo && (
                            <InfoItem label="Assigned To" value={complaint.assignedTo} />
                        )}
                    </div>

                    {/* Description */}
                    <div className="mt-6">
                        <h4 className="text-sm font-semibold mb-1">Description</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {complaint.description}
                        </p>
                    </div>

                    {/* Images */}
                    {complaint.imageUrls && complaint.imageUrls.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-sm font-semibold mb-2">Attachments</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {complaint.imageUrls.map((url, i) => (
                                    <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group"
                                    >
                                        <img
                                            src={url}
                                            alt={`Attachment ${i + 1}`}
                                            className="h-24 w-full object-cover rounded-md border group-hover:opacity-90 transition"
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resolution */}
                    {complaint.resolutionSummary && (
                        <div className="mt-6">
                            <h4 className="text-sm font-semibold mb-1">
                                Resolution Summary
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {complaint.resolutionSummary}
                            </p>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
};

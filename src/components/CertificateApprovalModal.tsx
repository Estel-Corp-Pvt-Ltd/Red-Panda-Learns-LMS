import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { learningProgressService } from "@/services/learningProgressService";
import { useState } from "react";

interface CertificateApprovalModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: string;
    approveRequest: (requestId: string) => void;
    userId: string;
    courseId: string;
};

export default function CertificateApprovalModal({
    open,
    onOpenChange,
    requestId,
    approveRequest,
    userId,
    courseId,
}: CertificateApprovalModalProps) {

    const [remark, setRemark] = useState("");
    const [loading, setLoading] = useState(false);

    const handleApproval = async () => {
        setLoading(true);

        approveRequest(requestId);

        const response = await learningProgressService.setCertificationRemark(userId, courseId, remark);
        if (!response.success) {
            toast({
                title: "Remark not saved!"
            });
        }
        setRemark("");
        setLoading(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-[95vw] p-6 space-y-4">
                <DialogHeader>
                    <DialogTitle>Approve Certificate Request</DialogTitle>
                    <DialogDescription>
                        Optional: You may add a remark that will be visible to the student.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Remark (optional)</label>
                    <Textarea
                        placeholder="Enter remark..."
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="resize-none"
                        rows={4}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>

                    <Button onClick={handleApproval} disabled={loading}>
                        {loading ? "Approving..." : "Approve"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

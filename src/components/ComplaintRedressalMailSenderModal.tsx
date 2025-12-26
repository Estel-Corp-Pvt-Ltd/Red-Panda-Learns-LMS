import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BACKEND_URL } from "@/config";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { complaintService } from "@/services/complaintService";
import { Complaint } from "@/types/complaint";
import { useEffect, useState } from "react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    complaint: Complaint;
    userId: string;
};

export function ComplaintRedressalMailSenderModal({
    open,
    onOpenChange,
    complaint,
    userId,
}: Props) {

    const [subject, setSubject] = useState(`Update regarding complaint #${complaint.id}`);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSubject(`Update regarding complaint #${complaint.id}`);
    }, [complaint.id, open]);

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            toast({
                title: "Missing fields",
                description: "Email subject and description are required.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            const idToken = await authService.getToken();
            const response = await fetch(`${BACKEND_URL}/sendComplaintRedressalMail`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    to: complaint.userEmail,
                    subject,
                    message,
                    complaintId: complaint.id,
                    status: complaint.status,
                    isInternal: false
                }),
            });

            const jsonResponse = await response.json();

            if (jsonResponse.success) {
                setSubject("");
                setMessage("");
                onOpenChange(false);
                const response = await complaintService.resolveComplaint(complaint.id, userId);
                if (response.success) {
                    toast({
                        title: "Complaint redressal email sent ✅ & complaint Resolved"
                    });
                } else {
                    toast({
                        title: "Failed to resolve complaint",
                        variant: "destructive"
                    });
                }
            } else {
                throw new Error(jsonResponse.error);
            }
        } catch (err: any) {
            toast({
                title: "Failed to send complaint redressal mail",
                description: err.message || "Try again",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setSubject("");
            setMessage("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Send Email to User</DialogTitle>
                    <DialogDescription>
                        Send a message regarding this complaint.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Email Subject</label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Email Message</label>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write your message to the user..."
                            rows={5}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSend} disabled={loading}>
                            {loading ? "Sending..." : "Send Email"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

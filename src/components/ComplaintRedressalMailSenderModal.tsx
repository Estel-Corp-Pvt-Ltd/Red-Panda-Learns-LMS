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
import { Complaint } from "@/types/complaint";
import { useState } from "react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    complaint: Complaint;
};

export function ComplaintRedressalMailSenderModal({
    open,
    onOpenChange,
    complaint,
}: Props) {

    const [subject, setSubject] = useState(`Update regarding complaint #${complaint.id}`);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

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
                toast({ title: "Complaint redressal email sent ✅" });
                setSubject("");
                setMessage("");
                onOpenChange(false);
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

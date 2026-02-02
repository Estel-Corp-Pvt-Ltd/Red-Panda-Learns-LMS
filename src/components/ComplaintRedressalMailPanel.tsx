import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BACKEND_URL } from "@/config";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { complaintService } from "@/services/complaintService";
import { Complaint } from "@/types/complaint";
import { Send } from "lucide-react";
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";

interface ComplaintRedressalMailPanelProps {
  complaint: Complaint;
  userId: string;
  onSent?: () => void;
}

export interface MailPanelHandle {
  focusSubject: () => void;
  focusMessage: () => void;
  container: HTMLDivElement | null;
}

const ComplaintRedressalMailPanel = React.forwardRef<
  MailPanelHandle,
  ComplaintRedressalMailPanelProps
>(({ complaint, userId, onSent }, ref) => {
  const [subject, setSubject] = useState(`Update regarding complaint #${complaint.id}`);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focusSubject: () => subjectRef.current?.focus(),
    focusMessage: () => messageRef.current?.focus(),
    container: containerRef.current,
  }));

  useEffect(() => {
    setSubject(`Update regarding complaint #${complaint.id}`);
    setMessage("");
  }, [complaint.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing fields",
        description: "Email subject and message are required.",
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
          isInternal: false,
        }),
      });

      const jsonResponse = await response.json();

      if (jsonResponse.success) {
        setSubject("");
        setMessage("");
        const resolveResponse = await complaintService.resolveComplaint(
          complaint.id,
          userId,
          message
        );
        if (resolveResponse.success) {
          toast({
            title: "Email sent & complaint resolved",
          });
        } else {
          toast({
            title: "Email sent but failed to resolve complaint",
            variant: "destructive",
          });
        }
        onSent?.();
      } else {
        throw new Error(jsonResponse.error);
      }
    } catch (err: any) {
      toast({
        title: "Failed to send email",
        description: err.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col border rounded-lg bg-card focus:outline-none"
    >
      <div className="px-4 py-2 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" />
          Send Redressal Email
        </h3>
        <p className="text-xs text-muted-foreground">To: {complaint.userEmail}</p>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <Input
            ref={subjectRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Email subject"
            className="h-8 text-sm mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <Textarea
            ref={messageRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your message to the user..."
            rows={3}
            className="text-sm mt-1 resize-none"
          />
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSend} disabled={loading} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {loading ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
});

ComplaintRedressalMailPanel.displayName = "ComplaintRedressalMailPanel";

export default ComplaintRedressalMailPanel;

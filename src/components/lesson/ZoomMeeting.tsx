import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Video, ArrowLeftRight } from "lucide-react";
import { ZoomInfo } from "@/types/lesson";
import { formatTime } from "@/utils/date-time";

interface ZoomMeetingProps {
  zoomInfo: ZoomInfo;
  userId: string;
  userName: string;
  userEmail?: string;
}

export function ZoomMeeting({ zoomInfo, userId, userName, userEmail = "" }: ZoomMeetingProps) {
  const navigate = useNavigate();
  const [showUTC, setShowUTC] = useState(false);

  const handleJoin = useCallback(() => {
    navigate("/zoom-meeting", {
      state: {
        meetingId: zoomInfo.meetingId,
        password: zoomInfo.encryptedPasscode || zoomInfo.passcode || "",
        userId,
        userName: userName || "Anonymous User",
        userEmail: userEmail || "",
      },
    });
  }, [navigate, zoomInfo, userId, userName, userEmail]);

  const formattedTime = formatTime(zoomInfo.startTime, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: showUTC ? "UTC" : "Asia/Kolkata",
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Video className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Live Session</span>
          <span className="text-xs ml-2 text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formattedTime} {showUTC ? "UTC" : "IST"}
            <button
              onClick={() => setShowUTC(!showUTC)}
              className="ml-1 p-0.5 rounded hover:bg-muted transition-colors"
              title={`Switch to ${showUTC ? "IST" : "UTC"}`}
            >
              <ArrowLeftRight className="h-3 w-3" />
            </button>
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Ready to join?</h3>
          <Button size="lg" onClick={handleJoin}>
            <Video className="h-4 w-4 mr-2" />
            Join Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

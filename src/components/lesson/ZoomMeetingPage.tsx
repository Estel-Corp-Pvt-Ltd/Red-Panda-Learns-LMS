import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ZoomMtg } from "@zoom/meetingsdk";
import { zoomSignatureService } from "@/services/zoom/zoomSignatureService";
import { log } from "@/utils/logger";

/**
 * ZoomMeetingPage - Client View (full-page Zoom meeting)
 *
 * Navigate here with state:
 *   navigate("/zoom-meeting", {
 *     state: {
 *       meetingId: "123456789",
 *       password: "abc123",
 *       userId: "firebaseUserId",
 *       userName: "John Doe",
 *       userEmail: "john@example.com",
 *     }
 *   });
 */

interface ZoomMeetingState {
  meetingId: string;
  password?: string;
  userId: string;
  userName: string;
  userEmail?: string;
}

export default function ZoomMeetingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "joining" | "joined" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const state = location.state as ZoomMeetingState | null;

  useEffect(() => {
    if (!state?.meetingId || !state?.userId) {
      setError("Missing meeting data. Please join from the lesson page.");
      setStatus("error");
      return;
    }

    const { meetingId, password = "", userId, userName, userEmail = "" } = state;

    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();

    async function startMeeting() {
      try {
        const { signature, sdkKey } = await zoomSignatureService.getSignature(meetingId, userId);
        log("[ZoomMeetingPage] Signature fetched, initializing...");

        setStatus("joining");

        ZoomMtg.i18n.load("en-US");
        ZoomMtg.i18n.onLoad(function () {
          ZoomMtg.init({
            leaveUrl: window.location.origin,
            disableCORP: !window.crossOriginIsolated,
            patchJsMedia: true,
            leaveOnPageUnload: true,
            screenShare: true,
            isSupportChat: true,
            isSupportQA: true,
            isSupportPolling: true,
            isSupportBreakout: true,
            isSupportCC: true,
            isSupportNonverbal: true,
            videoDrag: true,
            disableRecord: false,
            disableInvite: false,
            success: function () {
              log("[ZoomMeetingPage] Init success, joining meeting...");

              ZoomMtg.join({
                meetingNumber: meetingId,
                userName,
                signature,
                sdkKey,
                userEmail,
                passWord: password,
                success: function () {
                  log("[ZoomMeetingPage] Joined meeting successfully");
                  setStatus("joined");

                  // Show recording button for hosts
                  ZoomMtg.showRecordFunction({ show: true });
                },
                error: function (joinErr: any) {
                  console.error("[ZoomMeetingPage] Join error:", joinErr);
                  setError(joinErr?.reason || joinErr?.message || "Failed to join meeting");
                  setStatus("error");
                },
              });
            },
            error: function (initErr: any) {
              console.error("[ZoomMeetingPage] Init error:", initErr);
              setError(initErr?.reason || initErr?.message || "Failed to initialize Zoom");
              setStatus("error");
            },
          });

          ZoomMtg.inMeetingServiceListener("onUserJoin", function (data: any) {
            log("[ZoomMeetingPage] User joined:", data);
          });

          ZoomMtg.inMeetingServiceListener("onUserLeave", function (data: any) {
            log("[ZoomMeetingPage] User left:", data);
          });

          ZoomMtg.inMeetingServiceListener("onMeetingStatus", function (data: any) {
            log("[ZoomMeetingPage] Meeting status:", data);
          });
        });
      } catch (err: any) {
        console.error("[ZoomMeetingPage] Error:", err);
        setError(err?.message || "Something went wrong");
        setStatus("error");
      }
    }

    startMeeting();
  }, []);

  if (status === "error") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#1a1a2e",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "480px",
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 12px 0", fontSize: "20px" }}>Failed to join meeting</h2>
          <p style={{ margin: "0 0 20px 0", color: "#aaa", fontSize: "14px" }}>{error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 24px",
              background: "#2d8cff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading" || status === "joining") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#1a1a2e",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(45, 140, 255, 0.3)",
            borderTopColor: "#2d8cff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "#aaa", fontSize: "16px" }}>
          {status === "loading" ? "Preparing meeting..." : "Joining meeting..."}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return null;
}

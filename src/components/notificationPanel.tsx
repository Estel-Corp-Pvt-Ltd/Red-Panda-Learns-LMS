import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Bell,
  Megaphone,
  BookOpen,
  Loader2,
  CheckCheck,
  ExternalLink,
  ArrowRight,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { announcementService } from "@/services/announcementService";
import { userService } from "@/services/userService";
import { Announcement } from "@/types/announcements";
import { cn } from "@/lib/utils";
import { ANNOUNCEMENT_SCOPE } from "@/constants";
import { convertToDate, formatDateTime } from "@/utils/date-time";
import { useNavigate } from "react-router-dom";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onUnreadChange,
}) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readAtTime, setReadAtTime] = useState<Date | null>(null);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
  const initialFetchDone = useRef(false);
  const navigate = useNavigate();

  // Initialize readAt from user
  useEffect(() => {
    if (user?.readAt) {
      const converted = convertToDate(user.readAt);
      setReadAtTime(converted ?? new Date(0));
    } else {
      setReadAtTime(new Date(0));
    }
  }, [user?.readAt]);

  // Check if announcement is unread
  const isUnread = useCallback(
    (announcement: Announcement): boolean => {
      if (!readAtTime) return false;
      const announcementDate = convertToDate(announcement.updatedAt);
      if (!announcementDate) return false;
      return announcementDate.getTime() > readAtTime.getTime();
    },
    [readAtTime]
  );

  // Fetch announcements
  const fetchAnnouncements = useCallback(
    async (uid: string, showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        const result = await announcementService.getAnnouncementsForUser(uid);

        if (!result.success || !result.data) {
          if (showLoading) setError("Failed to load notifications");
          return;
        }

        // Sort newest first
        const sorted = [...result.data].sort((a, b) => {
          const da = convertToDate(a.updatedAt) || new Date(0);
          const db = convertToDate(b.updatedAt) || new Date(0);
          return db.getTime() - da.getTime();
        });

        setAnnouncements(sorted);
      } catch (e) {
        if (showLoading) setError("Failed to load notifications");
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    []
  );

  // INITIAL FETCH - Get unread count even when panel is closed
  useEffect(() => {
    if (user && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchAnnouncements(user.id, false);
    }
  }, [user, fetchAnnouncements]);

  // Calculate and report unread count whenever announcements or readAtTime changes
  useEffect(() => {
    if (readAtTime !== null) {
      const unreadCount = announcements.filter((a) => {
        const announcementDate = convertToDate(a.updatedAt);
        if (!announcementDate) return false;
        return announcementDate.getTime() > readAtTime.getTime();
      }).length;
      onUnreadChange?.(unreadCount);
    }
  }, [announcements, readAtTime, onUnreadChange]);

  // Fetch when panel opens
  useEffect(() => {
    if (isOpen && user) {
      fetchAnnouncements(user.id, true);
      setHasMarkedAsRead(false);
    }
  }, [isOpen, user, fetchAnnouncements]);

  // Mark as read after a short delay when panel is open
  useEffect(() => {
    if (isOpen && user && announcements.length > 0 && !hasMarkedAsRead) {
      const timer = setTimeout(async () => {
        try {
          await userService.updateNotificationStatus(user.id);
          setReadAtTime(new Date());
          setHasMarkedAsRead(true);
          onUnreadChange?.(0);
        } catch (err) {
          console.error("Failed to mark notifications as read:", err);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, user, announcements.length, hasMarkedAsRead, onUnreadChange]);


  const extractLinkFromHtml = (html: string): string | null => {
    if (!html) return null;

    // Match anchor tag and extract href
    const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>/i;
    const match = html.match(anchorRegex);

    return match ? match[1] : null;
  };


  const stripHtmlTags = (html: string): string => {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "").trim();
  };


  const isExternalLink = (url: string): boolean => {
    if (!url) return false;
    
    // Check if it starts with http://, https://, or //
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
      // Check if it's pointing to the same domain
      try {
        const linkUrl = new URL(url, window.location.origin);
        return linkUrl.origin !== window.location.origin;
      } catch {
        return true;
      }
    }
    
    // If it starts with /, it's internal
    return false;
  };


  const handleLinkClick = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    
    if (!link) return;

 

    if (isExternalLink(link)) {
      // External link - open in new tab
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      // Internal link - use navigate and close panel
      onClose();
      
      // Small delay to allow panel to close smoothly
      setTimeout(() => {
        navigate(link);
      }, 100);
    }
  };

  // Get time ago string
  const getTimeAgo = (date: Date | null): string => {
    if (!date) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateTime(date);
  };

  const unreadCount = announcements.filter(isUnread).length;

  if (!isOpen) return null;

return (
  <>
    {/* Backdrop */}
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    />

    {/* Panel */}
    <div
      className={cn(
        "fixed right-0 top-0 z-50 h-full w-full sm:w-[440px]",
        "bg-gradient-to-b from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-950",
        "shadow-2xl transition-transform duration-300 ease-out",
        "flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="shrink-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-neutral-700/50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="p-2.5 rounded-2xl shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #ff19ff, #29abe2)",
                  boxShadow: "0 10px 25px -5px rgba(255, 25, 255, 0.25)",
                }}
              >
                <Bell className="h-5 w-5 text-white" />
              </div>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-5 w-5 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-neutral-900 animate-pulse"
                  style={{ backgroundColor: "#fbb03b" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2
                className="text-lg font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #1f2937, #4b5563)",
                }}
              >
                Notifications
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {unreadCount > 0 ? (
                  <span
                    className="font-semibold"
                    style={{ color: "#ff19ff" }}
                  >
                    {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>{announcements.length} total</span>
                )}
              </p>
            </div>
          </div>

          {/* Close button - Always visible, more prominent on mobile */}
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 group"
            aria-label="Close notifications"
          >
            <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
          </button>
        </div>

        {/* Unread indicator banner */}
        {unreadCount > 0 && (
          <div className="px-4 sm:px-6 pb-4">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
              style={{
                background:
                  "linear-gradient(to right, rgba(255, 25, 255, 0.1), rgba(41, 171, 226, 0.1), rgba(251, 176, 59, 0.1))",
                borderColor: "rgba(255, 25, 255, 0.3)",
              }}
            >
              <div className="relative">
                <Sparkles className="h-5 w-5" style={{ color: "#ff19ff" }} />
              </div>
              <span
                className="text-sm font-semibold bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #ff19ff, #29abe2)",
                }}
              >
                {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}{" "}
                waiting for you!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl animate-pulse"
                style={{ backgroundColor: "rgba(255, 25, 255, 0.2)" }}
              />
              <Loader2
                className="h-10 w-10 animate-spin relative"
                style={{ color: "#ff19ff" }}
              />
            </div>
            <p className="text-gray-500 font-medium">
              Loading notifications...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
            <div
              className="p-5 rounded-2xl"
              style={{ backgroundColor: "rgba(251, 176, 59, 0.1)" }}
            >
              <X className="h-10 w-10" style={{ color: "#fbb03b" }} />
            </div>
            <p
              className="font-semibold text-center"
              style={{ color: "#fbb03b" }}
            >
              {error}
            </p>
            <button
              onClick={() => user && fetchAnnouncements(user.id)}
              className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ backgroundColor: "#fbb03b" }}
            >
              Try again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full blur-2xl opacity-50" />
              <div className="p-5 bg-gray-100 dark:bg-neutral-800 rounded-2xl relative">
                <Bell className="h-10 w-10 text-gray-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 font-semibold">
                No notifications yet
              </p>
              <p className="text-sm text-gray-400 mt-1">
                We'll notify you when something arrives
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-3">
            {announcements.map((announcement) => {
              const updatedAt = convertToDate(announcement.updatedAt);
              const unread = isUnread(announcement);
              const link = extractLinkFromHtml(announcement.body);
              const hasLink = link !== null;
              const plainText = stripHtmlTags(announcement.body);
              const isExternal = hasLink && isExternalLink(link);
              const isCourse =
                announcement.scope === ANNOUNCEMENT_SCOPE.COURSE;

              return (
                <div
                  key={announcement.id}
                  className={cn(
                    "relative p-4 rounded-2xl transition-all duration-300",
                    "border",
                    "hover:shadow-lg hover:-translate-y-0.5",
                    !unread &&
                      "bg-white dark:bg-neutral-800/50 border-gray-100 dark:border-neutral-700/50 hover:border-gray-200 dark:hover:border-neutral-600"
                  )}
                  style={
                    unread
                      ? {
                          background: isCourse
                            ? "linear-gradient(to bottom right, rgba(41, 171, 226, 0.1), rgba(41, 171, 226, 0.05))"
                            : "linear-gradient(to bottom right, rgba(255, 25, 255, 0.1), rgba(41, 171, 226, 0.05))",
                          borderColor: isCourse
                            ? "rgba(41, 171, 226, 0.4)"
                            : "rgba(255, 25, 255, 0.4)",
                          boxShadow: isCourse
                            ? "0 4px 6px -1px rgba(41, 171, 226, 0.1)"
                            : "0 4px 6px -1px rgba(255, 25, 255, 0.1)",
                        }
                      : undefined
                  }
                >
                  {/* Unread indicator */}
                  {unread && (
                    <div
                      className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                      style={{
                        background: isCourse
                          ? "linear-gradient(to bottom, #29abe2, #1a8bc4)"
                          : "linear-gradient(to bottom, #ff19ff, #29abe2)",
                      }}
                    />
                  )}

                  <div className="flex gap-3 sm:gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "shrink-0 p-2.5 rounded-xl h-fit transition-all duration-300",
                        !unread && "bg-gray-100 dark:bg-neutral-700"
                      )}
                      style={
                        unread
                          ? {
                              background: isCourse
                                ? "linear-gradient(135deg, #29abe2, #1a8bc4)"
                                : "linear-gradient(135deg, #ff19ff, #29abe2)",
                              boxShadow: isCourse
                                ? "0 10px 25px -5px rgba(41, 171, 226, 0.25)"
                                : "0 10px 25px -5px rgba(255, 25, 255, 0.25)",
                            }
                          : undefined
                      }
                    >
                      {isCourse ? (
                        <GraduationCap
                          className={cn(
                            "h-5 w-5",
                            unread ? "text-white" : "text-gray-400"
                          )}
                        />
                      ) : (
                        <Megaphone
                          className={cn(
                            "h-5 w-5",
                            unread ? "text-white" : "text-gray-400"
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3
                          className={cn(
                            "text-sm line-clamp-2 leading-tight",
                            unread
                              ? "font-bold text-gray-900 dark:text-white"
                              : "font-medium text-gray-600 dark:text-gray-300"
                          )}
                        >
                          {announcement.title}
                        </h3>
                      </div>

                      {/* Body Content */}
                      <div className="mb-3">
                        {plainText && (
                          <p
                            className={cn(
                              "text-sm line-clamp-2 leading-relaxed",
                              unread
                                ? "text-gray-600 dark:text-gray-300"
                                : "text-gray-500 dark:text-gray-500"
                            )}
                          >
                            {plainText}
                          </p>
                        )}

                        {/* View Button */}
                        {hasLink && (
                          <button
                            onClick={(e) => handleLinkClick(e, link)}
                            className={cn(
                              "mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 group hover:scale-105 active:scale-95",
                              !unread &&
                                "bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600"
                            )}
                            style={
                              unread
                                ? {
                                    background: isCourse
                                      ? "linear-gradient(to right, #29abe2, #1a8bc4)"
                                      : "linear-gradient(to right, #ff19ff, #29abe2)",
                                    color: "white",
                                    boxShadow: isCourse
                                      ? "0 4px 14px -3px rgba(41, 171, 226, 0.25)"
                                      : "0 4px 14px -3px rgba(255, 25, 255, 0.25)",
                                  }
                                : undefined
                            }
                          >
                            {isExternal ? "Open Link" : "View Details"}
                            {isExternal ? (
                              <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            ) : (
                              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Category badge */}
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border"
                          style={
                            isCourse
                              ? {
                                  backgroundColor: "rgba(41, 171, 226, 0.1)",
                                  color: "#29abe2",
                                  borderColor: "rgba(41, 171, 226, 0.3)",
                                }
                              : {
                                  backgroundColor: "rgba(255, 25, 255, 0.1)",
                                  color: "#ff19ff",
                                  borderColor: "rgba(255, 25, 255, 0.3)",
                                }
                          }
                        >
                          {isCourse ? (
                            <>
                              <BookOpen className="h-3 w-3" />
                              Course
                            </>
                          ) : (
                            <>
                              <Megaphone className="h-3 w-3" />
                              Global
                            </>
                          )}
                        </span>

                        {/* Read/Unread status */}
                        {unread ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: isCourse ? "#29abe2" : "#ff19ff" }}
                          >
                            <span className="relative flex h-2 w-2">
                              <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                style={{
                                  backgroundColor: isCourse
                                    ? "#29abe2"
                                    : "#ff19ff",
                                }}
                              />
                              <span
                                className="relative inline-flex rounded-full h-2 w-2"
                                style={{
                                  backgroundColor: isCourse
                                    ? "#29abe2"
                                    : "#ff19ff",
                                }}
                              />
                            </span>
                            New
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                            <CheckCheck className="h-3 w-3" />
                            Read
                          </span>
                        )}

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Time */}
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            !unread && "text-gray-400"
                          )}
                          style={
                            unread
                              ? { color: isCourse ? "#29abe2" : "#ff19ff" }
                              : undefined
                          }
                        >
                          {getTimeAgo(updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {announcements.length > 0 && unreadCount === 0 && (
        <div
          className="shrink-0 p-4 border-t border-gray-100 dark:border-neutral-800"
          style={{
            background:
              "linear-gradient(to right, rgba(41, 171, 226, 0.1), rgba(251, 176, 59, 0.1))",
          }}
        >
          <div
            className="flex items-center justify-center gap-2 text-sm font-medium"
            style={{ color: "#29abe2" }}
          >
            <CheckCheck className="h-5 w-5" />
            <span>You're all caught up!</span>
            <span className="text-lg">🎉</span>
          </div>
        </div>
      )}

      {/* Mobile close hint */}
      <div className="sm:hidden shrink-0 p-3 bg-gray-100/80 dark:bg-neutral-800/80 backdrop-blur-sm">
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Tap outside or press{" "}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 dark:bg-neutral-700 rounded text-gray-600 dark:text-gray-300 font-medium">
            <X className="h-3 w-3" />
          </span>{" "}
          to close
        </p>
      </div>
    </div>
  </>
);

};
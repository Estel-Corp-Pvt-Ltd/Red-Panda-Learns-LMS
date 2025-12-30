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
  const fetchAnnouncements = useCallback(async (uid: string, showLoading = true) => {
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
  }, []);

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
          "bg-background",
          "shadow-2xl transition-transform duration-300 ease-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          {/* Header */}
          <div className="shrink-0 bg-background/95 backdrop-blur-xl border-b border-border">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2.5 rounded-2xl bg-primary shadow-lg">
                    <Bell className="h-5 w-5 text-primary-foreground" />
                  </div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Notifications</h2>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? (
                      <span className="font-semibold text-primary">
                        {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span>{announcements.length} total</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2.5 hover:bg-secondary rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 group"
                aria-label="Close notifications"
              >
                <X className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>

            {/* Unread indicator banner */}
            {unreadCount > 0 && (
              <div className="px-4 sm:px-6 pb-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary bg-primary/5">
                  <div className="relative">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {unreadCount} new notification{unreadCount !== 1 ? "s" : ""} waiting for you
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
                  <div className="absolute inset-0 rounded-full blur-xl animate-pulse bg-primary/20" />
                  <Loader2 className="h-10 w-10 animate-spin relative text-primary" />
                </div>
                <p className="text-muted-foreground font-medium">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
                <div className="p-5 rounded-2xl bg-destructive/10">
                  <X className="h-10 w-10 text-destructive" />
                </div>
                <p className="font-semibold text-center text-destructive">{error}</p>
                <button
                  onClick={() => user && fetchAnnouncements(user.id)}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl transition-all duration-200 hover:bg-accent hover:scale-105 active:scale-95"
                >
                  Try again
                </button>
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-muted/20 rounded-full blur-2xl opacity-50" />
                  <div className="p-5 bg-muted rounded-2xl relative">
                    <Bell className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-foreground font-semibold">No notifications yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
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
                  const isCourse = announcement.scope === ANNOUNCEMENT_SCOPE.COURSE;

                  return (
                    <div
                      key={announcement.id}
                      className={cn(
                        "relative p-4 rounded-2xl transition-all duration-300 border",
                        "hover:shadow-lg hover:-translate-y-0.5",
                        unread
                          ? isCourse
                            ? "bg-accent/5 border-accent"
                            : "bg-primary/5 border-primary"
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      {/* Unread indicator */}
                      {unread && (
                        <div
                          className={cn(
                            "absolute left-0 top-4 bottom-4 w-1 rounded-r-full",
                            isCourse ? "bg-accent" : "bg-primary"
                          )}
                        />
                      )}

                      <div className="flex gap-3 sm:gap-4">
                        {/* Icon */}
                        <div
                          className={cn(
                            "shrink-0 p-2.5 rounded-xl h-fit transition-all duration-300",
                            unread ? (isCourse ? "bg-accent" : "bg-primary") : "bg-muted"
                          )}
                        >
                          {isCourse ? (
                            <GraduationCap
                              className={cn(
                                "h-5 w-5",
                                unread ? "text-accent-foreground" : "text-muted-foreground"
                              )}
                            />
                          ) : (
                            <Megaphone
                              className={cn(
                                "h-5 w-5",
                                unread ? "text-primary-foreground" : "text-muted-foreground"
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
                                  ? "font-bold text-foreground"
                                  : "font-medium text-muted-foreground"
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
                                  unread ? "text-foreground/80" : "text-muted-foreground"
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
                                  unread
                                    ? "bg-primary text-primary-foreground hover:bg-accent"
                                    : "bg-primary text-primary-foreground hover:bg-accent hover:text-primary-foreground"
                                )}
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
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider",
                                isCourse
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-primary text-primary-foreground"
                              )}
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
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                                  isCourse ? "text-accent" : "text-primary"
                                )}
                              >
                                <span className="relative flex h-2 w-2">
                                  <span
                                    className={cn(
                                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                      isCourse ? "bg-accent" : "bg-primary"
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "relative inline-flex rounded-full h-2 w-2",
                                      isCourse ? "bg-accent" : "bg-primary"
                                    )}
                                  />
                                </span>
                                New
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
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
                                unread
                                  ? isCourse
                                    ? "text-accent"
                                    : "text-primary"
                                  : "text-muted-foreground"
                              )}
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
            <div className="shrink-0 p-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                <CheckCheck className="h-5 w-5" />
                <span>You're all caught up!</span>
              </div>
            </div>
          )}

          {/* Mobile close hint */}
          <div className="sm:hidden shrink-0 p-3 bg-muted/50 backdrop-blur-sm">
            <p className="text-center text-xs text-muted-foreground">
              Tap outside or press{" "}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary rounded text-foreground font-medium">
                <X className="h-3 w-3" />
              </span>{" "}
              to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

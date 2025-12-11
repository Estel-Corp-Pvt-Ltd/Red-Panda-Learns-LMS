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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    />

    {/* Panel */}
    <div
      className={cn(
        "fixed right-0 top-0 z-50 h-full w-full sm:w-[420px]",
        "bg-white dark:bg-neutral-900",
        "shadow-2xl transition-transform duration-300 ease-out",
        "flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 dark:border-neutral-700">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
              <Bell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Notifications
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {unreadCount > 0 ? (
                  <span className="text-primary font-medium">
                    {unreadCount} unread
                  </span>
                ) : (
                  <span>{announcements.length} total</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Unread indicator banner */}
        {unreadCount > 0 && (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl border border-primary/20">
              <div className="relative">
                <div className="h-2.5 w-2.5 bg-primary rounded-full" />
                <div className="absolute inset-0 h-2.5 w-2.5 bg-primary rounded-full animate-ping" />
              </div>
              <span className="text-sm font-medium text-primary">
                {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={() => user && fetchAnnouncements(user.id)}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-full">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No notifications yet</p>
            <p className="text-sm text-gray-400">
              We'll notify you when something arrives
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-neutral-800">
            {announcements.map((announcement) => {
              const updatedAt = convertToDate(announcement.updatedAt);
              const unread = isUnread(announcement);
              const link = extractLinkFromHtml(announcement.body);
              const hasLink = link !== null;
              const plainText = stripHtmlTags(announcement.body);
              const isExternal = hasLink && isExternalLink(link);

              return (
                <div
                  key={announcement.id}
                  className={cn(
                    "relative px-5 py-4 transition-all duration-200",
                    "hover:bg-gray-50 dark:hover:bg-neutral-800/50",
                    unread && "bg-primary/10 dark:bg-primary/20"
                  )}
                >
                  {/* Unread indicator line */}
                  {unread && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/80 rounded-r-full" />
                  )}

                  <div className="flex gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "shrink-0 p-2.5 rounded-xl h-fit",
                        unread
                          ? "bg-primary/20 dark:bg-primary/30"
                          : "bg-gray-100 dark:bg-neutral-800"
                      )}
                    >
                      {announcement.scope === ANNOUNCEMENT_SCOPE.COURSE ? (
                        <BookOpen
                          className={cn(
                            "h-5 w-5",
                            unread ? "text-primary" : "text-gray-400"
                          )}
                        />
                      ) : (
                        <Megaphone
                          className={cn(
                            "h-5 w-5",
                            unread ? "text-primary" : "text-gray-400"
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className={cn(
                            "text-sm line-clamp-1",
                            unread
                              ? "font-bold text-gray-900 dark:text-white"
                              : "font-medium text-gray-600 dark:text-gray-400"
                          )}
                        >
                          {announcement.title}
                        </h3>
                      </div>

                      {/* Body Content */}
                      <div className="mb-2">
                        {plainText && (
                          <p
                            className={cn(
                              "text-sm line-clamp-2",
                              unread
                                ? "text-gray-700 dark:text-gray-200"
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
                              "mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 group",
                              unread
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/20 text-secondary hover:bg-secondary/30"
                            )}
                          >
                            {isExternal ? "Open Link" : "View"}
                            {isExternal ? (
                              <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            ) : (
                              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Category badge */}
                          <span
                            className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide bg-primary/20 text-primary"
                          >
                            {announcement.scope === ANNOUNCEMENT_SCOPE.COURSE
                              ? "Course"
                              : "General"}
                          </span>

                          {/* Read/Unread status */}
                          {unread ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wide">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                              </span>
                              New
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wide">
                              <CheckCheck className="h-3 w-3" />
                              Read
                            </span>
                          )}
                        </div>

                        {/* Time */}
                        <span
                          className={cn(
                            "text-[11px]",
                            unread ? "text-primary font-medium" : "text-gray-400"
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
        <div className="shrink-0 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <CheckCheck className="h-4 w-4 text-green-500" />
            <span>You're all caught up!</span>
          </div>
        </div>
      )}
    </div>
  </>
);

};
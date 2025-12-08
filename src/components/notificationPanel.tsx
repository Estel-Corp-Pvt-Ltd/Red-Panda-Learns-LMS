import { useState, useEffect } from "react";
import { X, Bell, Megaphone, BookOpen, Loader2, ArrowRightCircleIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { announcementService } from "@/services/announcementService";
import { Announcement } from "@/types/announcements";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { ANNOUNCEMENT_SCOPE } from "@/constants";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchAnnouncements();
    }
  }, [isOpen, user]);

  const fetchAnnouncements = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await announcementService.getAnnouncementsForUser(user.id);
      if (result.success && result.data) {
        setAnnouncements(result.data);
      } else {
        setError("Failed to load notifications");
      }
    } catch (err) {
      setError("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: Timestamp | any): string => {
    if (!timestamp) return "";

    const date =
      timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getAnnouncementIcon = (announcement: Announcement) => {
    if (announcement.scope === ANNOUNCEMENT_SCOPE.COURSE) {
      return <BookOpen className="h-5 w-5 text-blue-500" />;
    }
    return <Megaphone className="h-5 w-5 text-purple-500" />;
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Function to parse and modify links
  const parseBodyWithLinks = (body: string) => {
    const div = document.createElement('div');
    div.innerHTML = body;

    const anchorTags = div.querySelectorAll('a');
    anchorTags.forEach((link) => {
      const iconSpan = document.createElement('span');
      const icon = document.createElement('span');
      icon.innerHTML = `<ArrowRightCircleIcon class="h-4 w-4 text-blue-500 dark:text-blue-300" />`; // Add the icon to the link
      iconSpan.appendChild(icon);

      // Add style to the link (underline and blue color)
      link.style.textDecoration = 'underline';
      link.style.cursor = 'pointer';
      link.style.color = '#3b82f6'; // blue color

      link.insertAdjacentElement('beforebegin', iconSpan);
    });

    return div.innerHTML;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full sm:w-[420px] transform transition-transform duration-300 ease-in-out",
          "bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-white/10",
          "shadow-2xl dark:shadow-[0_0_30px_rgba(0,0,0,0.5)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-neutral-800 dark:to-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {announcements.length} announcement
                {announcements.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading notifications...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 px-6">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <X className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-sm text-red-500 text-center">{error}</p>
              <button
                onClick={fetchAnnouncements}
                className="text-sm text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 px-6">
              <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full">
                <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No notifications yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                You'll see announcements here when they're posted
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-full">
                        {getAnnouncementIcon(announcement)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                          {announcement.title}
                        </h3>
                        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(announcement.updatedAt)}
                        </span>
                      </div>

                      {/* Scope badge */}
                      {announcement.scope === ANNOUNCEMENT_SCOPE.COURSE && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          <BookOpen className="h-3 w-3" />
                          Course Update
                        </span>
                      )}

                      {/* Body - made to look like a button */}
                      <div
                        className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-3 cursor-pointer bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-1 underline"
                        dangerouslySetInnerHTML={{
                          __html: parseBodyWithLinks(announcement.body),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

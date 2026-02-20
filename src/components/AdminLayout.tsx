import { useAuth } from "@/contexts/AuthContext";
import {
  AlarmClockPlus,
  Award,
  Book,
  BookOpen,
  Building2,
  ChartBar,
  ClipboardList,
  FilePenLine,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  Megaphone,
  MessageSquareText,
  NotepadText,
  PictureInPicture,
  ShoppingBag,
  TicketPercent,
  UserPen,
  UserPlus,
  Users,
  Webhook,
} from "lucide-react";
import React, { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "./Header";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CircularNav, CircularNavItem } from "@/components/ui/CircularNav";

/* ─── Types ───────────────────────────────────────── */

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface MenuCategory {
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
}

type SidebarItem =
  | { type: "link"; item: MenuItem }
  | { type: "category"; category: MenuCategory };

/* ─── Sidebar data ────────────────────────────────── */

const sidebarItems: SidebarItem[] = [
  {
    type: "link",
    item: {
      name: "Dashboard",
      path: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
  },
  {
    type: "link",
    item: {
      name: "Statistics",
      path: "/admin/statistics",
      icon: <ChartBar className="h-5 w-5" />,
    },
  },
  {
    type: "category",
    category: {
      label: "Users",
      icon: <Users className="h-5 w-5" />,
      items: [
        { name: "All Users", path: "/admin/users", icon: <Users className="h-4 w-4" /> },
        { name: "Enroll Student", path: "/admin/enroll-student", icon: <UserPlus className="h-4 w-4" /> },
        { name: "Bulk Enroll Students", path: "/admin/bulk-student-enroll", icon: <UserPlus className="h-4 w-4" /> },
        { name: "Assign Students", path: "/admin/assign-students", icon: <UserPlus className="h-4 w-4" /> },
        { name: "Bulk Add Teachers", path: "/admin/bulk-add-teachers", icon: <UserPlus className="h-4 w-4" /> },
        { name: "Reset Password", path: "/admin/reset-password", icon: <KeyRound className="h-4 w-4" /> },
      ],
    },
  },
  {
    type: "category",
    category: {
      label: "Courses",
      icon: <BookOpen className="h-5 w-5" />,
      items: [
        { name: "All Courses", path: "/admin/courses", icon: <BookOpen className="h-4 w-4" /> },
        { name: "Arrange Courses", path: "/admin/arrange-courses", icon: <ListOrdered className="h-4 w-4" /> },
        { name: "Bundles", path: "/admin/bundles", icon: <Book className="h-4 w-4" /> },
        { name: "Submissions", path: "/admin/submissions", icon: <NotepadText className="h-4 w-4" /> },
        { name: "Assignment Manager", path: "/admin/manage-assignment-authors", icon: <FilePenLine className="h-4 w-4" /> },
      ],
    },
  },
  {
    type: "category",
    category: {
      label: "Commerce",
      icon: <ShoppingBag className="h-5 w-5" />,
      items: [
        { name: "Orders", path: "/admin/orders", icon: <ShoppingBag className="h-4 w-4" /> },
        { name: "Coupons", path: "/admin/coupons", icon: <TicketPercent className="h-4 w-4" /> },
        { name: "Enrollments", path: "/admin/enrollments", icon: <AlarmClockPlus className="h-4 w-4" /> },
      ],
    },
  },
  {
    type: "category",
    category: {
      label: "Content",
      icon: <Megaphone className="h-5 w-5" />,
      items: [
        { name: "Announcements", path: "/admin/announcements", icon: <Megaphone className="h-4 w-4" /> },
        { name: "Banners", path: "/admin/banners", icon: <PictureInPicture className="h-4 w-4" /> },
        { name: "Strip Banners", path: "/admin/strip-banners", icon: <PictureInPicture className="h-4 w-4" /> },
        { name: "Pop-Ups", path: "/admin/pop-ups", icon: <PictureInPicture className="h-4 w-4" /> },
      ],
    },
  },
  {
    type: "category",
    category: {
      label: "Community",
      icon: <MessageSquareText className="h-5 w-5" />,
      items: [
        { name: "Comments", path: "/admin/comments", icon: <MessageSquareText className="h-4 w-4" /> },
        { name: "Forum Messages", path: "/admin/forum-messages", icon: <MessageSquareText className="h-4 w-4" /> },
        { name: "Complaints", path: "/admin/view-complaints", icon: <ClipboardList className="h-4 w-4" /> },
        { name: "Certificate Requests", path: "/admin/certificate-requests", icon: <Award className="h-4 w-4" /> },
      ],
    },
  },
  {
    type: "category",
    category: {
      label: "Organization",
      icon: <Building2 className="h-5 w-5" />,
      items: [
        { name: "Organizations", path: "/admin/organizations", icon: <Building2 className="h-4 w-4" /> },
        { name: "Instructors", path: "/admin/instructors", icon: <UserPen className="h-4 w-4" /> },
        { name: "Karma Rules", path: "/admin/karmarules", icon: <Webhook className="h-4 w-4" /> },
      ],
    },
  },
];

/* Flatten for command palette */
const allPages = sidebarItems.flatMap((entry) => {
  if (entry.type === "link") return [{ ...entry.item, group: "Pages" }];
  return entry.category.items.map((item) => ({
    ...item,
    group: entry.category.label,
  }));
});

/* Build CircularNav items (two-level: categories have children) */
const circularNavItems: CircularNavItem[] = sidebarItems.map((entry) => {
  if (entry.type === "link") {
    return {
      name: entry.item.name,
      path: entry.item.path,
      icon: entry.item.icon,
    };
  }
  return {
    name: entry.category.label,
    path: entry.category.items[0].path,
    icon: entry.category.icon,
    children: entry.category.items.map((item) => ({
      name: item.name,
      path: item.path,
      icon: item.icon,
    })),
  };
});

/* ═══════════════════ Component ═══════════════════════ */

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);

  /* Ctrl+K command palette shortcut */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      localStorage.clear();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-hide">
        {children}
      </main>

      {/* CircularNav (two-level for admin categories) */}
      <CircularNav
        items={circularNavItems}
        onNavigate={(path) => navigate(path)}
        isActive={isActive}
        onLogout={handleLogout}
        centerLabel="Admin"
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search pages..." />
        <CommandList>
          <CommandEmpty>No pages found.</CommandEmpty>
          {Object.entries(
            allPages.reduce<Record<string, typeof allPages>>((acc, page) => {
              if (!acc[page.group]) acc[page.group] = [];
              acc[page.group].push(page);
              return acc;
            }, {})
          ).map(([group, pages]) => (
            <CommandGroup key={group} heading={group}>
              {pages.map((page) => (
                <CommandItem
                  key={page.path}
                  value={`${page.name} ${group}`}
                  onSelect={() => {
                    navigate(page.path);
                    setCommandOpen(false);
                  }}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {page.icon}
                  <span>{page.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;

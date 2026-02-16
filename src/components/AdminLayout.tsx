import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  AlarmClockPlus,
  Award,
  Book,
  BookOpen,
  Building2,
  ChartBar,
  ChevronDown,
  ClipboardList,
  FilePenLine,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquareText,
  NotepadText,
  PictureInPicture,
  Search,
  ShoppingBag,
  TicketPercent,
  UserPen,
  UserPlus,
  Users,
  Webhook,
  X,
} from "lucide-react";
import React, { ReactNode, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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

const STORAGE_KEY = "admin-sidebar-open-categories";

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Track which categories are expanded
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...openCategories]));
  }, [openCategories]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleCategory = useCallback((label: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

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
          {
            name: "All Users",
            path: "/admin/users",
            icon: <Users className="h-4 w-4" />,
          },
          {
            name: "Enroll Student",
            path: "/admin/enroll-student",
            icon: <UserPlus className="h-4 w-4" />,
          },
          {
            name: "Bulk Enroll Students",
            path: "/admin/bulk-student-enroll",
            icon: <UserPlus className="h-4 w-4" />,
          },
          {
            name: "Assign Students",
            path: "/admin/assign-students",
            icon: <UserPlus className="h-4 w-4" />,
          },
          {
            name: "Bulk Add Teachers",
            path: "/admin/bulk-add-teachers",
            icon: <UserPlus className="h-4 w-4" />,
          },
          {
            name: "Reset Password",
            path: "/admin/reset-password",
            icon: <KeyRound className="h-4 w-4" />,
          },
        ],
      },
    },
    {
      type: "category",
      category: {
        label: "Courses",
        icon: <BookOpen className="h-5 w-5" />,
        items: [
          {
            name: "All Courses",
            path: "/admin/courses",
            icon: <BookOpen className="h-4 w-4" />,
          },
          {
            name: "Arrange Courses",
            path: "/admin/arrange-courses",
            icon: <ListOrdered className="h-4 w-4" />,
          },
          {
            name: "Bundles",
            path: "/admin/bundles",
            icon: <Book className="h-4 w-4" />,
          },
          {
            name: "Submissions",
            path: "/admin/submissions",
            icon: <NotepadText className="h-4 w-4" />,
          },
          {
            name: "Assignment Manager",
            path: "/admin/manage-assignment-authors",
            icon: <FilePenLine className="h-4 w-4" />,
          },
        ],
      },
    },
    {
      type: "category",
      category: {
        label: "Commerce",
        icon: <ShoppingBag className="h-5 w-5" />,
        items: [
          {
            name: "Orders",
            path: "/admin/orders",
            icon: <ShoppingBag className="h-4 w-4" />,
          },
          {
            name: "Coupons",
            path: "/admin/coupons",
            icon: <TicketPercent className="h-4 w-4" />,
          },
          {
            name: "Enrollments",
            path: "/admin/enrollments",
            icon: <AlarmClockPlus className="h-4 w-4" />,
          },
        ],
      },
    },
    {
      type: "category",
      category: {
        label: "Content",
        icon: <Megaphone className="h-5 w-5" />,
        items: [
          {
            name: "Announcements",
            path: "/admin/announcements",
            icon: <Megaphone className="h-4 w-4" />,
          },
          {
            name: "Banners",
            path: "/admin/banners",
            icon: <PictureInPicture className="h-4 w-4" />,
          },
          {
            name: "Strip Banners",
            path: "/admin/strip-banners",
            icon: <PictureInPicture className="h-4 w-4" />,
          },
          {
            name: "Pop-Ups",
            path: "/admin/pop-ups",
            icon: <PictureInPicture className="h-4 w-4" />,
          },
        ],
      },
    },
    {
      type: "category",
      category: {
        label: "Community",
        icon: <MessageSquareText className="h-5 w-5" />,
        items: [
          {
            name: "Comments",
            path: "/admin/comments",
            icon: <MessageSquareText className="h-4 w-4" />,
          },
          {
            name: "Forum Messages",
            path: "/admin/forum-messages",
            icon: <MessageSquareText className="h-4 w-4" />,
          },
          {
            name: "Complaints",
            path: "/admin/view-complaints",
            icon: <ClipboardList className="h-4 w-4" />,
          },
          {
            name: "Certificate Requests",
            path: "/admin/certificate-requests",
            icon: <Award className="h-4 w-4" />,
          },
        ],
      },
    },
    {
      type: "category",
      category: {
        label: "Organization",
        icon: <Building2 className="h-5 w-5" />,
        items: [
          {
            name: "Organizations",
            path: "/admin/organizations",
            icon: <Building2 className="h-4 w-4" />,
          },
          {
            name: "Instructors",
            path: "/admin/instructors",
            icon: <UserPen className="h-4 w-4" />,
          },
          {
            name: "Karma Rules",
            path: "/admin/karmarules",
            icon: <Webhook className="h-4 w-4" />,
          },
        ],
      },
    },
  ];

  // Flatten all sidebar items for command palette
  const allPages = sidebarItems.flatMap((entry) => {
    if (entry.type === "link") {
      return [{ ...entry.item, group: "Pages" }];
    }
    return entry.category.items.map((item) => ({
      ...item,
      group: entry.category.label,
    }));
  });

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
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  // Check if any item in a category is active
  const isCategoryActive = (category: MenuCategory) => {
    return category.items.some((item) => isActive(item.path));
  };

  // Auto-expand category that contains the active route
  useEffect(() => {
    for (const entry of sidebarItems) {
      if (entry.type === "category" && isCategoryActive(entry.category)) {
        setOpenCategories((prev) => {
          if (prev.has(entry.category.label)) return prev;
          const next = new Set(prev);
          next.add(entry.category.label);
          return next;
        });
      }
    }
  }, [location.pathname]);

  const renderLink = (item: MenuItem, isChild = false) => (
    <Tooltip key={item.name}>
      <TooltipTrigger asChild>
        <Link
          to={item.path}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
            isChild && "pl-9 py-2 text-[13px]",
            collapsed && !isChild && "sm:justify-center sm:px-2",
            isActive(item.path)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          )}
        >
          {item.icon}
          <span className={cn("flex-1", collapsed && "sm:hidden")}>{item.name}</span>
        </Link>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" className="hidden sm:block">
          <p>{item.name}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );

  const renderCategory = (category: MenuCategory) => {
    const isOpen = openCategories.has(category.label);
    const hasActiveChild = isCategoryActive(category);

    return (
      <li key={category.label}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                if (collapsed) {
                  setCollapsed(false);
                  setOpenCategories((prev) => new Set(prev).add(category.label));
                } else {
                  toggleCategory(category.label);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                collapsed && "sm:justify-center sm:px-2",
                hasActiveChild && !isOpen
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {category.icon}
              <span className={cn("flex-1 text-left", collapsed && "sm:hidden")}>
                {category.label}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  collapsed && "sm:hidden",
                  isOpen ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="hidden sm:block">
              <p>{category.label}</p>
            </TooltipContent>
          )}
        </Tooltip>

        {/* Child items */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            collapsed && "sm:hidden",
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <ul className="mt-0.5 space-y-0.5">
            {category.items.map((item) => (
              <li key={item.name}>
                {renderLink(item, true)}
              </li>
            ))}
          </ul>
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      {/* Mobile Header */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 border-b bg-card">
        <h1 className="text-lg font-bold">Admin</h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md border hover:bg-accent hover:text-accent-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <TooltipProvider delayDuration={0}>
          <div
            className={cn(
              "fixed sm:static inset-0 sm:inset-auto flex flex-col z-40 transition-all duration-300 ease-in-out bg-white dark:bg-neutral-900",
              "border-r border-primary/10 dark:border-primary/20",
              collapsed ? "sm:w-[68px]" : "sm:w-64",
              sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
            )}
          >
            {/* Collapse toggle button (desktop only) */}
            <div className="hidden sm:flex items-center justify-end p-2 border-b border-primary/10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCollapsed((prev) => !prev)}
                    className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                  >
                    {collapsed ? (
                      <PanelLeftOpen className="h-5 w-5" />
                    ) : (
                      <PanelLeftClose className="h-5 w-5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{collapsed ? "Expand sidebar" : "Collapse sidebar"} (Ctrl+B)</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <nav
              className="relative z-10 flex-1 p-2 overflow-y-auto mt-14 sm:mt-0 scrollbar-hide outline-none"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute right-5 top-2 p-0 rounded-full hover:bg-accent hover:text-accent-foreground mt-4 text-black sm:hidden border bg-white hover:bg-sky-600"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Command palette trigger */}
              {!collapsed && (
                <button
                  onClick={() => setCommandOpen(true)}
                  className="w-full flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 mb-2 text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span className="flex-1 text-left">Search pages...</span>
                  <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </button>
              )}
              {collapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCommandOpen(true)}
                      className="w-full flex items-center justify-center rounded-lg border border-border bg-muted/40 p-2 mb-2 text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="hidden sm:block">
                    <p>Search pages (⌘K)</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <ul className="space-y-0.5">
                {sidebarItems.map((entry) => {
                  if (entry.type === "link") {
                    return (
                      <li key={entry.item.name}>
                        {renderLink(entry.item)}
                      </li>
                    );
                  }
                  return renderCategory(entry.category);
                })}
              </ul>
            </nav>
            <div className={cn("p-2 border-t", collapsed && "sm:px-1.5")}>
              {/* Logout */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground bg-red-500 hover:bg-red-600 text-white",
                      collapsed && "sm:justify-center sm:px-2 sm:gap-0"
                    )}
                  >
                    <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
                    <span className={cn(collapsed && "sm:hidden")}>LogOut</span>
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="hidden sm:block">
                    <p>LogOut</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-hide">{children}</main>
        </div>
      </div>

      {/* Command Palette */}
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
                    setSidebarOpen(false);
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

      {/* CSS for hiding scrollbar */}
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

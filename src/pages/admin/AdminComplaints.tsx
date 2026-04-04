import AdminLayout from "@/components/AdminLayout";
import ComplaintDetailPanel, { DetailPanelHandle } from "@/components/ComplaintDetailPanel";
import ComplaintRedressalMailPanel, {
  MailPanelHandle,
} from "@/components/ComplaintRedressalMailPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COMPLAINT_CATEGORY, COMPLAINT_SEVERITY, COMPLAINT_STATUS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { complaintService } from "@/services/complaintService";
import { Complaint } from "@/types/complaint";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ChevronLeft, ChevronRight, Info, Keyboard, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PaginatedComplaints {
  data: Complaint[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const AdminComplaints = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<PaginatedComplaints>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const [statusFilter, setStatusFilter] = useState<keyof typeof COMPLAINT_STATUS | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<keyof typeof COMPLAINT_SEVERITY | "ALL">(
    "ALL"
  );
  const [categoryFilter, setCategoryFilter] = useState<keyof typeof COMPLAINT_CATEGORY | "ALL">(
    "ALL"
  );

  const [itemsPerPage] = useState(10);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: "next" as "next" | "previous",
    currentPage: 1,
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const detailPanelRef = useRef<DetailPanelHandle>(null);
  const mailPanelRef = useRef<MailPanelHandle>(null);

  /* Debounced search */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPaginationState({
        cursor: null,
        pageDirection: "next",
        currentPage: 1,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadComplaints = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: any[] = [];

      if (statusFilter !== "ALL") {
        filters.push({
          field: "status",
          op: "==",
          value: statusFilter,
        });
      }

      if (severityFilter !== "ALL") {
        filters.push({
          field: "severity",
          op: "==",
          value: COMPLAINT_SEVERITY[severityFilter],
        });
      }

      if (categoryFilter !== "ALL") {
        filters.push({
          field: "category",
          op: "==",
          value: COMPLAINT_CATEGORY[categoryFilter],
        });
      }

      const result = await complaintService.getComplaints(filters, {
        limit: itemsPerPage,
        orderBy: { field: "createdAt", direction: "desc" },
        cursor: paginationState.cursor,
        pageDirection: paginationState.pageDirection,
      });

      if (!result.success || !result.data) {
        toast({
          title: "Error",
          description: "Failed to load complaints",
          variant: "destructive",
        });
        return;
      }

      let finalData = result.data.data;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        finalData = finalData.filter(
          (c) =>
            c.userName?.toLowerCase().includes(q) ||
            c.userEmail?.toLowerCase().includes(q) ||
            c.description?.toLowerCase().includes(q)
        );
      }

      setComplaints({
        data: finalData,
        hasNextPage: result.data.hasNextPage,
        hasPreviousPage: result.data.hasPreviousPage,
        nextCursor: result.data.nextCursor,
        previousCursor: result.data.previousCursor,
        totalCount: result.data.totalCount,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, severityFilter, categoryFilter, paginationState, itemsPerPage]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  /* Select a complaint by index */
  const selectByIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= complaints.data.length) return;
      setSelectedIndex(index);
      setSelectedComplaint(complaints.data[index]);
    },
    [complaints.data]
  );

  const goToNextPage = useCallback(() => {
    if (!complaints.hasNextPage) return;
    setPaginationState((p) => ({
      cursor: complaints.nextCursor,
      pageDirection: "next",
      currentPage: p.currentPage + 1,
    }));
  }, [complaints.hasNextPage, complaints.nextCursor]);

  const goToPreviousPage = useCallback(() => {
    if (!complaints.hasPreviousPage || paginationState.currentPage <= 1) return;
    setPaginationState((p) => ({
      cursor: complaints.previousCursor,
      pageDirection: "previous",
      currentPage: p.currentPage - 1,
    }));
  }, [complaints.hasPreviousPage, complaints.previousCursor, paginationState.currentPage]);

  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Ctrl/Cmd + Shift + R to resolve selected complaint (works everywhere)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        if (selectedComplaint) {
          detailPanelRef.current?.resolve();
        }
        return;
      }

      // Escape blurs search input if focused, otherwise deselects
      if (e.key === "Escape") {
        if (isTyping) {
          (e.target as HTMLElement).blur();
        } else {
          setSelectedComplaint(null);
          setSelectedIndex(-1);
        }
        return;
      }

      // Don't intercept other keys if user is typing in an input/textarea
      if (isTyping) return;

      switch (e.key) {
        case "/": {
          // Focus search
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        }
        case "ArrowDown":
        case "j": {
          e.preventDefault();
          const next =
            selectedIndex < complaints.data.length - 1 ? selectedIndex + 1 : selectedIndex;
          selectByIndex(next);
          const row = tableContainerRef.current?.querySelector(`[data-row-index="${next}"]`);
          row?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "ArrowUp":
        case "k": {
          e.preventDefault();
          const prev = selectedIndex > 0 ? selectedIndex - 1 : selectedIndex;
          selectByIndex(prev);
          const row = tableContainerRef.current?.querySelector(`[data-row-index="${prev}"]`);
          row?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "n": {
          // Next page
          e.preventDefault();
          goToNextPage();
          break;
        }
        case "p": {
          // Previous page
          e.preventDefault();
          goToPreviousPage();
          break;
        }
        case "d": {
          // Focus detail panel
          e.preventDefault();
          detailPanelRef.current?.container?.focus();
          break;
        }
        case "m": {
          // Focus mail panel container
          e.preventDefault();
          mailPanelRef.current?.container?.focus();
          break;
        }
        case "s": {
          // Focus subject field
          e.preventDefault();
          mailPanelRef.current?.focusSubject();
          break;
        }
        case "e": {
          // Focus message field
          e.preventDefault();
          mailPanelRef.current?.focusMessage();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, complaints.data.length, selectByIndex, goToNextPage, goToPreviousPage]);

  /* Re-sync selected complaint data after reload */
  useEffect(() => {
    if (selectedComplaint) {
      const updated = complaints.data.find((c) => c.id === selectedComplaint.id);
      if (updated) {
        setSelectedComplaint(updated);
        const idx = complaints.data.indexOf(updated);
        setSelectedIndex(idx);
      } else {
        setSelectedComplaint(null);
        setSelectedIndex(-1);
      }
    }
  }, [complaints.data]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case COMPLAINT_STATUS.RESOLVED:
        return "default";
      case COMPLAINT_STATUS.UNDER_REVIEW:
        return "secondary";
      case COMPLAINT_STATUS.ESCALATED:
        return "destructive";
      default:
        return "outline";
    }
  };

  const truncateDescription = (text: string, maxLen = 100) => {
    if (!text) return "—";
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
  };

  if (isLoading && complaints.data.length === 0) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="py-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left: Table area */}
        <ResizablePanel defaultSize={selectedComplaint ? 40 : 100} minSize={25}>
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Complaints</CardTitle>
                  <CardDescription>
                    Manage and resolve user complaints (Page {paginationState.currentPage})
                  </CardDescription>
                </div>

                {/* Shortcut help */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="Keyboard shortcuts"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 text-sm">
                    <div className="flex items-center gap-2 mb-3 font-semibold">
                      <Keyboard className="h-4 w-4" />
                      Keyboard Shortcuts
                    </div>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex justify-between">
                        <span>Search</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Navigate rows</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          ↑ / ↓ or j / k
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Next page</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">N</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Previous page</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">P</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Focus detail panel</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">D</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Focus mail panel</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">M</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Focus subject field</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">S</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Focus message field</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">E</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Resolve complaint</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          Ctrl/Cmd + Shift + R
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Send mail</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          Ctrl/Cmd + Enter
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Deselect / Blur</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          Esc
                        </span>
                      </li>
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
                      Click any row or use arrow keys to select a complaint. Both detail and mail
                      panels open automatically.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by user or description ( / )"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    {Object.values(COMPLAINT_STATUS).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={severityFilter}
                  onValueChange={(value) => setSeverityFilter(value as typeof severityFilter)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severity</SelectItem>
                    {Object.values(COMPLAINT_SEVERITY).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value as typeof categoryFilter)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {Object.values(COMPLAINT_CATEGORY).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto" ref={tableContainerRef}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {complaints.data.map((c, idx) => (
                    <TableRow
                      key={c.id}
                      data-row-index={idx}
                      className={`cursor-pointer transition-colors ${
                        selectedIndex === idx ? "bg-accent" : "hover:bg-muted/50"
                      }`}
                      onClick={() => selectByIndex(idx)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          selectByIndex(idx);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{c.userName}</div>
                          <div className="text-muted-foreground text-xs">{c.userEmail}</div>
                          <div className="text-muted-foreground/60 text-[10px] font-mono mt-0.5">
                            #{c.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                          {truncateDescription(c.description, 120)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(c.status)}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {c.createdAt instanceof Date ? c.createdAt.toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex justify-between items-center py-4">
                <div className="text-sm text-muted-foreground">
                  Page {paginationState.currentPage}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!complaints.hasPreviousPage || paginationState.currentPage <= 1}
                    onClick={goToPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!complaints.hasNextPage}
                    onClick={goToNextPage}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </ResizablePanel>

        {/* Right: Inspector panels */}
        {selectedComplaint && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="flex flex-col gap-3 h-full overflow-hidden pl-2">
                {/* Detail panel */}
                <div className="flex-1 min-h-0 overflow-auto">
                  <ComplaintDetailPanel
                    ref={detailPanelRef}
                    complaint={selectedComplaint}
                    onResolved={loadComplaints}
                  />
                </div>

                {/* Mail panel */}
                <div className="shrink-0">
                  <ComplaintRedressalMailPanel
                    ref={mailPanelRef}
                    complaint={selectedComplaint}
                    userId={user.id}
                    onSent={loadComplaints}
                  />
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </AdminLayout>
  );
};

export default AdminComplaints;

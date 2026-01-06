import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { orderService } from "@/services/orderService";
import AccountantLayout from "../../components/accountantLayout";
import { Order } from "@/types/order";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  User,
  Copy,
  Calendar,
  X,
  Search,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  UserSearch,
} from "lucide-react";
import { CURRENCY, ORDER_STATUS } from "@/constants";
import { OrderStatus } from "@/types/general";
import { formatDateTime } from "@/utils/date-time";
import { userService } from "@/services/userService";
import * as XLSX from "xlsx";

interface PaginatedOrders {
  data: Order[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

interface DateFilter {
  startDate: string;
  endDate: string;
}

interface SearchQuery {
  name: string;
  email: string;
}

interface ExportableOrder {
  "Order ID": string;
  "Customer Name": string;
  Email: string;
  Items: string;
  "Item Types": string;
  Amount: string;
  Currency: string;
  City: string;
  State: string;
  Country: string;
  Status: string;
  "Created At": string;
  "Completed At": string;
  "Transaction ID": string;
}

const ITEMS_PER_PAGE = 10;

const AccountantOrders: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Orders state
  const [orders, setOrders] = useState<PaginatedOrders>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // User emails mapping
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: "",
    endDate: "",
  });
  const [appliedDateFilter, setAppliedDateFilter] = useState<DateFilter>({
    startDate: "",
    endDate: "",
  });
  const [activePreset, setActivePreset] = useState<
    "today" | "week" | "month" | "year" | "custom" | null
  >(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    name: "",
    email: "",
  });
  const [appliedSearch, setAppliedSearch] = useState<SearchQuery>({
    name: "",
    email: "",
  });
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [allSearchResults, setAllSearchResults] = useState<Order[]>([]);
  const [searchPage, setSearchPage] = useState(1);

  // Get displayed orders based on mode
  const displayedOrders = useMemo(() => {
    if (isSearchMode) {
      const start = (searchPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      return allSearchResults.slice(start, end);
    }
    return orders.data;
  }, [isSearchMode, allSearchResults, searchPage, orders.data]);

  // Calculate search pagination
  const searchPagination = useMemo(() => {
    if (!isSearchMode) return { hasNext: false, hasPrev: false, totalPages: 0 };
    const totalPages = Math.ceil(allSearchResults.length / ITEMS_PER_PAGE);
    return {
      hasNext: searchPage < totalPages,
      hasPrev: searchPage > 1,
      totalPages,
    };
  }, [isSearchMode, allSearchResults.length, searchPage]);

  // Format order data for export
  const formatOrderForExport = (order: Order, email?: string): ExportableOrder => {
    return {
      "Order ID": order.orderId || "",
      "Customer Name": order.billingAddress?.fullName || "Unknown",
      Email: email || order.userEmail || "",
      Items: order.items.map((item) => item.name).join(", "),
      "Item Types": order.items.map((item) => item.itemType).join(", "),
      Amount: order.amount?.toString() || "0",
      Currency: order.currency || CURRENCY.INR,
      City: order.billingAddress?.city || "",
      State: order.billingAddress?.state || "",
      Country: order.billingAddress?.country || "",
      Status: order.status || "",
      "Created At": order.createdAt ? formatDateTime(order.createdAt) : "",
      "Completed At": order.completedAt ? formatDateTime(order.completedAt) : "",
      "Transaction ID": order.transactionId || "",
    };
  };

  // Fetch all orders for export/search
  const fetchAllOrdersForExport = async (): Promise<Order[]> => {
    const dateRange = getDateRangeForApi(appliedDateFilter);

    const result = await orderService.getAllOrdersByStatus(ORDER_STATUS.COMPLETED, dateRange);

    if (result.success && result.data) {
      return result.data;
    }

    return [];
  };

  // Fetch emails for orders
  const fetchEmailsForOrders = async (ordersToFetch: Order[]): Promise<Record<string, string>> => {
    const userIds = ordersToFetch.map((o) => o.userId).filter((id): id is string => !!id);

    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) return {};

    const usersMap = await userService.getUsersByIds(uniqueUserIds);
    const emailMap: Record<string, string> = {};

    for (const userId of uniqueUserIds) {
      const userDoc = usersMap[userId];
      if (userDoc?.email) {
        emailMap[userId] = userDoc.email;
      }
    }

    return emailMap;
  };

  // Filter orders by search criteria
  const filterOrdersBySearch = (
    ordersToFilter: Order[],
    search: SearchQuery,
    emailsMap: Record<string, string>
  ): Order[] => {
    const searchName = search.name.toLowerCase().trim();
    const searchEmail = search.email.toLowerCase().trim();

    return ordersToFilter.filter((order) => {
      // Name matching
      const customerName = order.billingAddress?.fullName?.toLowerCase() || "";
      const userName = order.userName?.toLowerCase() || "";
      const nameMatch =
        !searchName || customerName.includes(searchName) || userName.includes(searchName);

      // Email matching
      const orderEmail = order.userEmail?.toLowerCase() || "";
      const userEmail = (order.userId ? emailsMap[order.userId] : "")?.toLowerCase() || "";
      const emailMatch =
        !searchEmail || orderEmail.includes(searchEmail) || userEmail.includes(searchEmail);

      return nameMatch && emailMatch;
    });
  };

  // Handle search
  const handleSearch = async () => {
    const hasSearchQuery = searchQuery.name.trim() || searchQuery.email.trim();

    if (!hasSearchQuery) {
      toast({
        title: "Enter search term",
        description: "Please enter a name or email to search.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      // Fetch all orders (with current date filter if any)
      const allOrders = await fetchAllOrdersForExport();

      // Fetch emails for all orders
      const emails = await fetchEmailsForOrders(allOrders);

      // Update emails state
      setUserEmails((prev) => ({ ...prev, ...emails }));

      // Filter by search criteria
      const filteredOrders = filterOrdersBySearch(allOrders, searchQuery, emails);

      // Update state
      setAllSearchResults(filteredOrders);
      setAppliedSearch(searchQuery);
      setIsSearchMode(true);
      setSearchPage(1);

      toast({
        title: "Search complete",
        description: `Found ${filteredOrders.length} matching orders.`,
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "An error occurred while searching orders.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search and return to normal pagination
  const handleClearSearch = () => {
    setSearchQuery({ name: "", email: "" });
    setAppliedSearch({ name: "", email: "" });
    setIsSearchMode(false);
    setAllSearchResults([]);
    setSearchPage(1);
  };

  // Export to CSV
  const exportToCSV = (data: ExportableOrder[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no orders to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof ExportableOrder];
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")
              ? `"${escaped}"`
              : escaped;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel
  const exportToExcel = (data: ExportableOrder[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no orders to export.",
        variant: "destructive",
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    const columnWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...data.map((row) => String(row[key as keyof ExportableOrder]).length)
      ),
    }));
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // Handle export
  const handleExport = async (format: "csv" | "excel", scope: "current" | "all" | "search") => {
    setIsExporting(true);

    try {
      let ordersToExport: Order[];
      let emailsMap: Record<string, string>;

      if (scope === "current") {
        ordersToExport = displayedOrders;
        emailsMap = userEmails;
      } else if (scope === "search" && isSearchMode) {
        ordersToExport = allSearchResults;
        emailsMap = userEmails;
      } else {
        toast({
          title: "Fetching all orders...",
          description: "This may take a moment.",
        });

        ordersToExport = await fetchAllOrdersForExport();
        emailsMap = await fetchEmailsForOrders(ordersToExport);
      }

      const exportData = ordersToExport.map((order) =>
        formatOrderForExport(order, order.userId ? emailsMap[order.userId] : undefined)
      );

      const dateStr = new Date().toISOString().split("T")[0];
      let filename = `completed-orders-${dateStr}`;

      if (appliedDateFilter.startDate || appliedDateFilter.endDate) {
        filename += `-filtered`;
        if (appliedDateFilter.startDate) filename += `-from-${appliedDateFilter.startDate}`;
        if (appliedDateFilter.endDate) filename += `-to-${appliedDateFilter.endDate}`;
      }

      if (isSearchMode) {
        filename += `-search`;
      }

      if (format === "csv") {
        exportToCSV(exportData, filename);
      } else {
        exportToExcel(exportData, filename);
      }

      toast({
        title: "Export successful",
        description: `Exported ${exportData.length} orders to ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting orders.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const loadOrders = useCallback(
    async (
      cursor: any = null,
      pageDirection: "next" | "previous" = "next",
      dateRange?: { startDate?: Date; endDate?: Date }
    ) => {
      setIsLoading(true);
      try {
        const result = await orderService.getOrdersByStatus(ORDER_STATUS.COMPLETED, {
          limit: ITEMS_PER_PAGE,
          orderBy: { field: "createdAt", direction: "desc" },
          cursor,
          pageDirection,
          dateRange,
        });

        if (result.success && result.data) {
          const pageOrders = result.data.data;

          setOrders({
            data: pageOrders,
            hasNextPage: result.data.hasNextPage,
            hasPreviousPage: result.data.hasPreviousPage,
            nextCursor: result.data.nextCursor,
            previousCursor: result.data.previousCursor,
            totalCount: pageOrders.length,
          });

          const userIds = pageOrders
            .map((o: Order) => o.userId)
            .filter((id: string | undefined | null): id is string => !!id);

          if (userIds.length > 0) {
            const usersMap = await userService.getUsersByIds(userIds);
            setUserEmails((prev) => {
              const updated = { ...prev };
              for (const userId of userIds) {
                const userDoc = usersMap[userId];
                if (userDoc?.email) updated[userId] = userDoc.email;
              }
              return updated;
            });
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load orders",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Exception loading orders:", error);
        toast({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const getDateRangeForApi = (filter: DateFilter) => {
    const dateRange: { startDate?: Date; endDate?: Date } = {};

    if (filter.startDate) {
      dateRange.startDate = new Date(filter.startDate);
    }
    if (filter.endDate) {
      dateRange.endDate = new Date(filter.endDate);
    }

    return Object.keys(dateRange).length > 0 ? dateRange : undefined;
  };

  const setQuickDateRange = (preset: "today" | "week" | "month" | "year") => {
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    let startDate: string;

    switch (preset) {
      case "today":
        startDate = endDate;
        break;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split("T")[0];
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split("T")[0];
        break;
      case "year":
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo.toISOString().split("T")[0];
        break;
      default:
        return;
    }

    const newFilter = { startDate, endDate };

    setDateFilter(newFilter);
    setAppliedDateFilter(newFilter);
    setActivePreset(preset);
    setCurrentPage(1);

    // Clear search mode when date filter changes
    if (isSearchMode) {
      handleClearSearch();
    }

    loadOrders(null, "next", {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  };

  const handleApplyFilter = () => {
    if (dateFilter.startDate && dateFilter.endDate) {
      const start = new Date(dateFilter.startDate);
      const end = new Date(dateFilter.endDate);

      if (start > end) {
        toast({
          title: "Invalid date range",
          description: "Start date cannot be after end date",
          variant: "destructive",
        });
        return;
      }
    }

    setAppliedDateFilter(dateFilter);
    setActivePreset("custom");
    setCurrentPage(1);

    // Clear search mode when date filter changes
    if (isSearchMode) {
      handleClearSearch();
    }

    loadOrders(null, "next", getDateRangeForApi(dateFilter));
  };

  const handleResetFilter = () => {
    setDateFilter({ startDate: "", endDate: "" });
    setAppliedDateFilter({ startDate: "", endDate: "" });
    setActivePreset(null);
    setCurrentPage(1);

    // Clear search mode when resetting filters
    if (isSearchMode) {
      handleClearSearch();
    }

    loadOrders(null, "next", undefined);
  };

  const handleNextPage = async () => {
    if (isSearchMode) {
      if (searchPagination.hasNext) {
        setSearchPage((prev) => prev + 1);
      }
      return;
    }

    if (!orders.hasNextPage || isLoading) return;
    setCurrentPage((prev) => prev + 1);
    await loadOrders(orders.nextCursor, "next", getDateRangeForApi(appliedDateFilter));
  };

  const handlePreviousPage = async () => {
    if (isSearchMode) {
      if (searchPagination.hasPrev) {
        setSearchPage((prev) => prev - 1);
      }
      return;
    }

    if (!orders.hasPreviousPage || isLoading) return;
    setCurrentPage((prev) => prev - 1);
    await loadOrders(orders.previousCursor, "previous", getDateRangeForApi(appliedDateFilter));
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Email copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency: string = CURRENCY.INR) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case ORDER_STATUS.COMPLETED:
        return "default";
      case ORDER_STATUS.PENDING:
        return "secondary";
      case ORDER_STATUS.FAILED:
        return "destructive";
      default:
        return "outline";
    }
  };

  const hasActiveFilters = appliedDateFilter.startDate || appliedDateFilter.endDate;
  const hasActiveSearch = appliedSearch.name || appliedSearch.email;

  // Handle keyboard search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSearching) {
      handleSearch();
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (isLoading && orders.data.length === 0 && !isSearchMode) {
    return (
      <AccountantLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading completed orders...</p>
            </div>
          </CardContent>
        </Card>
      </AccountantLayout>
    );
  }

  return (
    <AccountantLayout>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Completed Orders</CardTitle>
              <CardDescription>
                View all completed orders.
                {isSearchMode
                  ? ` (Search results: ${allSearchResults.length} orders, Page ${searchPage})`
                  : orders.data.length > 0 && ` (Page ${currentPage})`}
              </CardDescription>
            </div>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting || displayedOrders.length === 0}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Current Page ({displayedOrders.length} orders)
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("csv", "current")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel", "current")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>

                {isSearchMode && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Search Results ({allSearchResults.length} orders)
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleExport("csv", "search")}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export Search as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("excel", "search")}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Search as Excel
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  All Orders {hasActiveFilters && "(Filtered)"}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("csv", "all")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export All as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel", "all")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export All as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search Section */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <UserSearch className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Search by Name or Email</span>
              {isSearchMode && (
                <Badge variant="secondary" className="ml-2">
                  Search Active
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="searchName" className="text-sm">
                  Customer Name
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="searchName"
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery.name}
                    onChange={(e) => setSearchQuery((prev) => ({ ...prev, name: e.target.value }))}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="searchEmail" className="text-sm">
                  Email Address
                </Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="searchEmail"
                    type="text"
                    placeholder="Search by email..."
                    value={searchQuery.email}
                    onChange={(e) => setSearchQuery((prev) => ({ ...prev, email: e.target.value }))}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || isLoading}
                  className="gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </Button>

                {(isSearchMode || searchQuery.name || searchQuery.email) && (
                  <Button
                    variant="outline"
                    onClick={handleClearSearch}
                    disabled={isSearching}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Active Search Indicator */}
            {hasActiveSearch && isSearchMode && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Searching for:</span>
                {appliedSearch.name && (
                  <Badge variant="secondary" className="gap-1">
                    Name: {appliedSearch.name}
                  </Badge>
                )}
                {appliedSearch.email && (
                  <Badge variant="secondary" className="gap-1">
                    Email: {appliedSearch.email}
                  </Badge>
                )}
                <span className="text-muted-foreground">({allSearchResults.length} results)</span>
              </div>
            )}
          </div>

          {/* Date Filter Section */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Filter by Date</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: "today", label: "Today" },
                { key: "week", label: "Last 7 days" },
                { key: "month", label: "Last 30 days" },
                { key: "year", label: "Last year" },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  variant={activePreset === preset.key ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setQuickDateRange(preset.key as "today" | "week" | "month" | "year")
                  }
                  disabled={isLoading || isSearching}
                >
                  {isLoading && activePreset === preset.key && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  )}
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Date Inputs */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="startDate" className="text-sm">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) =>
                    setDateFilter((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  max={dateFilter.endDate || undefined}
                  className="mt-1"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="endDate" className="text-sm">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) =>
                    setDateFilter((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  min={dateFilter.startDate || undefined}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleApplyFilter}
                  disabled={isLoading || isSearching}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Apply Filter
                </Button>

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={handleResetFilter}
                    disabled={isLoading || isSearching}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filter Indicator */}
            {hasActiveFilters && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Active filter:</span>
                <Badge variant="secondary" className="gap-1">
                  {appliedDateFilter.startDate && appliedDateFilter.endDate
                    ? `${appliedDateFilter.startDate} to ${appliedDateFilter.endDate}`
                    : appliedDateFilter.startDate
                    ? `From ${appliedDateFilter.startDate}`
                    : `Until ${appliedDateFilter.endDate}`}
                  <button onClick={handleResetFilter} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
          </div>

          {/* Orders Count */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {isSearchMode
                ? `${allSearchResults.length} orders found`
                : `${orders.totalCount} completed orders found`}
              {hasActiveFilters && !isSearchMode && " (filtered)"}
              {hasActiveSearch && isSearchMode && " (search results)"}
            </div>
          </div>

          {displayedOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                {isSearchMode
                  ? "No orders match your search"
                  : hasActiveFilters
                  ? "No orders match your filter"
                  : "No completed orders"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSearchMode
                  ? "Try adjusting your search terms."
                  : hasActiveFilters
                  ? "Try adjusting your date range or reset the filter."
                  : "Completed orders will appear here."}
              </p>
              {(hasActiveFilters || isSearchMode) && (
                <div className="flex gap-2 justify-center mt-4">
                  {isSearchMode && (
                    <Button variant="outline" size="sm" onClick={handleClearSearch}>
                      Clear Search
                    </Button>
                  )}
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={handleResetFilter}>
                      Reset Filter
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedOrders.map((order) => {
                    const email = order.userId ? userEmails[order.userId] : order.userEmail;

                    return (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {order.billingAddress?.fullName || order.userName || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {email ? (
                            <div className="flex items-center gap-2 max-w-60">
                              <span className="truncate text-sm">{email}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleCopyToClipboard(email)}
                                title="Copy email"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {order.userId ? "Loading..." : "Unknown"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div key={item.itemId} className="flex gap-2">
                                <p className="max-w-80 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                                  {item.name}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {item.itemType}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(order.amount, order.currency)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {order.billingAddress?.city || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/invoices/${order.orderId}`)}
                            title="View Order Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  {isSearchMode
                    ? `Showing ${displayedOrders.length} of ${allSearchResults.length} orders (page ${searchPage} of ${searchPagination.totalPages})`
                    : `Showing ${orders.data.length} orders (page ${currentPage})`}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={
                      isLoading ||
                      (isSearchMode ? !searchPagination.hasPrev : !orders.hasPreviousPage)
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={
                      isLoading || (isSearchMode ? !searchPagination.hasNext : !orders.hasNextPage)
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AccountantLayout>
  );
};

export default AccountantOrders;

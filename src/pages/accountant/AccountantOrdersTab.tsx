import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { orderService } from '@/services/orderService';
import AccountantLayout from '../../components/accountantLayout';
import { Order } from '@/types/order';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from 'lucide-react';
import { CURRENCY, ORDER_STATUS } from '@/constants';
import { OrderStatus } from '@/types/general';
import { formatDateTime } from '@/utils/date-time';
import { userService } from '@/services/userService';
import * as XLSX from 'xlsx';

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

interface ExportableOrder {
  'Order ID': string;
  'Customer Name': string;
  'Email': string;
  'Items': string;
  'Item Types': string;
  'Amount': string;
  'Currency': string;
  'City': string;
  'State': string;
  'Country': string;
  'Status': string;
  'Created At': string;
  'Completed At': string;
  'Transaction ID': string;
}

const AccountantOrders: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orders, setOrders] = useState<PaginatedOrders>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: '',
    endDate: '',
  });
  const [appliedDateFilter, setAppliedDateFilter] = useState<DateFilter>({
    startDate: '',
    endDate: '',
  });
  const [activePreset, setActivePreset] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | null>(null);

  // Format order data for export
  const formatOrderForExport = (order: Order, email?: string): ExportableOrder => {
    return {
      'Order ID': order.orderId || '',
      'Customer Name': order.billingAddress?.fullName || 'Unknown',
      'Email': email || order.userEmail || '',
      'Items': order.items.map(item => item.name).join(', '),
      'Item Types': order.items.map(item => item.itemType).join(', '),
      'Amount': order.amount?.toString() || '0',
      'Currency': order.currency || CURRENCY.INR,
      'City': order.billingAddress?.city || '',
      'State': order.billingAddress?.state || '',
      'Country': order.billingAddress?.country || '',
      'Status': order.status || '',
      'Created At': order.createdAt ? formatDateTime(order.createdAt) : '',
      'Completed At': order.completedAt ? formatDateTime(order.completedAt) : '',
      'Transaction ID': order.transactionId || '',
    };
  };

  // Fetch all orders for export (bypasses pagination)
  const fetchAllOrdersForExport = async (): Promise<Order[]> => {
    const allOrders: Order[] = [];
    let cursor = null;
    let hasMore = true;

    const dateRange = getDateRangeForApi(appliedDateFilter);

    while (hasMore) {
      const result = await orderService.getOrdersByStatus(ORDER_STATUS.COMPLETED, {
        limit: 100, // Fetch in larger batches for export
        orderBy: { field: 'createdAt', direction: 'desc' },
        cursor,
        pageDirection: 'next',
        dateRange,
      });

      if (result.success && result.data) {
        allOrders.push(...result.data.data);
        hasMore = result.data.hasNextPage;
        cursor = result.data.nextCursor;
      } else {
        hasMore = false;
      }
    }

    return allOrders;
  };

  // Fetch emails for orders
  const fetchEmailsForOrders = async (orders: Order[]): Promise<Record<string, string>> => {
    const userIds = orders
      .map(o => o.userId)
      .filter((id): id is string => !!id);

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

  // Export to CSV
  const exportToCSV = (data: ExportableOrder[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no orders to export.',
        variant: 'destructive',
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header as keyof ExportableOrder];
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
            ? `"${escaped}"`
            : escaped;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel
  const exportToExcel = (data: ExportableOrder[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no orders to export.',
        variant: 'destructive',
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    // Auto-size columns
    const columnWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...data.map(row => String(row[key as keyof ExportableOrder]).length)
      )
    }));
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'excel', scope: 'current' | 'all') => {
    setIsExporting(true);

    try {
      let ordersToExport: Order[];
      let emailsMap: Record<string, string>;

      if (scope === 'current') {
        ordersToExport = orders.data;
        emailsMap = userEmails;
      } else {
        toast({
          title: 'Fetching all orders...',
          description: 'This may take a moment.',
        });

        ordersToExport = await fetchAllOrdersForExport();
        emailsMap = await fetchEmailsForOrders(ordersToExport);
      }

      const exportData = ordersToExport.map(order => 
        formatOrderForExport(order, order.userId ? emailsMap[order.userId] : undefined)
      );

      // Generate filename with date range if filtered
      const dateStr = new Date().toISOString().split('T')[0];
      let filename = `completed-orders-${dateStr}`;
      
      if (appliedDateFilter.startDate || appliedDateFilter.endDate) {
        filename += `-filtered`;
        if (appliedDateFilter.startDate) filename += `-from-${appliedDateFilter.startDate}`;
        if (appliedDateFilter.endDate) filename += `-to-${appliedDateFilter.endDate}`;
      }

      if (format === 'csv') {
        exportToCSV(exportData, filename);
      } else {
        exportToExcel(exportData, filename);
      }

      toast({
        title: 'Export successful',
        description: `Exported ${exportData.length} orders to ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'An error occurred while exporting orders.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const loadOrders = useCallback(async (
    cursor: any = null, 
    pageDirection: 'next' | 'previous' = 'next',
    dateRange?: { startDate?: Date; endDate?: Date }
  ) => {
    setIsLoading(true);
    try {
      const result = await orderService.getOrdersByStatus(ORDER_STATUS.COMPLETED, {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
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
          title: 'Error',
          description: 'Failed to load orders',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Exception loading orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

  const setQuickDateRange = (preset: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate: string;

    switch (preset) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    const newFilter = { startDate, endDate };
    
    setDateFilter(newFilter);
    setAppliedDateFilter(newFilter);
    setActivePreset(preset);
    setCurrentPage(1);
    
    loadOrders(null, 'next', {
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
          title: 'Invalid date range',
          description: 'Start date cannot be after end date',
          variant: 'destructive',
        });
        return;
      }
    }

    setAppliedDateFilter(dateFilter);
    setActivePreset('custom');
    setCurrentPage(1);
    loadOrders(null, 'next', getDateRangeForApi(dateFilter));
  };

  const handleResetFilter = () => {
    setDateFilter({ startDate: '', endDate: '' });
    setAppliedDateFilter({ startDate: '', endDate: '' });
    setActivePreset(null);
    setCurrentPage(1);
    loadOrders(null, 'next', undefined);
  };

  const handleNextPage = async () => {
    if (!orders.hasNextPage || isLoading) return;
    setCurrentPage((prev) => prev + 1);
    await loadOrders(
      orders.nextCursor, 
      'next', 
      getDateRangeForApi(appliedDateFilter)
    );
  };

  const handlePreviousPage = async () => {
    if (!orders.hasPreviousPage || isLoading) return;
    setCurrentPage((prev) => prev - 1);
    await loadOrders(
      orders.previousCursor, 
      'previous', 
      getDateRangeForApi(appliedDateFilter)
    );
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Email copied to clipboard.' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number, currency: string = CURRENCY.INR) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case ORDER_STATUS.COMPLETED:
        return 'default';
      case ORDER_STATUS.PENDING:
        return 'secondary';
      case ORDER_STATUS.FAILED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const hasActiveFilters = appliedDateFilter.startDate || appliedDateFilter.endDate;

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (isLoading && orders.data.length === 0) {
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
                {orders.data.length > 0 && ` (Page ${currentPage})`}
              </CardDescription>
            </div>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting || orders.data.length === 0}>
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
                  Current Page ({orders.data.length} orders)
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('csv', 'current')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel', 'current')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  All Orders {hasActiveFilters && '(Filtered)'}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('csv', 'all')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export All as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel', 'all')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export All as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          {/* Date Filter Section */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Filter by Date</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'Last 7 days' },
                { key: 'month', label: 'Last 30 days' },
                { key: 'year', label: 'Last year' },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  variant={activePreset === preset.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickDateRange(preset.key as 'today' | 'week' | 'month' | 'year')}
                  disabled={isLoading}
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
                  onChange={(e) => setDateFilter(prev => ({ 
                    ...prev, 
                    startDate: e.target.value 
                  }))}
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
                  onChange={(e) => setDateFilter(prev => ({ 
                    ...prev, 
                    endDate: e.target.value 
                  }))}
                  min={dateFilter.startDate || undefined}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleApplyFilter}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Apply Filter
                </Button>
                
                {hasActiveFilters && (
                  <Button 
                    variant="outline"
                    onClick={handleResetFilter}
                    disabled={isLoading}
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
                    : `Until ${appliedDateFilter.endDate}`
                  }
                  <button
                    onClick={handleResetFilter}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
          </div>

          {/* Orders Count */}
          <div className="flex items-center justify-end mb-4">
            <div className="text-sm text-muted-foreground">
              {orders.totalCount} completed orders found
              {hasActiveFilters && ' (filtered)'}
            </div>
          </div>

          {orders.data.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                {hasActiveFilters ? 'No orders match your filter' : 'No completed orders'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters 
                  ? 'Try adjusting your date range or reset the filter.'
                  : 'Completed orders will appear here.'
                }
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilter}
                  className="mt-4"
                >
                  Reset Filter
                </Button>
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
                  {orders.data.map((order) => {
                    const email = order.userId ? userEmails[order.userId] : undefined;

                    return (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-sm">
                          {order.orderId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {order.billingAddress?.fullName || 'Unknown'}
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
                              {order.userId ? 'Loading...' : 'Unknown'}
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
                        <TableCell>
                          {formatCurrency(order.amount, order.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {order.billingAddress?.city || 'Unknown'}
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
                  Showing {orders.data.length} orders (page {currentPage})
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!orders.hasPreviousPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!orders.hasNextPage || isLoading}
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
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft,
  Calendar,
  Search,
  Download,
  Eye,
  FileText,
  Receipt,
  Building,
  User,
  DollarSign,
  BookOpen,
  Package
} from 'lucide-react';
import { Header } from '@/components/Header';
import { formatDate } from '@/utils/date-time';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { OrderStatus, Currency, EnrolledProgramType } from '@/types/general';
import { TransactionLineItem } from '@/types/transaction';
import { Order } from '@/types/order';
import { ORDER_STATUS } from '@/constants';
import { orderService } from '@/services/orderService';

interface FilterState {
  searchTerm: string;
  statusFilter: 'all' | OrderStatus;
  itemTypeFilter: 'all' | EnrolledProgramType;
  sortBy: 'createdAt' | 'amount' | 'orderId';
  sortOrder: 'asc' | 'desc';
}

const MyInvoicesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Order[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    statusFilter: 'all',
    itemTypeFilter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadInvoices();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [invoices, filters]);

  const loadInvoices = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const invoicesData = await orderService.getOrdersByUser(user.id);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Apply search filter
    if (filters.searchTerm.trim()) {
      filtered = filtered.filter(invoice =>
        invoice.orderId.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        invoice.items.some(item =>
          item.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          item.itemId.toLowerCase().includes(filters.searchTerm.toLowerCase())
        )
      );
    }

    // Apply status filter
    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filters.statusFilter);
    }

    // Apply item type filter
    if (filters.itemTypeFilter !== 'all') {
      filtered = filtered.filter(invoice =>
        invoice.items.some(item => item.itemType === filters.itemTypeFilter)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];

      if (filters.sortBy === 'createdAt') {
        aValue = aValue?.toDate?.() || aValue;
        bValue = bValue?.toDate?.() || bValue;
      }

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredInvoices(filtered);
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      statusFilter: 'all',
      itemTypeFilter: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      completed: { variant: 'secondary' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      cancelled: { variant: 'secondary' as const, className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      refunded: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getItemTypeIcon = (itemType: EnrolledProgramType) => {
    const iconConfig = {
      course: { icon: BookOpen, className: 'text-red-600 dark:text-red-400' },
      bundle: { icon: Package, className: 'text-purple-600 dark:text-purple-400' },
      program: { icon: BookOpen, className: 'text-green-600 dark:text-green-400' }
    };

    const config = iconConfig[itemType] || iconConfig.course;
    const IconComponent = config.icon;

    return <IconComponent className={`h-4 w-4 ${config.className}`} />;
  };

  const getItemTypeBadge = (itemType: EnrolledProgramType) => {
    const typeConfig = {
      course: { label: 'Course', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      bundle: { label: 'Bundle', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      program: { label: 'Program', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
    };

    const config = typeConfig[itemType] || typeConfig.course;

    return (
      <Badge variant="secondary" className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: Currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 100); // Assuming amount is in paise
  };

  const hasDiscount = (item: TransactionLineItem) => {
    return item.originalAmount && item.originalAmount > item.amount;
  };

  const getDiscountPercentage = (item: TransactionLineItem) => {
    if (!item.originalAmount || item.originalAmount <= item.amount) return 0;
    return Math.round(((item.originalAmount - item.amount) / item.originalAmount) * 100);
  };

  const handleDownloadInvoice = (invoice: Order) => {
    // Implement invoice download logic
    console.log('Downloading invoice:', invoice.orderId);
    // This would typically generate and download a PDF
  };

  const handleViewInvoice = (invoice: Order) => {
    // Navigate to invoice detail page or open modal
    navigate(`/invoices/${invoice.orderId}`);
  };

  const handleViewItem = (item: TransactionLineItem) => {
    // Navigate to the course/bundle detail page
    if (item.itemType === 'COURSE') {
      navigate(`/course/${item.itemId}`);
    } else if (item.itemType === 'BUNDLE') {
      navigate(`/bundle/${item.itemId}`);
    }
  };

  const hasActiveFilters = () => {
    return filters.searchTerm !== '' || filters.statusFilter !== 'all' || filters.itemTypeFilter !== 'all';
  };

  const getTotalSavings = () => {
    return invoices.reduce((total, invoice) => {
      const invoiceSavings = invoice.items.reduce((sum, item) => {
        if (item.originalAmount && item.originalAmount > item.amount) {
          return sum + (item.originalAmount - item.amount);
        }
        return sum;
      }, 0);
      return total + invoiceSavings;
    }, 0);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 p-6 space-y-4">
            <LoadingSkeleton className="h-10 w-64" />
            <LoadingSkeleton className="h-48" />
            <LoadingSkeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  My Invoices
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View and manage your course purchase invoices
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/courses')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Browse Courses
            </Button>
          </div>

          {/* Filters */}
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by invoice ID, course name, or course ID..."
                      className="pl-9"
                      value={filters.searchTerm}
                      onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="flex gap-2">
                  <Select
                    value={filters.itemTypeFilter}
                    onValueChange={(value: 'all' | EnrolledProgramType) => handleFilterChange('itemTypeFilter', value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="course">Courses</SelectItem>
                      <SelectItem value="bundle">Bundles</SelectItem>
                      <SelectItem value="program">Programs</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.statusFilter}
                    onValueChange={(value: 'all' | OrderStatus) => handleFilterChange('statusFilter', value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters() && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Sorting Options */}
              <div className="mt-4 flex items-center gap-4">
                <Label htmlFor="sort" className="text-sm font-medium whitespace-nowrap">Sort by:</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: 'createdAt' | 'amount' | 'orderId') => handleFilterChange('sortBy', value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Invoice Date</SelectItem>
                    <SelectItem value="orderId">Invoice ID</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {filters.sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Invoice ID</TableHead>
                      <TableHead className="w-[250px]">Items</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {invoices.length === 0
                            ? 'You have no invoices yet. Purchase a course to get started!'
                            : 'No invoices match your filters'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.orderId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell>
                            <div className="font-mono text-sm font-medium">
                              {invoice.orderId}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {invoice.items.map((item, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  {getItemTypeIcon(item.itemType)}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="link"
                                        className="h-auto p-0 text-sm font-medium text-left text-gray-900 dark:text-gray-100 hover:text-red-600 dark:hover:text-red-400"
                                        onClick={() => handleViewItem(item)}
                                      >
                                        {item.name}
                                      </Button>
                                      {hasDiscount(item) && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                          {getDiscountPercentage(item)}% OFF
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      ID: {item.itemId}
                                    </div>
                                    {item.amount > 0 && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        {formatCurrency(item.amount, invoice.currency)}
                                        {hasDiscount(item) && (
                                          <span className="line-through text-muted-foreground ml-2">
                                            {formatCurrency(item.originalAmount!, invoice.currency)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-sm">
                              {formatCurrency(invoice.amount, invoice.currency)}
                            </div>
                            {invoice.items.some(hasDiscount) && (
                              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                You saved {formatCurrency(
                                  invoice.items.reduce((sum, item) =>
                                    sum + (item.originalAmount && item.originalAmount > item.amount ? item.originalAmount - item.amount : 0), 0
                                  ), invoice.currency
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDate(invoice.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewInvoice(invoice)}
                                className="h-8 w-8"
                                title="View invoice"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadInvoice(invoice)}
                                className="h-8 w-8"
                                title="Download invoice"
                                disabled={invoice.status !== ORDER_STATUS.COMPLETED}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Results Info */}
              {filteredInvoices.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredInvoices.length} of {invoices.length} invoices
                    {hasActiveFilters() && ' (filtered)'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyInvoicesPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import { orderService } from '@/services/orderService';
import { Order } from '@/types/order';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShoppingCart,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  User
} from 'lucide-react';
import { WhereFilterOp } from 'firebase/firestore';
import { CURRENCY, ORDER_STATUS } from '@/constants';
import { OrderStatus } from '@/types/general';

interface PaginatedOrders {
  data: Order[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

type StatusFilter = 'ALL' | typeof ORDER_STATUS.PENDING | typeof ORDER_STATUS.COMPLETED | typeof ORDER_STATUS.FAILED;

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<PaginatedOrders>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const loadOrders = async (options = {}) => {
    setIsLoading(true);
    try {
      const filters = statusFilter !== 'ALL'
        ? [{ field: 'status' as keyof Order, op: '==' as WhereFilterOp, value: statusFilter }]
        : [];

      const result = await orderService.getOrders(filters, {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setOrders(prev => ({
          ...result.data,
          totalCount: result.data.data.length
        }));
      } else {
        toast({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!orders.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: orders.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadOrders({
      cursor: orders.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!orders.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: orders.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadOrders({
      cursor: orders.previousCursor,
      pageDirection: 'previous'
    });
  };

  const formatCurrency = (amount: number, currency: string = CURRENCY.INR) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
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

  const getUniqueItemTypes = (items: any[]) => {
    return Array.from(new Set(items.map(item => item.itemType)));
  };

  const getItemsCount = (items: any[]) => {
    return items.length;
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  if (isLoading && orders.data.length === 0) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading orders...</p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>
                View orders, item types, amounts, and statuses.
                {orders.totalCount > 0 && ` (Page ${paginationState.currentPage})`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Status Filter */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by status:</span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Orders</SelectItem>
                  <SelectItem value={ORDER_STATUS.PENDING}>Pending</SelectItem>
                  <SelectItem value={ORDER_STATUS.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={ORDER_STATUS.FAILED}>Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {orders.totalCount} orders found
            </div>
          </div>

          {orders.data.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                {statusFilter === 'ALL' ? 'No orders' : 'No orders match this status'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter === 'ALL'
                  ? 'Orders will appear here once placed.'
                  : 'Try a different status filter.'
                }
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.data.map((order) => (
                    <TableRow key={order.orderId}>
                      <TableCell className="font-mono text-sm">
                        {order.orderId.slice(-8).toUpperCase()}
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
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {getItemsCount(order.items)} items
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {getUniqueItemTypes(order.items).map((type) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(order.amount, order.currency)}
                        </div>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                            title="View Order Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  Showing {orders.data.length} orders
                  {orders.totalCount > orders.data.length &&
                    ` (page ${paginationState.currentPage})`
                  }
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
    </AdminLayout>
  );
};

export default AdminOrders;

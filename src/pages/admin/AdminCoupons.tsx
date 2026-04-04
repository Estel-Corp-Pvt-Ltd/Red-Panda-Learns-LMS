import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { couponService } from '@/services/couponService';
import { Coupon } from '@/types/coupon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
  Eye
} from 'lucide-react';
import { COUPON_STATUS } from '@/constants';
import { toast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import CouponDetailModal from '@/components/CouponDetailModal';

interface PaginatedCoupons {
  data: Coupon[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const AdminCoupons: React.FC = () => {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<PaginatedCoupons>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [isCouponDetailOpen, setIsCouponDetailOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  const loadCoupons = async (options = {}) => {
    setIsLoading(true);
    try {
      const result = await couponService.getCoupons([], {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setCoupons(prev => ({
          ...result.data,
          totalCount: result.data.data.length
        }));
      } else {
        console.error('Failed to load coupons:', result.error);
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!coupons.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: coupons.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadCoupons({
      cursor: coupons.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!coupons.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: coupons.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadCoupons({
      cursor: coupons.previousCursor,
      pageDirection: 'previous'
    });
  };

  const deleteCoupon = async () => {
    if (!selectedCoupon) return;
    const result = await couponService.deleteCoupon(selectedCoupon.id);
    if (!result.success) {
      toast({
        title: "Error",
        description: "Failed to delete coupon. Please try again.",
        variant: "destructive",
      });
      return;
    }
    await loadCoupons();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You can add a toast notification here
      console.log('Coupon code copied to clipboard:', text);
    });
  };

  const formatDate = (date: any) => {
    if (!date) return 'Never';

    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case COUPON_STATUS.ACTIVE:
        return "default";
      case COUPON_STATUS.INACTIVE:
        return "secondary";
      case COUPON_STATUS.EXPIRED:
        return "outline";
      default:
        return "secondary";
    }
  };

  const getUsageText = (coupon: Coupon) => {
    if (coupon.usageLimit === 0) {
      return "Unlimited (∞)";
    }
    return `${coupon.usageLimit} uses`;
  };

  const getLinkedItemsCount = (coupon: Coupon) => {
    const courses = coupon.linkedCourseIds?.length || 0;
    const bundles = coupon.linkedBundleIds?.length || 0;
    return courses + bundles;
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  if (isLoading && coupons.data.length === 0) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading coupons...</p>
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
              <CardTitle>Coupons</CardTitle>
              <CardDescription>
                Manage discount codes, their usage, and validity.
                {coupons.totalCount > 0 && ` (Page ${paginationState.currentPage})`}
              </CardDescription>
            </div>
            <Button
              onClick={() => navigate("/admin/create-coupon")}
              className="flex items-center gap-2"
              variant="pill"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Create Coupon
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {coupons.data.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No coupons
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a coupon code.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Linked Items</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.data.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium bg-muted px-2 py-1 rounded text-sm">
                            {coupon.code}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(coupon.code)}
                            title="Copy code"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(coupon.status)}>
                          {coupon.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {coupon.discountPercentage}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {getUsageText(coupon)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {getLinkedItemsCount(coupon)} linked
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(coupon.expiryDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={
                              () => {
                                setSelectedCoupon(coupon);
                                setIsCouponDetailOpen(true);
                              }
                            }
                            title="View Coupon"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/edit-coupon/${coupon.id}`)}
                            title="Edit Coupon"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setConfirmOpen(true);
                            }}
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  Showing {coupons.data.length} coupons
                  {coupons.totalCount > coupons.data.length &&
                    ` (page ${paginationState.currentPage})`
                  }
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!coupons.hasPreviousPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!coupons.hasNextPage || isLoading}
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
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          deleteCoupon();
          setConfirmOpen(false);
        }}
        title="Delete"
        body="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />

      {
        selectedCoupon &&
        <CouponDetailModal
          open={isCouponDetailOpen}
          onOpenChange={setIsCouponDetailOpen}
          coupon={selectedCoupon}
        />
      }
    </AdminLayout>
  );
};

export default AdminCoupons;

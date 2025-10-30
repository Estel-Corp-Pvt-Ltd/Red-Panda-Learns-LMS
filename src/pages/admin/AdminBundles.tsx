import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { bundleService } from '@/services/bundleService';
import { Bundle } from '@/types/bundle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  PlusCircle,
  Edit,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { BUNDLE_STATUS } from '@/constants';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/hooks/use-toast';

interface PaginatedBundles {
  data: Bundle[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const AdminBundles: React.FC = () => {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<PaginatedBundles>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  const loadBundles = async (options = {}) => {
    setIsLoading(true);
    try {
      const result = await bundleService.getBundles([], {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setBundles(prev => ({
          ...result.data,
          totalCount: result.data.data.length
        }));
      } else {
        console.error('Failed to load bundles:', result.error);
      }
    } catch (error) {
      console.error('Error loading bundles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!bundles.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: bundles.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadBundles({
      cursor: bundles.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!bundles.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: bundles.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadBundles({
      cursor: bundles.previousCursor,
      pageDirection: 'previous'
    });
  };

  const deleteBundle = async () => {
    if (!selectedBundle) return;
    const result = await bundleService.deleteBundle(selectedBundle.id);
    if (!result.success) {
      toast({
        title: "Error",
        description: "Failed to delete bundle.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Success",
      description: "Bundle deleted successfully."
    });
    await loadBundles();
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case BUNDLE_STATUS.PUBLISHED:
        return "default";
      case BUNDLE_STATUS.DRAFT:
        return "secondary";
      case BUNDLE_STATUS.ARCHIVED:
        return "outline";
      default:
        return "secondary";
    }
  };

  useEffect(() => {
    loadBundles();
  }, []);

  if (isLoading && bundles.data.length === 0) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2">Loading bundles...</p>
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
              <CardTitle>Course Bundles</CardTitle>
              <CardDescription>
                Manage your course bundles and bundle enrollments.
                {bundles.totalCount > 0 && ` (Page ${paginationState.currentPage})`}
              </CardDescription>
            </div>
            <Button
              onClick={() => navigate("/admin/create-bundle")}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Create Bundle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bundles.data.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No bundles
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first course bundle.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => navigate("/admin/create-bundle")}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Bundle
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bundle</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Pricing Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundles.data.map((bundle) => (
                    <TableRow key={bundle.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {bundle.thumbnail && (
                            <img
                              src={bundle.thumbnail}
                              alt={bundle.title}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {bundle.title}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {truncateText(bundle.description, 80)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {bundle.courses.length} courses
                          {bundle.courses.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {truncateText(
                                bundle.courses.map(course => course.title).join(', '),
                                60
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">
                            {formatCurrency(bundle.salePrice)}
                          </span>
                          {bundle.regularPrice > bundle.salePrice && (
                            <div className="text-xs text-muted-foreground line-through">
                              {formatCurrency(bundle.regularPrice)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {bundle.pricingModel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(bundle.status)}>
                          {bundle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/edit-bundle/${bundle.id}`)}
                            title="Edit Bundle"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/bundle/${bundle.id}`)}
                            title="View Bundle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBundle(bundle);
                              setConfirmOpen(true);
                            }}
                            title="Delete Bundle"
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
                  Showing {bundles.data.length} bundles
                  {bundles.totalCount > bundles.data.length &&
                    ` (page ${paginationState.currentPage})`
                  }
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!bundles.hasPreviousPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!bundles.hasNextPage || isLoading}
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
          deleteBundle();
          setConfirmOpen(false);
        }}
        title="Delete"
        body="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </AdminLayout>
  );
};

export default AdminBundles;

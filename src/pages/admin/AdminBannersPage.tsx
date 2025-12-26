import AdminLayout from '@/components/AdminLayout';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BANNER_STATUS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { bannerService } from '@/services/bannerService';
import { Banner } from '@/types/banner';
import { formatDate } from '@/utils/date-time';
import {
  Copy,
  Edit,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminBannersPage: React.FC = () => {

  const { user } = useAuth();

  const navigate = useNavigate();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

  const loadBanners = async () => {
    setIsLoading(true);
    try {
      const result = await bannerService.getAllBanners();

      if (result.success) {
        setBanners(result.data);
      } else {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : "Failed to load banners",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading banners:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleDelete = async () => {
    if (!selectedBanner) return;

    try {
      const result = await bannerService.deleteBanner(selectedBanner.id);

      if (result.success) {
        toast({
          title: "Success",
          description: "Banner deleted successfully",
        });
        loadBanners();
      } else {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : "Failed to delete banner",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setConfirmOpen(false);
      setSelectedBanner(null);
    }
  };

  const handleToggleStatus = async (banner: Banner) => {
    try {
      const result = await bannerService.toggleBannerStatus(banner.id);

      if (result.success) {
        toast({
          title: "Success",
          description: `Banner ${banner.status === BANNER_STATUS.ACTIVE ? 'deactivated' : 'activated'} successfully`,
        });
        loadBanners();
      } else {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : "Failed to update banner status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling banner status:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    return status === BANNER_STATUS.ACTIVE ? (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        Inactive
      </Badge>
    );
  };

  const duplicateBanner = async (banner: Banner) => {
    const response = await bannerService.createBanner({
      title: banner.title,
      description: banner.description,
      ctaTitle: banner.ctaTitle,
      ctaLink: banner.ctaLink,
      imageUrl: banner.imageUrl,
      gradientColors: banner.gradientColors,
      courseIds: banner.courseIds,
      status: banner.status,
    }, user.id);

    if (response.success) {
      await loadBanners();
      toast({
        title: "Banner dupicated successfully!"
      });
      return;
    }

    toast({
      title: "Banner dupication failed!"
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Banners</h1>
            <p className="text-muted-foreground mt-1">
              Manage promotional banners for enrolled users
            </p>
          </div>
          <Button onClick={() => navigate('/admin/create-banner')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Banner
          </Button>
        </div>

        {/* Banners Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              All Banners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : banners.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No banners created yet</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/admin/create-banner')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Banner
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Has Image</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banners.map((banner) => (
                      <TableRow key={banner.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="line-clamp-1">{banner.title}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {banner.description}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleToggleStatus(banner)}
                            className="cursor-pointer"
                          >
                            {getStatusBadge(banner.status)}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {banner.courseIds.length} course{banner.courseIds.length !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {banner.imageUrl ? (
                            <Badge variant="default" className="bg-blue-500">
                              <Eye className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Gradient</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(banner.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/edit-banner/${banner.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateBanner(banner)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBanner(banner);
                                setConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        title="Delete Banner"
        body={`Are you sure you want to delete "${selectedBanner?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </AdminLayout>
  );
};

export default AdminBannersPage;

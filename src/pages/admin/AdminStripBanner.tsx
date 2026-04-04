import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUpDown } from "lucide-react";
import { stripBannerService } from "@/services/stripBannerService";
import { StripBanner } from "@/types/strip-banner";
import { useToast } from "@/hooks/use-toast";
import StripBannerForm from "../../components/StripBannerForm";
import AdminLayout from "@/components/AdminLayout";

const AdminStripBanners = () => {
  const [banners, setBanners] = useState<StripBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<StripBanner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const result = await stripBannerService.getAllStripBanners();
      if (result.success) {
        setBanners(result.data);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast({
        title: "Error",
        description: "Failed to load banners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (banner: StripBanner) => {
    try {
      await stripBannerService.toggleStripBannerActive(banner.id);
      await fetchBanners();
      toast({
        title: "Success",
        description: `Banner ${banner.active ? "deactivated" : "activated"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update banner",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    try {
      await stripBannerService.deleteStripBanner(bannerId);
      await fetchBanners();
      toast({
        title: "Success",
        description: "Banner deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete banner",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const newBanners = [...banners];
    const [movedBanner] = newBanners.splice(fromIndex, 1);
    newBanners.splice(toIndex, 0, movedBanner);

    // Update display order
    const updatedBanners = newBanners.map((banner, index) => ({
      ...banner,
      displayOrder: index,
    }));

    setBanners(updatedBanners);

    // Save to Firebase
    try {
      await stripBannerService.reorderBanners(updatedBanners.map((b) => b.id));
      toast({
        title: "Success",
        description: "Banners reordered successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reorder banners",
        variant: "destructive",
      });
      // Revert on error
      fetchBanners();
    }
  };

  const getPageBadges = (banner: StripBanner) => {
    const badges = [];
    if (banner.showOnDashboard) badges.push("Dashboard");
    if (banner.showOnLanding) badges.push("Landing");
    if (banner.showOnCoursePages) badges.push("Courses");
    return badges;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 ">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strip Banners</h1>
            <p className="text-muted-foreground">
              Manage promotional banners displayed across the platform
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingBanner(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Banner
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {banners.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">No banners created yet</div>
                <Button onClick={() => setIsFormOpen(true)}>Create your first banner</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {banners.map((banner, index) => (
                  <div
                    key={banner.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => index > 0 && handleReorder(index, index - 1)}
                            disabled={index === 0}
                          >
                            <ArrowUpDown className="h-4 w-4 rotate-90" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              index < banners.length - 1 && handleReorder(index, index + 1)
                            }
                            disabled={index === banners.length - 1}
                          >
                            <ArrowUpDown className="h-4 w-4 -rotate-90" />
                          </Button>
                        </div>

                        <div
                          className="h-12 w-32 rounded-md border"
                          style={{
                            background: `linear-gradient(${banner.gradientAngle}deg, ${banner.gradientStart}, ${banner.gradientEnd})`,
                          }}
                        />

                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{banner.title}</h3>
                            <Badge variant={banner.active ? "default" : "secondary"}>
                              {banner.active ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Order: {banner.displayOrder}
                            </span>
                          </div>
                          {banner.subtitle && (
                            <p className="text-sm text-muted-foreground mt-1">{banner.subtitle}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {getPageBadges(banner).map((badge) => (
                              <Badge key={badge} variant="outline" className="text-xs">
                                {badge}
                              </Badge>
                            ))}
                            {banner.ctaActive && (
                              <Badge variant="secondary" className="text-xs">
                                CTA: {banner.ctaText}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={banner.active}
                          onCheckedChange={() => handleToggleActive(banner)}
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingBanner(banner);
                            setIsFormOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(banner.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Delay:</span> {banner.delaySeconds}s
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {banner.slideDuration}ms
                      </div>
                      <div>
                        <span className="font-medium">Dismissal:</span> {banner.dismissalHours}h
                      </div>
                      <div>
                        <span className="font-medium">Text Color:</span>
                        <span
                          className="inline-block w-4 h-4 rounded-full ml-2 border"
                          style={{ backgroundColor: banner.textColor }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isFormOpen && (
          <div className="fixed left-0 top-0 p-0 h-screen w-screen bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg max-w-4xl  overflow-y-auto">
              <StripBannerForm
                banner={editingBanner || undefined}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingBanner(null);
                  fetchBanners();
                }}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingBanner(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStripBanners;

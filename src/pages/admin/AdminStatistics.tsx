import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Users, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { statisticsService, type BasicStats } from "@/services/statisticsService";

const numberFmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);

// Helper to safely turn any error into a string
const toMessage = (err: unknown, fallback = "Failed to load statistics"): string => {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string") {
    return (err as any).message as string;
  }
  return fallback;
};

const StatCard: React.FC<{
  title: string;
  value: number | null;
  icon: React.ReactNode;
  description?: string;
}> = ({ title, value, icon, description }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {value === null ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <div className="text-3xl font-bold">{numberFmt(value)}</div>
        )}
        {description && (
          <CardDescription className="mt-1">{description}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
};

const AdminStatistics: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<BasicStats>({
    totalBundles: 0,
    totalUsers: 0,
    totalEnrollments: 0,
  });

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await statisticsService.getBasicStats(); // Result<BasicStats>
      if (res.success) {
        setStats(res.data);
      } else {
        toast({
          title: "Error",
          description: toMessage(res.error, "Failed to load statistics"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: toMessage(error, "Failed to load statistics"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Overview of bundles, users, and enrollments.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Bundles"
              value={isLoading ? null : stats.totalBundles}
              icon={<Package className="h-5 w-5" />}
              description="Total number of bundles"
            />
            <StatCard
              title="Users"
              value={isLoading ? null : stats.totalUsers}
              icon={<Users className="h-5 w-5" />}
              description="Total registered users"
            />
            <StatCard
              title="Enrollments"
              value={isLoading ? null : stats.totalEnrollments}
              icon={<GraduationCap className="h-5 w-5" />}
              description="Total enrollments"
            />
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminStatistics;
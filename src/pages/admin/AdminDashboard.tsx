import { useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Package, PlusCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BasicStats, statisticsService } from "@/services/statisticsService";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const StatCard: React.FC<{
  title: string;
  value: number | null;
  icon: React.ReactNode;
  description?: string;
}> = ({ title, value, icon, description }) => {
  const numberFmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(n);

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

export function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<BasicStats>({
    totalBundles: 0,
    totalUsers: 0,
    totalEnrollments: 0,
  });

  const toMessage = (err: unknown, fallback = "Failed to load statistics"): string => {
    if (typeof err === "string") return err;
    if (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string") {
      return (err as any).message as string;
    }
    return fallback;
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your courses, cohorts, and students
          </p>
        </div>

        {/*  Buttons stack on mobile, row on larger screens */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="pill"
            onClick={() => navigate("/admin/create-course")}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <PlusCircle className=" h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline"></span>New Course
          </Button>

          <Button
            variant="pill"
            onClick={() => navigate("/admin/create-bundle")}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <PlusCircle className=" h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline"></span>Course Bundle
          </Button>

          <Button
            variant="pill"
            onClick={() => navigate("/admin/create-coupon")}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <PlusCircle className=" h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">New</span>New Coupon
          </Button>
        </div>
      </div>
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
}

export default AdminDashboard;

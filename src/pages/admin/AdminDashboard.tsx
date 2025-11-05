import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/AdminLayout";

export function AdminDashboard() {
  const navigate = useNavigate();

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
    </AdminLayout>
  );
}

export default AdminDashboard;

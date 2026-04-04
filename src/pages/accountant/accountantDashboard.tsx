import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountantLayout from "@/components/accountantLayout";

export function AccountantDashboard() {
  const navigate = useNavigate();

  return (
   <AccountantLayout>
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
    <div>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
        Accountant Dashboard
      </h1>
      <p className="text-muted-foreground">
        Manage  financial records, invoices, and reports
      </p>
    </div>

    {/* Buttons stack on mobile, row on larger screens */}
    <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
      {/* <Button
        variant="pill"
        onClick={() => navigate("/accountant/create-invoice")}
        size="sm"
        className="text-xs sm:text-sm"
      >
        <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden xs:inline"></span>New Invoice
      </Button>

      <Button
        variant="pill"
        onClick={() => navigate("/accountant/create-bill")}
        size="sm"
        className="text-xs sm:text-sm"
      >
        <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden xs:inline"></span>New Bill
      </Button>

      <Button
        variant="pill"
        onClick={() => navigate("/accountant/generate-report")}
        size="sm"
        className="text-xs sm:text-sm"
      >
        <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden xs:inline">New</span>Financial Report
      </Button> */}
    </div>
  </div>
</AccountantLayout>

  );
}

export default AccountantDashboard;

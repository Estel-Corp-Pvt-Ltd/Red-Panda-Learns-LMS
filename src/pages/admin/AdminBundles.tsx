import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { bundleService } from "@/services/bundleService";
import { useDebounce } from "@/hooks/useDebounce";
import { Bundle } from "@/types/bundle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  PlusCircle,
  Edit,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
  Filter,
} from "lucide-react";
import { BUNDLE_STATUS, COURSE_MODE, CURRENCY } from "@/constants";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginatedBundles {
  data: Bundle[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

type BUNDLE_STATUS = (typeof BUNDLE_STATUS)[keyof typeof BUNDLE_STATUS];

type BundlePriceFilter = "Zero Price" | "Non Zero Price" | "All Prices";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const AdminBundles: React.FC = () => {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<PaginatedBundles>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState<BUNDLE_STATUS | "ALL">(
    "ALL"
  );
  const [bundlePriceFilterValue, setBundlePriceFilterValue] =
    useState<BundlePriceFilter>("All Prices");
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Track previous filter values to detect filter changes vs page changes
  const [prevFilters, setPrevFilters] = useState({ searchQuery, statusFilter, bundlePriceFilterValue, itemsPerPage });

  useEffect(() => {
    const filtersChanged =
      prevFilters.searchQuery !== searchQuery ||
      prevFilters.statusFilter !== statusFilter ||
      prevFilters.bundlePriceFilterValue !== bundlePriceFilterValue ||
      prevFilters.itemsPerPage !== itemsPerPage;

    if (filtersChanged) {
      setPrevFilters({ searchQuery, statusFilter, bundlePriceFilterValue, itemsPerPage });
      if (currentPage !== 1) {
        setCurrentPage(1);
        return; // performSearch will be called when currentPage updates
      }
    }

    performSearch();
  }, [searchQuery, statusFilter, bundlePriceFilterValue, currentPage, itemsPerPage]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const filters: string[] = [];
      if (statusFilter !== "ALL") {
        filters.push(`status = "${statusFilter}"`);
      }
      if (bundlePriceFilterValue === "Non Zero Price") {
        filters.push("salePrice > 0");
      } else if (bundlePriceFilterValue === "Zero Price") {
        filters.push("salePrice = 0");
      }

      const offset = (currentPage - 1) * itemsPerPage;
      const result = await bundleService.searchBundles(searchQuery, {
        limit: itemsPerPage,
        offset,
        filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      });

      if (result.success && result.data) {
        setBundles({
          data: result.data.data,
          hasNextPage: result.data.hasNextPage,
          hasPreviousPage: result.data.hasPreviousPage,
          nextCursor: null,
          previousCursor: null,
          totalCount: result.data.totalCount,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to search bundles",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching bundles:", error);
      toast({
        title: "Error",
        description: "An error occurred while searching bundles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
  };

  const handleNextPage = () => {
    if (!bundles.hasNextPage || isLoading) return;
    setCurrentPage((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    if (!bundles.hasPreviousPage || isLoading) return;
    setCurrentPage((prev) => prev - 1);
  };

  const clearSearch = () => {
    setSearchInput("");
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setStatusFilter("ALL");
    setBundlePriceFilterValue("All Prices");
    setItemsPerPage(10);
  };

  const deleteBundle = async () => {
    if (!selectedBundle) return;

    try {
      const result = await bundleService.deleteBundle(selectedBundle.id);
      if (!result.success) {
        toast({
          title: "Error",
          description: "Failed to delete bundle.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Bundle deleted successfully.",
      });

      // Reload bundles to reflect deletion
      await performSearch();
    } catch (error) {
      console.error("Error deleting bundle:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the bundle",
        variant: "destructive",
      });
    } finally {
      setConfirmOpen(false);
      setSelectedBundle(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: CURRENCY.INR,
    }).format(amount);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
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

  // Determine if we're in filtered state
  const isFiltered =
    searchQuery ||
    statusFilter !== "ALL" ||
    bundlePriceFilterValue !== "All Prices";

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Course Bundles</CardTitle>
              <CardDescription>
                Manage your course bundles and bundle enrollments.
                {bundles.totalCount > 0 &&
                  ` (Page ${currentPage})`}
              </CardDescription>
            </div>
            <Button
              onClick={() => navigate("/admin/create-bundle")}
              className="flex items-center gap-2"
              variant="pill"
              size="sm"
            >
              <PlusCircle className="h-4 w-4" />
              Create Bundle
            </Button>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search bundles by title or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as BUNDLE_STATUS | "ALL")
                  }
                  className="border border-input rounded-md px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground"
                >
                  <option value="ALL">All Status</option>
                  <option value={BUNDLE_STATUS.DRAFT}>Draft</option>
                  <option value={BUNDLE_STATUS.PUBLISHED}>Published</option>
                  <option value={BUNDLE_STATUS.ARCHIVED}>Archived</option>
                </select>
              </div>

              {/* Price Filter */}
              <Select
                value={bundlePriceFilterValue}
                onValueChange={(v) => setBundlePriceFilterValue(v as BundlePriceFilter)}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Select Pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"All Prices"}>All Prices</SelectItem>
                  <SelectItem value={"Zero Price"}>Zero Price</SelectItem>
                  <SelectItem value={"Non Zero Price"}>
                    Non Zero Price
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-2">Loading bundles...</p>
              </div>
            </div>
          ) : bundles.data.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {isFiltered ? "No bundles found" : "No bundles"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isFiltered
                  ? "Try adjusting your search or filters."
                  : "Get started by creating your first course bundle."}
              </p>
              {isFiltered && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              )}
              {!isFiltered && (
                <div className="mt-6">
                  <Button
                    onClick={() => navigate("/admin/create-bundle")}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create Bundle
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Items Per Page Selector and Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="text-sm text-muted-foreground">
                  Showing {bundles.data.length} of {bundles.totalCount} total
                  bundles
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Show:
                  </span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    per page
                  </span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bundle</TableHead>
                    <TableHead>BundleId</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Pricing Model</TableHead>
                    <TableHead>Mode</TableHead>
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
                            <div className="font-medium">{bundle.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {truncateText(bundle.description, 80)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{bundle.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {bundle.courses.length} courses
                          {bundle.courses.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {truncateText(
                                bundle.courses
                                  .map((course) => course.title)
                                  .join(", "),
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
                        <Badge variant={bundle.mode === COURSE_MODE.LIVE ? "default" : "outline"} className="text-xs">
                          {bundle.mode || COURSE_MODE.SELF_PACED}
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
                            onClick={() =>
                              navigate(`/admin/edit-bundle/${bundle.id}`)
                            }
                            title="Edit Bundle"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/course-bundle/${bundle.slug}`)
                            }
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
                  Page {currentPage} of{" "}
                  {Math.ceil(bundles.totalCount / itemsPerPage)}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={
                      !bundles.hasPreviousPage ||
                      currentPage === 1 ||
                      isLoading
                    }
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
        onConfirm={deleteBundle}
        title="Delete Bundle"
        body={`Are you sure you want to delete "${selectedBundle?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </AdminLayout>
  );
};

export default AdminBundles;

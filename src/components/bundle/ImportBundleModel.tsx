import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, ChevronLeft, ChevronRight, Loader2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bundleService } from "@/services/bundleService";
import { Bundle } from "@/types/bundle";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ImportBundleModalProps = {
  bundleId?: string; // Optional: exclude current bundle
  isOpen: boolean;
  onClose: () => void;
  onImport?: (bundles: Bundle[]) => void;
};

interface PaginatedBundles {
  data: Bundle[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export const ImportBundleModal = ({
  bundleId,
  isOpen,
  onClose,
  onImport,
}: ImportBundleModalProps) => {
  const { toast } = useToast();
  const [bundles, setBundles] = useState<PaginatedBundles>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [selectedBundles, setSelectedBundles] = useState<Set<Bundle>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPaginationState(prev => ({ ...prev, cursor: null, currentPage: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load bundles when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      loadBundles();
    }
  }, [isOpen, searchQuery, paginationState.cursor, paginationState.pageDirection, itemsPerPage]);

  // Add scroll management and state reset
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Reset state when modal closes
      setSelectedBundles(new Set());
      setSearchInput('');
      setSearchQuery('');
      setPaginationState({
        cursor: null,
        pageDirection: 'next',
        currentPage: 1
      });
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadBundles = async () => {
    setIsLoading(true);
    try {
      const filters = [];

      // Add search filter if query exists
      if (searchQuery.trim()) {
        filters.push({
          field: 'title',
          op: '>=',
          value: searchQuery.toLowerCase()
        }, {
          field: 'title',
          op: '<=',
          value: searchQuery.toLowerCase() + '\uf8ff'
        });
      }

      // Exclude the current bundle from results if provided
      if (bundleId) {
        filters.push({
          field: 'id',
          op: '!=',
          value: bundleId
        });
      }

      // Only show published bundles for import
      filters.push({
        field: 'status',
        op: '==',
        value: 'PUBLISHED'
      });

      const result = await bundleService.getBundles(filters, {
        limit: itemsPerPage,
        orderBy: { field: 'title', direction: 'asc' },
        cursor: paginationState.cursor,
        pageDirection: paginationState.pageDirection,
      });

      if (result.success && result.data) {
        setBundles({
          data: result.data.data,
          hasNextPage: result.data.hasNextPage,
          hasPreviousPage: result.data.hasPreviousPage,
          nextCursor: result.data.nextCursor,
          previousCursor: result.data.previousCursor,
          totalCount: result.data.totalCount || result.data.data.length
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load bundles",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading bundles:', error);
      toast({
        title: "Error",
        description: "An error occurred while loading bundles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setPaginationState(prev => ({
      ...prev,
      cursor: null,
      currentPage: 1
    }));
  };

  const handleNextPage = () => {
    if (!bundles.hasNextPage || isLoading) return;
    setPaginationState(prev => ({
      cursor: bundles.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));
  };

  const handlePreviousPage = () => {
    if (!bundles.hasPreviousPage || isLoading) return;
    setPaginationState(prev => ({
      cursor: bundles.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setPaginationState(prev => ({
      ...prev,
      cursor: null,
      currentPage: 1
    }));
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPaginationState(prev => ({
      ...prev,
      cursor: null,
      currentPage: 1
    }));
  };

  const toggleBundleSelection = (bundle: Bundle) => {
    const newSelection = new Set(selectedBundles);
    if (newSelection.has(bundle)) {
      newSelection.delete(bundle);
    } else {
      newSelection.add(bundle);
    }
    setSelectedBundles(newSelection);
  };

  const handleImport = async () => {
    try {
      onImport && onImport(Array.from(selectedBundles));
      toast({
        title: "Success",
        description: `${selectedBundles.size} bundle(s) imported successfully`
      });
      onClose();
    } catch (error) {
      console.error('Error importing bundles:', error);
      toast({
        title: "Error",
        description: "Failed to import bundles",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return "default";
      case 'DRAFT':
        return "secondary";
      case 'ARCHIVED':
        return "outline";
      default:
        return "secondary";
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Import Bundles
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select bundles to import. Only published bundles are available for import.
            {bundleId && " The current bundle is excluded from the list."}
          </DialogDescription>
        </DialogHeader>

        <Card className="border-none h-full shadow-none bg-transparent flex-1 flex flex-col overflow-hidden">
          <CardContent className="pt-2 flex-1 h-full overflow-hidden flex flex-col">
            {/* Search and Controls */}
            <div className="space-y-4 mb-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search bundles by title..."
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
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

              {/* Items Per Page and Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {bundles.totalCount > 0 ? (
                    <>
                      Showing {bundles.data.length} of {bundles.totalCount} bundles
                      {selectedBundles.size > 0 && ` • ${selectedBundles.size} selected`}
                    </>
                  ) : (
                    "No bundles found"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Show:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map(option => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Bundles List */}
            <div className="flex-1 h-full overflow-y-scroll overflow-hidden border rounded-lg">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading bundles...</span>
                </div>
              ) : bundles.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? `No bundles found matching "${searchQuery}"` : 'No bundles available to import'}
                </div>
              ) : (
                <div className="">
                  {bundles.data.map((bundle) => (
                    <div
                      key={bundle.id}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${selectedBundles.has(bundle) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      onClick={() => toggleBundleSelection(bundle)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={selectedBundles.has(bundle)}
                              onChange={() => toggleBundleSelection(bundle)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex items-center gap-3">
                              {bundle.thumbnail && (
                                <img
                                  src={bundle.thumbnail}
                                  alt={bundle.title}
                                  className="h-8 w-8 rounded-md object-cover"
                                />
                              )}
                              <h3 className="font-medium text-sm">{bundle.title}</h3>
                            </div>
                          </div>

                          {bundle.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {truncateText(bundle.description, 120)}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span>Price: {formatCurrency(bundle.salePrice)}</span>
                              {bundle.regularPrice > bundle.salePrice && (
                                <span className="line-through">
                                  {formatCurrency(bundle.regularPrice)}
                                </span>
                              )}
                            </div>
                            <span>Courses: {bundle.courses?.length || 0}</span>
                            <span>Instructor: {bundle.instructorName}</span>
                            <Badge variant={getStatusBadgeVariant(bundle.status)} className="text-xs">
                              {bundle.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {bundle.pricingModel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {bundles.data.length > 0 && (
              <div className="flex items-center justify-between space-x-2 pt-4 border-t">
                <div className="flex-1 text-sm text-muted-foreground">
                  Page {paginationState.currentPage} of {Math.ceil(bundles.totalCount / itemsPerPage)}
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
            )}
          </CardContent>

          <CardFooter className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              disabled={selectedBundles.size === 0 || isLoading}
              onClick={handleImport}
            >
              Import Selected Bundles ({selectedBundles.size})
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

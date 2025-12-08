import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { CertificateRequest } from "@/types/certificate-request";
import { useAuth } from "@/contexts/AuthContext";
import { certificateRequestService } from "@/services/certificate-request-service";

interface PaginatedRequests {
    data: CertificateRequest[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: any;
    previousCursor?: any;
    totalCount: number;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const AdminCertificateRequests = () => {
    const { user } = useAuth();
    const adminUid = user?.id;

    const [requests, setRequests] = useState<PaginatedRequests>({
        data: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [pagination, setPagination] = useState({
        cursor: null as any,
        pageDirection: "next" as "next" | "previous",
        currentPage: 1,
    });

    // --------------------------------
    // Fetch pending requests (paginated)
    // --------------------------------
    const loadRequests = async () => {
        setIsLoading(true);
        const result =
            await certificateRequestService.getPendingCertificateRequests({
                limit: itemsPerPage,
                cursor: pagination.cursor,
                pageDirection: pagination.pageDirection,
            });

        if (!result.success || !result.data) {
            toast({
                title: "Error",
                description: "Failed to load certificate requests",
                variant: "destructive",
            });
            setIsLoading(false);
            return;

        }
        setRequests(result.data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadRequests();
    }, [pagination, itemsPerPage]);

    // --------------------------------
    // Pagination handlers
    // --------------------------------
    const handleNextPage = () => {
        if (!requests.hasNextPage || isLoading) return;

        setPagination((prev) => ({
            cursor: requests.nextCursor,
            pageDirection: "next",
            currentPage: prev.currentPage + 1,
        }));
    };

    const handlePreviousPage = () => {
        if (!requests.hasPreviousPage || isLoading) return;

        setPagination((prev) => ({
            cursor: requests.previousCursor,
            pageDirection: "previous",
            currentPage: prev.currentPage - 1,
        }));
    };

    const handleItemsPerPageChange = (value: string) => {
        setItemsPerPage(parseInt(value, 10));
        setPagination({
            cursor: null,
            pageDirection: "next",
            currentPage: 1,
        });
    };

    // --------------------------------
    // Approve / Reject
    // --------------------------------
    const approveRequest = async (requestId: string) => {
        if (!adminUid) return;

        const result =
            await certificateRequestService.approveCertificateRequest(
                requestId,
                adminUid
            );

        if (!result.success) {
            toast({
                title: "Error",
                description: "Failed to approve request",
                variant: "destructive",
            });
            return;
        }

        toast({
            title: "Approved",
            description: "Certificate issued successfully",
        });

        await loadRequests();
    };

    const rejectRequest = async (requestId: string) => {
        if (!adminUid) return;

        const result =
            await certificateRequestService.rejectCertificateRequest(
                requestId,
                adminUid
            );

        if (!result.success) {
            toast({
                title: "Error",
                description: "Failed to reject request",
                variant: "destructive",
            });
            return;
        }

        toast({
            title: "Rejected",
            description: "Certificate request rejected",
        });

        await loadRequests();
    };

    // --------------------------------
    // UI
    // --------------------------------
    if (isLoading && requests.data.length === 0) {
        return (
            <AdminLayout>
                <Card>
                    <CardContent className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </CardContent>
                </Card>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <Card>
                <CardHeader>
                    <CardTitle>Certificate Requests</CardTitle>
                    <CardDescription>
                        Pending certificate approvals
                        {requests.totalCount > 0 &&
                            ` (Page ${pagination.currentPage})`}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {requests.data.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No pending certificate requests
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {requests.data.length} of {requests.totalCount}
                                </div>

                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => handleItemsPerPageChange(e.target.value)}
                                    className="border rounded-md px-2 py-1 text-sm"
                                >
                                    {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt} / page
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {requests.data.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div className="font-medium">{req.userName}</div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {req.userEmail}
                                            </TableCell>
                                            <TableCell>
                                                {req.courseName}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => approveRequest(req.id)}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => rejectRequest(req.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            <div className="flex justify-between items-center pt-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {pagination.currentPage} of{" "}
                                    {Math.ceil(requests.totalCount / itemsPerPage)}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePreviousPage}
                                        disabled={!requests.hasPreviousPage || isLoading}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleNextPage}
                                        disabled={!requests.hasNextPage || isLoading}
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
        </AdminLayout>
    );
};

export default AdminCertificateRequests;

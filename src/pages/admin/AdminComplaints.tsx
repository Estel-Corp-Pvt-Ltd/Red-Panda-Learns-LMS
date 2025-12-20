import AdminLayout from "@/components/AdminLayout";
import ComplaintDetailModal from "@/components/ComplaintDetailModal";
import { ComplaintRedressalMailSenderModal } from "@/components/ComplaintRedressalMailSenderModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    COMPLAINT_CATEGORY,
    COMPLAINT_SEVERITY,
    COMPLAINT_STATUS,
} from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { complaintService } from "@/services/complaintService";
import { Complaint } from "@/types/complaint";
import {
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Eye,
    Loader2,
    Mail,
    Search
} from "lucide-react";
import { useEffect, useState } from "react";

interface PaginatedComplaints {
    data: Complaint[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: any;
    previousCursor?: any;
    totalCount: number;
};

const AdminComplaints = () => {

    const { user } = useAuth();

    const [complaints, setComplaints] = useState<PaginatedComplaints>({
        data: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedComplaint, setSelectedComplaint] =
        useState<Complaint | null>(null);
    const [isComplaintOpen, setIsComplaintOpen] = useState(false);
    const [isComplaintRedressalMailSenderOpen, setIsComplaintRedressalMailSenderOpen] = useState(false);

    const [statusFilter, setStatusFilter] =
        useState<keyof typeof COMPLAINT_STATUS | "ALL">("ALL");
    const [severityFilter, setSeverityFilter] =
        useState<keyof typeof COMPLAINT_SEVERITY | "ALL">("ALL");
    const [categoryFilter, setCategoryFilter] =
        useState<keyof typeof COMPLAINT_CATEGORY | "ALL">("ALL");

    const [itemsPerPage] = useState(10);
    const [paginationState, setPaginationState] = useState({
        cursor: null as any,
        pageDirection: "next" as "next" | "previous",
        currentPage: 1,
    });

    /* Debounced search */
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchInput);
            setPaginationState({ cursor: null, pageDirection: "next", currentPage: 1 });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        loadComplaints();
    }, [
        searchQuery,
        statusFilter,
        severityFilter,
        categoryFilter,
        paginationState,
        itemsPerPage,
        isComplaintOpen,
        isComplaintRedressalMailSenderOpen
    ]);

    const loadComplaints = async () => {
        setIsLoading(true);
        try {
            const filters: any[] = [];

            if (statusFilter !== "ALL") {
                filters.push({
                    field: "status",
                    op: "==",
                    value: COMPLAINT_STATUS[statusFilter],
                });
            }

            if (severityFilter !== "ALL") {
                filters.push({
                    field: "severity",
                    op: "==",
                    value: COMPLAINT_SEVERITY[severityFilter],
                });
            }

            if (categoryFilter !== "ALL") {
                filters.push({
                    field: "category",
                    op: "==",
                    value: COMPLAINT_CATEGORY[categoryFilter],
                });
            }

            const result = await complaintService.getComplaints(filters, {
                limit: itemsPerPage,
                orderBy: { field: "createdAt", direction: "desc" },
                cursor: paginationState.cursor,
                pageDirection: paginationState.pageDirection,
            });

            if (!result.success || !result.data) {
                toast({
                    title: "Error",
                    description: "Failed to load complaints",
                    variant: "destructive",
                });
                return;
            }

            let finalData = result.data.data;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                finalData = finalData.filter(
                    (c) =>
                        c.userName?.toLowerCase().includes(q) ||
                        c.userEmail?.toLowerCase().includes(q) ||
                        c.description?.toLowerCase().includes(q)
                );
            }

            setComplaints({
                data: finalData,
                hasNextPage: result.data.hasNextPage,
                hasPreviousPage: result.data.hasPreviousPage,
                nextCursor: result.data.nextCursor,
                previousCursor: result.data.previousCursor,
                totalCount: result.data.totalCount,
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case COMPLAINT_STATUS.RESOLVED:
                return "default";
            case COMPLAINT_STATUS.UNDER_REVIEW:
                return "secondary";
            case COMPLAINT_STATUS.ESCALATED:
                return "destructive";
            default:
                return "outline";
        }
    };

    if (isLoading && complaints.data.length === 0) {
        return (
            <AdminLayout>
                <Card>
                    <CardContent className="py-10 flex justify-center">
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
                    <CardTitle>Complaints</CardTitle>
                    <CardDescription>
                        Manage and resolve user complaints (Page {paginationState.currentPage})
                    </CardDescription>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mt-4">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by user or description"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select
                            value={statusFilter}
                            onValueChange={(value) =>
                                setStatusFilter(value as typeof statusFilter)
                            }
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                {Object.values(COMPLAINT_STATUS).map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={severityFilter}
                            onValueChange={(value) =>
                                setSeverityFilter(value as typeof severityFilter)
                            }
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Severity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Severity</SelectItem>
                                {Object.values(COMPLAINT_SEVERITY).map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={categoryFilter}
                            onValueChange={(value) =>
                                setCategoryFilter(value as typeof categoryFilter)
                            }
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {Object.values(COMPLAINT_CATEGORY).map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {complaints.data.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.id}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{c.userName}</div>
                                            <div className="text-muted-foreground">
                                                {c.userEmail}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadge(c.status)}>
                                            {c.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{c.severity}</TableCell>
                                    <TableCell>{c.category}</TableCell>
                                    <TableCell>
                                        {c.createdAt instanceof Date
                                            ? c.createdAt.toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={
                                                () => {
                                                    setSelectedComplaint(c);
                                                    setIsComplaintOpen(true);
                                                }
                                            }
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={
                                                () => {
                                                    setSelectedComplaint(c);
                                                    setIsComplaintRedressalMailSenderOpen(true);
                                                }
                                            }
                                        >
                                            <Mail className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            className={`${c.status !== COMPLAINT_STATUS.RESOLVED ? "" : "bg-slate-500 cursor-not-allowed"}`}
                                            disabled={c.status === COMPLAINT_STATUS.RESOLVED}
                                            onClick={async () => {
                                                const response = await complaintService.resolveComplaint(c.id, user.id);
                                                if (response.success) {
                                                    toast({
                                                        title: "Complaint Resolved"
                                                    });
                                                    await loadComplaints();
                                                    return;
                                                }
                                                toast({
                                                    title: "Failed to resolve complaint",
                                                    variant: "destructive"
                                                });
                                            }}
                                        >
                                            <ClipboardCheck className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex justify-between items-center py-4">
                        <div className="text-sm text-muted-foreground">
                            Page {paginationState.currentPage}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!complaints.hasPreviousPage}
                                onClick={() =>
                                    setPaginationState((p) => ({
                                        cursor: complaints.previousCursor,
                                        pageDirection: "previous",
                                        currentPage: p.currentPage - 1,
                                    }))
                                }
                            >
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!complaints.hasNextPage}
                                onClick={() =>
                                    setPaginationState((p) => ({
                                        cursor: complaints.nextCursor,
                                        pageDirection: "next",
                                        currentPage: p.currentPage + 1,
                                    }))
                                }
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>

                {
                    selectedComplaint &&
                    <ComplaintDetailModal
                        open={isComplaintOpen}
                        onOpenChange={setIsComplaintOpen}
                        complaint={selectedComplaint}
                    />
                }
                {
                    selectedComplaint &&
                    <ComplaintRedressalMailSenderModal
                        open={isComplaintRedressalMailSenderOpen}
                        onOpenChange={setIsComplaintRedressalMailSenderOpen}
                        complaint={selectedComplaint}
                        userId={user.id}
                    />
                }
            </Card>
        </AdminLayout>
    );
};

export default AdminComplaints;

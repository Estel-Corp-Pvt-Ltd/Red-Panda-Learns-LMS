import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coupon } from "@/types/coupon"; // adjust if needed

interface CouponDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupon: Coupon | null;
};

const statusColorMap: Record<string, string> = {
    ACTIVE: "secondary",
    INACTIVE: "outline",
    EXPIRED: "destructive",
};

export default function CouponDetailModal({
    open,
    onOpenChange,
    coupon,
}: CouponDetailModalProps) {
    if (!coupon) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-[95vw] p-0">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle className="flex flex-wrap items-center justify-between gap-3 pr-3">
                        <div className="flex items-center gap-3">
                            <span>Coupon #{coupon.id}</span>
                            <Badge variant={statusColorMap[coupon.status] as any}>
                                {coupon.status}
                            </Badge>
                        </div>
                    </DialogTitle>

                    <DialogDescription>
                        Created by {coupon.createdbyMail || "Unknown"}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[75vh] px-6 pb-6">
                    {/* Main info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                        <InfoItem label="Coupon Code" value={coupon.code} />
                        <InfoItem label="Discount" value={`${coupon.discountPercentage}%`} />
                        <InfoItem
                            label="Expiry Date"
                            value={
                                coupon.expiryDate instanceof Date
                                    ? coupon.expiryDate.toLocaleDateString()
                                    : "—"
                            }
                        />
                        <InfoItem label="Usage Limit" value={String(coupon.usageLimit)} />
                        <InfoItem label="Total Used" value={String(coupon.totalUsed)} />

                        {coupon.createdAt && (
                            <InfoItem
                                label="Created At"
                                value={
                                    coupon.createdAt instanceof Date
                                        ? coupon.createdAt.toLocaleString()
                                        : "—"
                                }
                            />
                        )}
                    </div>

                    {/* Linked Courses */}
                    <div className="mt-6">
                        <h4 className="text-sm font-semibold mb-1">
                            Linked Courses ({coupon.linkedCourseIds?.length || 0})
                        </h4>

                        {coupon.linkedCourseIds &&
                            coupon.linkedCourseIds.length > 0 ? (
                            <ul className="list-disc ml-5 text-sm">
                                {coupon.linkedCourseIds.map((id) => (
                                    <li key={id}>{id}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">None</p>
                        )}
                    </div>

                    {/* Linked Bundles */}
                    <div className="mt-6">
                        <h4 className="text-sm font-semibold mb-1">
                            Linked Bundles ({coupon.linkedBundleIds?.length || 0})
                        </h4>

                        {coupon.linkedBundleIds &&
                            coupon.linkedBundleIds.length > 0 ? (
                            <ul className="list-disc ml-5 text-sm">
                                {coupon.linkedBundleIds.map((id) => (
                                    <li key={id}>{id}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">None</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-medium break-all">{value}</span>
        </div>
    );
};

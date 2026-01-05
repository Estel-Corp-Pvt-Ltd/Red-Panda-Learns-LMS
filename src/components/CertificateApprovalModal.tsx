import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { learningProgressService } from "@/services/learningProgressService";
import { Clock, BookOpen, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { Course } from "@/types/course";
import { courseService } from "@/services/courseService";
import { enrollmentService } from "@/services/enrollmentService";

interface CertificateApprovalModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: string;
    approveRequest: (requestId: string) => Promise<void>;
    userId: string;
    courseId: string;
};

export default function CertificateApprovalModal({
    open,
    onOpenChange,
    requestId,
    approveRequest,
    userId,
    courseId,
}: CertificateApprovalModalProps) {

    const [remark, setRemark] = useState("");
    const [loading, setLoading] = useState(false);
    const [totalTimeSpent, setTotalTimeSpent] = useState(0);
    const [completedLessons, setCompletedLessons] = useState(0);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [course, setCourse] = useState<Course>(null);

    let totalLessons = course ? course.topics.reduce((acc, topic) => acc + topic.items.length, 0) : 0;

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    useEffect(() => {
        const fetchCourseDetails = async () => {
            const data = await courseService.getCourseById(courseId);
            if (data) setCourse(data);
        };
        fetchCourseDetails();
    }, [courseId]);

    useEffect(() => {
        const fetchTotalTimeSpent = async () => {
            setIsLoadingData(true);
            const response = await learningProgressService.getCourseTimeSpent(userId, courseId);
            if (response.success && response.data) {
                setTotalTimeSpent(response.data.totalTimeSpentSec);
                setCompletedLessons(Object.keys(response.data.lessonHistory).length);
            }
            setIsLoadingData(false);
        };

        if (open) {
            fetchTotalTimeSpent();
        }
    }, [userId, courseId, open]);

    const handleApproval = async () => {
        setLoading(true);

        const response = await enrollmentService.issueCertificate(userId, courseId, remark);
        if (!response.success) {
            toast({
                title: "Remark not saved!"
            });
        }
        await approveRequest(requestId);
        setRemark("");
        setLoading(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg w-[95vw] p-6 space-y-6">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Award className="h-5 w-5 text-primary" />
                        </div>
                        <DialogTitle>Approve Certificate Request</DialogTitle>
                    </div>
                    <DialogDescription className="text-base">
                        Review the student's progress and optionally add a personalized remark.
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="border-2">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground mb-1">Total Time Spent</p>
                                    {isLoadingData ? (
                                        <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                                    ) : (
                                        <p className="text-lg font-semibold truncate">{formatTime(totalTimeSpent)}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground mb-1">Completed Lessons</p>
                                    {isLoadingData ? (
                                        <div className="h-6 w-12 bg-muted animate-pulse rounded" />
                                    ) : (
                                        <p className="text-lg font-semibold">{completedLessons}/{totalLessons}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Remark Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Certificate Remark</label>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                    </div>
                    <Textarea
                        placeholder="Enter remark..."
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="resize-none"
                        rows={4}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>

                    <Button onClick={handleApproval} disabled={loading || isLoadingData}>
                        {loading ? "Approving..." : "Approve Certificate"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

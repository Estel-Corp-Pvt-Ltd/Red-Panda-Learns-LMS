// src/pages/UserComplaints.tsx
import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { complaintService } from "@/services/complaintService";
import { motion } from "framer-motion";
import { Loader2, RefreshCcw, CheckCircle2, Clock, Calendar, ImageIcon, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import ImageModal from "@/components/ComplaintAttachmentsModal";

export default function UserComplaints() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [complaints, setComplaints] = useState([]);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const loadComplaints = async () => {
        setLoading(true);
        const res = await complaintService.getComplaintsByUser(user.id);
        if (!res.success) {
            toast({
                title: "Failed to fetch complaints",
                variant: "destructive"
            });
        }
        setComplaints(res.data || []);
        setLoading(false);
    };

    useEffect(() => {
        loadComplaints();
    }, [user.id]);

    const openImageModal = (images: string[], startIndex: number = 0) => {
        setSelectedImages(images);
        setSelectedImageIndex(startIndex);
        setIsModalOpen(true);
    };

    const closeImageModal = () => {
        setIsModalOpen(false);
        setSelectedImages([]);
        setSelectedImageIndex(0);
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case "RESOLVED":
                return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
            case "IN_PROGRESS":
                return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
            default:
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="w-full flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
                    <div className="max-w-6xl mx-auto">

                        {/* Page Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    Your Complaints
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    Track and manage your submitted reports.
                                </p>
                            </div>
                            <Button
                                onClick={loadComplaints}
                                variant="outline"
                                className="bg-white dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95"
                            >
                                <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500 dark:text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-sm font-medium">Fetching latest data...</span>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && complaints.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50">
                                <div className="p-4 rounded-full bg-gray-100 dark:bg-slate-800 mb-3">
                                    <CheckCircle2 className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold">No complaints found</h3>
                                <p className="text-sm text-gray-500">Everything seems to be in order!</p>
                            </div>
                        )}

                        {/* Grid Layout */}
                        {!loading && complaints.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {complaints.map((c, index) => (
                                    <motion.div
                                        key={c.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.3 }}
                                    >
                                        <Card className="h-full flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1 rounded-2xl overflow-hidden">

                                            <CardHeader className="pb-3 space-y-0">
                                                <div className="flex justify-between items-start">
                                                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(c.status)} flex items-center gap-1.5`}>
                                                        {c.status === 'RESOLVED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                        {c.status}
                                                    </div>
                                                </div>
                                                <CardTitle className="text-lg font-bold pt-3 line-clamp-1 group-hover:text-primary transition-colors">
                                                    {c.category}
                                                </CardTitle>
                                            </CardHeader>

                                            <CardContent className="flex-1 pb-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                                                    {c.description}
                                                </p>

                                                {/* Attachments Section */}
                                                {c.imageUrls && c.imageUrls.length > 0 && (
                                                    <div className="mt-5 space-y-3">
                                                        {/* Attachment Info & View Button */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg">
                                                                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                                                                <span className="font-medium">{c.imageUrls.length} Attachment{c.imageUrls.length > 1 ? 's' : ''}</span>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openImageModal(c.imageUrls)}
                                                                className="text-xs h-8 px-3 bg-white dark:bg-slate-800 hover:bg-primary hover:text-white dark:hover:bg-primary transition-colors"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                                View
                                                            </Button>
                                                        </div>

                                                        {/* Image Preview Thumbnails */}
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {c.imageUrls.slice(0, 4).map((url, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => openImageModal(c.imageUrls, i)}
                                                                    className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary transition-all group/thumb"
                                                                >
                                                                    <img
                                                                        src={url}
                                                                        alt={`Attachment ${i + 1}`}
                                                                        className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                                                                    />
                                                                    {/* Overlay for 4th image if more exist */}
                                                                    {i === 3 && c.imageUrls.length > 4 && (
                                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                            <span className="text-white font-semibold text-sm">
                                                                                +{c.imageUrls.length - 4}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {/* Hover overlay */}
                                                                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
                                                                        <Eye className="w-4 h-4 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* No Attachments */}
                                                {(!c.imageUrls || c.imageUrls.length === 0) && (
                                                    <div className="mt-5">
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg">
                                                            <ImageIcon className="w-3.5 h-3.5" />
                                                            <span>No attachments</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>

                                            <CardFooter className="pb-4 px-6 text-xs text-gray-400 border-t border-gray-100 dark:border-slate-800/50 mt-auto pt-4 flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Updated: {c.updatedAt?.toDate ? c.updatedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Image Modal */}
            <ImageModal
                isOpen={isModalOpen}
                onClose={closeImageModal}
                images={selectedImages}
                initialIndex={selectedImageIndex}
            />
        </div>
    );
}
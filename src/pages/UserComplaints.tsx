import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { complaintService } from "@/services/complaintService";
import { motion } from "framer-motion";
import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

export default function UserComplaints() {

    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [complaints, setComplaints] = useState([]);

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

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <div className="w-full max-w-4xl mx-auto p-6 overflow-y-auto">

                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Your Complaints</h1>
                        <Button onClick={loadComplaints} variant="outline" className="rounded-2xl p-2">
                            <RefreshCcw className="w-5 h-5" />
                        </Button>
                    </div>

                    {loading && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Loading complaints...
                        </div>
                    )}

                    {!loading && complaints.length === 0 && (
                        <div className="text-gray-500">No complaints found.</div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {complaints.map((c, index) => (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="rounded-2xl shadow-md p-4 hover:shadow-lg transition">
                                    <CardContent className="grid gap-3">
                                        <div className="text-lg font-semibold">{c.category}</div>
                                        <div className="text-sm text-gray-600 line-clamp-3">{c.description}</div>
                                        <div className="mt-2">
                                            <span
                                                className={
                                                    c.status === "RESOLVED"
                                                        ? "px-3 py-1 text-xs rounded-full bg-primary text-white"
                                                        : "px-3 py-1 text-xs rounded-full bg-white border border-gray-300"
                                                }
                                            >
                                                {c.status}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-700 grid gap-1 mt-1">
                                            <div>
                                                <span className="font-medium">Severity:</span> {c.severity}
                                            </div>
                                        </div>

                                        {c.imageUrls?.length > 0 && (
                                            <div className="text-xs text-gray-500">
                                                {c.imageUrls.length} image{c.imageUrls.length > 1 ? "s" : ""}
                                            </div>
                                        )}

                                        <div className="text-xs text-gray-500 mt-2">
                                            Last updated:{" "}
                                            {c.updatedAt?.toDate
                                                ? c.updatedAt.toDate().toLocaleString()
                                                : ""}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

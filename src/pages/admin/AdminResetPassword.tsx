import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

const AdminResetPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const functions = getFunctions();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast({
                title: "Error",
                description: "Provide an email address.",
                variant: "destructive",
            });
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters long.",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);
            const resetUserPassword = httpsCallable(functions, "resetUserPassword");

            const result = await resetUserPassword({ email, newPassword });
            const data = result.data as { success: boolean; message: string };

            if (data.success) {
                toast({
                    title: "✅ Success",
                    description: data.message,
                });
                setEmail("");
                setNewPassword("");
            } else {
                toast({
                    title: "⚠️ Failed",
                    description: data.message,
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Something went wrong. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="container mx-auto py-6">
                <Card className="max-w-lg mx-auto">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Reset User Password</CardTitle>
                                <CardDescription>
                                    Admins can manually reset a user’s password by email.
                                </CardDescription>
                            </div>
                            <KeyRound className="h-6 w-6 text-muted-foreground" />
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    User Email
                                </label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter user's email"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password
                                </label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {loading ? "Resetting..." : "Reset Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminResetPassword;

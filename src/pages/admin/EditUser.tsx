import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Header } from "@/components/layout/header";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { userService } from "@/services/userService";
import { User } from "@/types/user";
import { UserRole, UserStatus } from "@/types/general";
import { USER_ROLE, USER_STATUS } from "@/constants";

const EditUserPage = () => {
    const { userId } = useParams<{ userId: string }>();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<Partial<User>>({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        role: USER_ROLE.STUDENT,
        status: USER_STATUS.ACTIVE,
        organizationId: "",
        photoURL: "",
    });

    const navigate = useNavigate();

    // Load user data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                if (!userId) return;
                const data = await userService.getUserById(userId);
                if (!data) {
                    toast.error("User not found");
                    navigate("/admin");
                    return;
                }
                setUser(data);
            } catch (error) {
                console.error("Error loading user:", error);
                toast.error("Failed to load user");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId, navigate]);

    const handleFieldChange = (field: keyof User, value: any) => {
        setUser({ ...user, [field]: value });
    };

    const handleUpdateUser = async () => {
        try {
            if (!user.firstName?.trim()) {
                toast.error("First name is required");
                return;
            }
            if (!user.lastName?.trim()) {
                toast.error("Last name is required");
                return;
            }
            if (!user.email?.trim()) {
                toast.error("Email is required");
                return;
            }

            await userService.updateUser(userId!, user);
            toast.success("User updated successfully!");
            navigate("/admin");
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Failed to update user");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Loading user...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Header />
            <div className="max-w-4xl mx-auto py-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center w-full justify-between">
                            <CardTitle>Edit User</CardTitle>
                            <Button variant="outline" onClick={() => navigate("/admin")}>
                                Back to Users
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="details">
                            <TabsList className="mb-4">
                                <TabsTrigger value="details">User Details</TabsTrigger>
                            </TabsList>

                            <TabsContent
                                value="details"
                                className="p-6 bg-white rounded-lg shadow-sm"
                            >
                                <div className="space-y-6">
                                    {/* First Name */}
                                    <div className="space-y-2">
                                        <Label>First Name</Label>
                                        <Input
                                            placeholder="e.g. John"
                                            value={user.firstName}
                                            onChange={(e) =>
                                                handleFieldChange("firstName", e.target.value)
                                            }
                                        />
                                    </div>

                                    {/* Middle Name */}
                                    <div className="space-y-2">
                                        <Label>Middle Name</Label>
                                        <Input
                                            placeholder="e.g. A."
                                            value={user.middleName || ""}
                                            onChange={(e) =>
                                                handleFieldChange("middleName", e.target.value)
                                            }
                                        />
                                    </div>

                                    {/* Last Name */}
                                    <div className="space-y-2">
                                        <Label>Last Name</Label>
                                        <Input
                                            placeholder="e.g. Doe"
                                            value={user.lastName}
                                            onChange={(e) =>
                                                handleFieldChange("lastName", e.target.value)
                                            }
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="e.g. john.doe@example.com"
                                            value={user.email}
                                            onChange={(e) =>
                                                handleFieldChange("email", e.target.value)
                                            }
                                        />
                                    </div>

                                    {/* Role */}
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Select
                                            value={user.role}
                                            onValueChange={(val) =>
                                                handleFieldChange("role", val as UserRole)
                                            }
                                        >
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.values(USER_ROLE).map((role) => (
                                                    <SelectItem key={role} value={role}>
                                                        {role}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select
                                            value={user.status}
                                            onValueChange={(val) =>
                                                handleFieldChange("status", val as UserStatus)
                                            }
                                        >
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.values(USER_STATUS).map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Organization */}
                                    <div className="space-y-2">
                                        <Label>Organization ID</Label>
                                        <Input
                                            placeholder="e.g. org_123"
                                            value={user.organizationId || ""}
                                            onChange={(e) =>
                                                handleFieldChange("organizationId", e.target.value)
                                            }
                                        />
                                    </div>

                                    {/* Photo URL */}
                                    <div className="space-y-2">
                                        <Label>Photo URL</Label>
                                        <Input
                                            placeholder="https://example.com/photo.jpg"
                                            value={user.photoURL || ""}
                                            onChange={(e) =>
                                                handleFieldChange("photoURL", e.target.value)
                                            }
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Save button */}
                        <div className="flex justify-end mt-6">
                            <Button onClick={handleUpdateUser} className="w-full md:w-auto">
                                Update User
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EditUserPage;

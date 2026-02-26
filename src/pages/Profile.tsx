import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import Sidebar, { UserSidebarMobileToggle } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/userService";
import { Mail, User as UserIcon, Calendar, Shield, Save, X } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { User } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { logError } from "@/utils/logger";

const Profile = () => {
  const { user: authUser, refreshUser } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    photoURL: "",
  });

  useEffect(() => {
    if (authUser) {
      setUserData(authUser);
      setFormData({
        firstName: authUser.firstName || "",
        middleName: authUser.middleName || "",
        lastName: authUser.lastName || "",
        email: authUser.email || "",
        photoURL: authUser.photoURL || "",
      });
    }
  }, [authUser]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!authUser) return;

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Validation error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const updateData: Partial<User> = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
      };

      const result = await userService.updateUser(authUser.id, updateData);

      if (!result.success) {
        throw new Error(result.error.message || "Failed to update profile");
      }

      setUserData((prev) => (prev ? { ...prev, ...updateData } : null));
      setIsEditing(false);

      // Refresh user data in AuthContext
      await refreshUser();

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      logError("Profile update error:", error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || "",
        middleName: userData.middleName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        photoURL: userData.photoURL || "",
      });
    }
    setIsEditing(false);
  };

  const getInitials = () => {
    if (!formData.firstName && !formData.lastName) return "U";
    return `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-red-500";
      case "instructor":
      case "teacher":
        return "bg-blue-500";
      case "student":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!authUser) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-4">
            <LoadingSkeleton className="h-32" />
            <LoadingSkeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 w-full mx-auto p-6 overflow-y-auto no-scrollbar::-webkit-scrollbar no-scrollbar">
          <div className="flex items-center justify-between mb-4 md:hidden">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <UserSidebarMobileToggle />
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings and profile information
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Photo Card */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Profile Photo</CardTitle>
                <CardDescription>Your profile picture</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={formData.photoURL} alt={formData.firstName} />
                  <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                </Avatar>
              </CardContent>
            </Card>

            {/* Personal Information Card */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={formData.middleName}
                      onChange={(e) => handleInputChange("middleName", e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your middle name"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" value={formData.email} disabled className="pl-10 bg-muted" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Account Information Card */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>View your account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Role</p>
                      <Badge className={getRoleBadgeColor(userData?.role || "")}>
                        {userData?.role || "N/A"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Status</p>
                      <Badge variant={userData?.status === "ACTIVE" ? "default" : "secondary"}>
                        {userData?.status || "N/A"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Member Since</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(userData?.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {userData?.organizationId && (
                  <>
                    <Separator className="my-6" />
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <UserIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Organization ID</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {userData.organizationId}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

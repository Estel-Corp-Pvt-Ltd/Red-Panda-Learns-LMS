import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft } from "lucide-react";

import { Label } from "@radix-ui/react-dropdown-menu";
import { Header } from "@/components/Header";
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
      if (!userId) return;
      const response = await userService.getUserById(userId);
      if (response.success) {
        setUser(response.data);
      } else {
        toast.error("User not found");
        navigate("/admin");
      }
      setLoading(false);
    };

    fetchUser();
  }, [userId, navigate]);

  const handleFieldChange = (field: keyof User, value: any) => {
    setUser({ ...user, [field]: value });
  };

  const handleUpdateUser = async () => {
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

    const response = await userService.updateUser(userId!, user);
    if (response.success) {
      toast.success("User updated successfully!");
      navigate("/admin");
    } else {
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
    <div className="min-h-screen bg-background text-foreground">
      <Header />

        {/* Top bar: Back + Title */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin")}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>

            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
               Edit User
              </h1>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto py-8 ">
        <Card className="pt-4"> 
         

          <CardContent>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="mb-4 bg-muted/30 border border-border rounded-xl p-1">
                <TabsTrigger
                  value="details"
                  className="
                data-[state=active]:bg-background data-[state=active]:text-foreground
                rounded-lg
              "
                >
                  User Details
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="details"
                className="p-6 rounded-lg border border-border bg-card"
              >
                <div className="space-y-6">
                  {/* First Name */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      First Name
                    </Label>
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
                    <Label className="text-xs font-medium text-muted-foreground">
                      Middle Name
                    </Label>
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
                    <Label className="text-xs font-medium text-muted-foreground">
                      Last Name
                    </Label>
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
                    <Label className="text-xs font-medium text-muted-foreground">
                      Email
                    </Label>
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
                    <Label className="text-xs font-medium text-muted-foreground">
                      Role
                    </Label>
                    <Select
                      value={user.role}
                      onValueChange={(val) =>
                        handleFieldChange("role", val as UserRole)
                      }
                    >
                      <SelectTrigger className="w-[200px] h-10">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground border border-border">
                        {Object.values(USER_ROLE).map((role) => (
                          <SelectItem
                            key={role}
                            value={role}
                            className="focus:bg-accent focus:text-accent-foreground"
                          >
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={user.status}
                      onValueChange={(val) =>
                        handleFieldChange("status", val as UserStatus)
                      }
                    >
                      <SelectTrigger className="w-[200px] h-10">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground border border-border">
                        {Object.values(USER_STATUS).map((status) => (
                          <SelectItem
                            key={status}
                            value={status}
                            className="focus:bg-accent focus:text-accent-foreground"
                          >
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Organization */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Organization ID
                    </Label>
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
                    <Label className="text-xs font-medium text-muted-foreground">
                      Photo URL
                    </Label>
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

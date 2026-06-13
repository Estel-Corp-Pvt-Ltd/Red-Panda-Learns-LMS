import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { organizationService } from "@/services/organizationService";
import { userService } from "@/services/userService";
import { Organization } from "@/types/organization";
import { User } from "@/types/user";
import { Building2, Loader2, Search, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const NONE = "__NONE__";

/**
 * Admin: assign students and teachers to an organization (sets the user's
 * organizationId + class + division) and audit who belongs to each org.
 * Student↔teacher visibility is driven purely by shared organizationId.
 */
const AdminOrgMembers = () => {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Assignment form
  const [email, setEmail] = useState("");
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const [assignClass, setAssignClass] = useState<string>(NONE);
  const [assignDivision, setAssignDivision] = useState<string>(NONE);
  const [assigning, setAssigning] = useState(false);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) || null;

  useEffect(() => {
    organizationService.getAllOrganizations().then((list) => {
      setOrgs(list);
      if (list.length > 0) setSelectedOrgId(list[0].id);
    });
  }, []);

  const loadMembers = useCallback(async () => {
    if (!selectedOrgId) return;
    setLoadingMembers(true);
    try {
      const result = await userService.getUsersByOrganization(selectedOrgId, undefined, {
        limit: 500,
      });
      if (result.success && result.data) {
        setMembers(result.data.data);
      } else {
        setMembers([]);
      }
    } finally {
      setLoadingMembers(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const result = await userService.getUserByEmail(email.trim());
      if (result.success && result.data) {
        setFoundUser(result.data);
      } else {
        toast({ title: "Not found", description: "No user with that email", variant: "destructive" });
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = async () => {
    if (!foundUser || !selectedOrgId) return;
    setAssigning(true);
    try {
      const updates: Partial<User> = {
        organizationId: selectedOrgId,
        class: assignClass === NONE ? "" : assignClass,
        division: assignDivision === NONE ? "" : assignDivision,
      };
      const res = await userService.updateUser(foundUser.id, updates);
      if (res.success) {
        toast({ title: "Assigned", description: `${foundUser.email} added to ${selectedOrg?.name}` });
        setFoundUser(null);
        setEmail("");
        setAssignClass(NONE);
        setAssignDivision(NONE);
        await loadMembers();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign user",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (member: User) => {
    try {
      const res = await userService.updateUser(member.id, {
        organizationId: "",
        class: "",
        division: "",
      });
      if (res.success) {
        toast({ title: "Removed", description: `${member.email} removed from organization` });
        await loadMembers();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove user",
        variant: "destructive",
      });
    }
  };

  const teachers = members.filter((m) => m.role === "TEACHER");
  const students = members.filter((m) => m.role === "STUDENT");
  const others = members.filter((m) => m.role !== "TEACHER" && m.role !== "STUDENT");

  const MemberTable = ({ rows }: { rows: User[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Division</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
              No members
            </TableCell>
          </TableRow>
        ) : (
          rows.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "—"}</TableCell>
              <TableCell>{m.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{m.role}</Badge>
              </TableCell>
              <TableCell>{m.class || "—"}</TableCell>
              <TableCell>{m.division || "—"}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleRemove(m)}>
                  <X className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Organization Members</h1>
            <p className="text-muted-foreground">
              Assign students and teachers to an organization and review membership.
            </p>
          </div>
        </div>

        {/* Org selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Assign a user */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" /> Assign a user
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">User email</span>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-72"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button variant="outline" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-1">Find</span>
              </Button>
            </div>

            {foundUser && (
              <div className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {`${foundUser.firstName ?? ""} ${foundUser.lastName ?? ""}`.trim() || foundUser.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {foundUser.email} · <Badge variant="secondary">{foundUser.role}</Badge>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Class</span>
                    <Select value={assignClass} onValueChange={setAssignClass}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {(selectedOrg?.classes || []).map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Division</span>
                    <Select value={assignDivision} onValueChange={setAssignDivision}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {(selectedOrg?.divisions || []).map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssign} disabled={assigning}>
                    {assigning && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Assign to {selectedOrg?.name ?? "org"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membership audit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Members {selectedOrg ? `· ${selectedOrg.name}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Teachers ({teachers.length})</h3>
                  <MemberTable rows={teachers} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Students ({students.length})</h3>
                  <MemberTable rows={students} />
                </div>
                {others.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Other ({others.length})</h3>
                    <MemberTable rows={others} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminOrgMembers;

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import { organizationService } from '@/services/organizationService';
import { Organization } from '@/types/organization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building
} from 'lucide-react';
import { OrganizationType } from '@/types/general';
import { ORGANIZATION } from '@/constants';
import ConfirmDialog from '@/components/ConfirmDialog';

interface PaginatedOrganizations {
  data: Organization[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

const AdminOrganizations: React.FC = () => {
  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Manage all organizations.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationTab />
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

const OrganizationTab = () => {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<PaginatedOrganizations>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  const [name, setName] = useState("");
  const [type, setType] = useState<OrganizationType>(ORGANIZATION.INDUSTRY);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadOrganizations = async (options = {}) => {
    setIsLoading(true);
    try {
      const result = await organizationService.getOrganizations([], {
        limit: 10,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setOrganizations(prev => ({
          ...result.data,
          totalCount: result.data.data.length
        }));
      } else {
        toast({
          title: "Error",
          description: "Failed to load organizations",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!organizations.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: organizations.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await loadOrganizations({
      cursor: organizations.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!organizations.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: organizations.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await loadOrganizations({
      cursor: organizations.previousCursor,
      pageDirection: 'previous'
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Validation",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingOrgId) {
        await organizationService.updateOrganization(editingOrgId, {
          name,
          type,
        });
        toast({
          title: "Updated",
          description: "Organization updated successfully.",
        });
      } else {
        await organizationService.createOrganization({ name, type });
        toast({
          title: "Created",
          description: "Organization created successfully.",
        });
      }

      setName("");
      setType(ORGANIZATION.INDUSTRY);
      setIsEditing(false);
      setEditingOrgId(null);
      await loadOrganizations();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save organization",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedOrg) return;
    const result = await organizationService.deleteOrganization(selectedOrg.id);
    if (!result.success) {
      toast({
        title: "Error",
        description: "Failed to delete organization.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Deleted", description: "Organization deleted successfully." });
    await loadOrganizations();
  }

  const getBadgeVariant = (orgType: OrganizationType) => {
    switch (orgType) {
      case ORGANIZATION.SCHOOL:
        return "default";
      case ORGANIZATION.INDUSTRY:
        return "secondary";
      case ORGANIZATION.COLLEGE:
        return "outline";
      default:
        return "secondary";
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  return (
    <div className="space-y-6">
      {/* Add / Edit form */}
      <form
        onSubmit={handleSubmit}
        className="
          grid grid-cols-1
          sm:grid-cols-[1fr_1fr_auto]
          items-end
          gap-4
          p-4
          border rounded-lg
          bg-muted/50
        "
      >
        {/* Organization Name */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Organization Name
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter organization name"
            className="w-full"
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Type
          </label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as OrganizationType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ORGANIZATION).map((val) => (
                <SelectItem key={val} value={val}>
                  {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2">
          <Button
            type="submit"
            disabled={saving}
            className="whitespace-nowrap"
             variant="pill"
                  size="sm"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? "Update" : "Add Organization"}
          </Button>

          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditingOrgId(null);
                setName("");
                setType(ORGANIZATION.INDUSTRY);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Organizations List */}
      {isLoading && organizations.data.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : organizations.data.length === 0 ? (
        <div className="text-center py-8">
          <Building className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">
            No organizations
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating your first organization.
          </p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.data.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(org.type)}>
                        {org.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditing(true);
                            setEditingOrgId(org.id);
                            setName(org.name);
                            setType(org.type);
                          }}
                          title="Edit organization"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrg(org);
                            setConfirmOpen(true);
                          }}
                          title="Delete organization"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {organizations.data.length} organizations
              {organizations.totalCount > organizations.data.length &&
                ` (page ${paginationState.currentPage})`
              }
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={!organizations.hasPreviousPage || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!organizations.hasNextPage || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          handleDelete();
          setConfirmOpen(false);
        }}
        title="Delete"
        body="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dismissible
      />
    </div>
  );
};

export default AdminOrganizations;

import { useEffect, useState } from "react";
import { Plus, Loader2, Save, Trophy, MoreHorizontal, Pencil, Trash } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { karmaRuleService } from "@/services/karmaService/karmaRuleService";
import { authService } from "@/services/authService";
import { KARMA_ACTIONS_BY_CATEGORY, KARMA_CATEGORY } from "@/constants";
import { cn } from "@/lib/utils";

// --- Types ---
interface KarmaRule {
  id?: string | null;
  category: string;
  action: string;
  points: number;
  enabled: boolean;
}

const EMPTY_RULE: KarmaRule = {
  id: null,
  category: "",
  action: "",
  points: 0,
  enabled: true,
};

export default function AdminKarmaRulesPage() {
  const [rules, setRules] = useState<KarmaRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<KarmaRule>(EMPTY_RULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await karmaRuleService.getAllKarmaRules();
      setRules(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load karma rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (rule: KarmaRule = EMPTY_RULE) => {
    setSelectedRule(rule);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedRule.category || !selectedRule.action || typeof selectedRule.points !== "number") {
      toast({
        title: "Validation Error",
        description: "Category, action and points are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const idToken = await authService.getToken();
      if (!idToken) throw new Error("Not authenticated");

      const result = await karmaRuleService.addOrUpdateKarmaRule(
        {
          id: selectedRule.id,
          category: selectedRule.category,
          action: selectedRule.action,
          points: selectedRule.points,
          enabled: selectedRule.enabled,
        },
        idToken
      );

      if (result.success) {
        toast({
          title: "Success",
          description: selectedRule.id ? "Rule updated successfully" : "Rule created successfully",
        });
        setSelectedRule(EMPTY_RULE);
        setIsDialogOpen(false);
        await loadRules();
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Failed to save rule",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper for nice badge colors
  const getCategoryBadgeVariant = (cat: string) => {
    if (cat === "SOCIAL") return "default"; // or custom colors
    if (cat === "CONTENT") return "secondary";
    if (cat === "REFERRAL") return "outline";
    return "secondary";
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Karma Rules</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define how users earn points and build reputation.
            </p>
          </div>
          <Button onClick={() => openEditor()} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ">
          {rules.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted-background">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No rules configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first karma rule.
              </p>
              <Button variant="outline" onClick={() => openEditor()}>
                Create Rule
              </Button>
            </div>
          ) : (
            rules.map((rule) => (
              <Card
                key={rule.id}
                className={cn(
                  "group relative transition-all duration-200 hover:shadow-md cursor-pointer border-border/60",
                  !rule.enabled && "opacity-75 bg-muted/30"
                )}
                onClick={() => openEditor(rule)}
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <Badge
                    variant={getCategoryBadgeVariant(rule.category) as any}
                    className="font-medium"
                  >
                    {rule.category}
                  </Badge>
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      rule.enabled ? "bg-background" : "bg-muted-foreground/30"
                    )}
                  />
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold tracking-tight">
                      {rule.points > 0 ? "+" : ""}
                      {rule.points}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium uppercase">pts</span>
                  </div>
                  <h3 className="font-medium leading-none text-foreground/90 truncate">
                    {rule.action.replace(/_/g, " ")}
                  </h3>
                </CardContent>

                <CardFooter className="pt-2 pb-4 text-xs text-muted-foreground">
                  <span className="group-hover:text-primary transition-colors flex items-center gap-1">
                    Edit Configuration{" "}
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        {/* Modern Dialog Editor */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedRule.id ? "Edit Rule" : "Create New Rule"}</DialogTitle>
              <DialogDescription>Configure the trigger action and point value.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={selectedRule.category}
                  onValueChange={(value) =>
                    setSelectedRule((prev) => ({ ...prev, category: value, action: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(KARMA_CATEGORY).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Action Trigger</Label>
                <Select
                  value={selectedRule.action}
                  onValueChange={(value) => setSelectedRule((prev) => ({ ...prev, action: value }))}
                  disabled={!selectedRule.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRule.category &&
                      Object.values(
                        KARMA_ACTIONS_BY_CATEGORY[
                          selectedRule.category as keyof typeof KARMA_ACTIONS_BY_CATEGORY
                        ] || []
                      ).map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Points Awarded</Label>
                  <Input
                    type="number"
                    value={selectedRule.points}
                    onChange={(e) =>
                      setSelectedRule((prev) => ({ ...prev, points: Number(e.target.value) }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>
                  <div className="flex items-center justify-between border rounded-md px-3 h-10">
                    <span className="text-sm text-muted-foreground">Enabled</span>
                    <Switch
                      checked={selectedRule.enabled}
                      onCheckedChange={(checked) =>
                        setSelectedRule((prev) => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !selectedRule.category || !selectedRule.action}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

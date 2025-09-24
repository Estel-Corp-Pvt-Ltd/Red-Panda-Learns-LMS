// src/components/admin/CohortImporterModel.tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cohort } from "@/types/course";
import { cohortService } from "@/services/cohortService";
import { useToast } from "@/hooks/use-toast";

interface CohortImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cohorts: Cohort[]) => void;
  /** IDs of cohorts that are already part of the course – they will be hidden/disabled */
  excludedCohortIds?: string[];
}

const CohortImporterModal = ({
  isOpen,
  onClose,
  onConfirm,
  excludedCohortIds = [],
}: CohortImporterModalProps) => {
  const [search, setSearch] = useState("");
  const [allCohorts, setAllCohorts] = useState<Cohort[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Load all cohorts when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetch = async () => {
      try {
        const data = await cohortService.getAllCohorts();
        setAllCohorts(data);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load cohorts.",
          variant: "destructive",
        });
      }
    };
    fetch();
  }, [isOpen, toast]);

  // Filtered list (search + exclude already‑added)
  const filtered = allCohorts
    .filter(
      (c) =>
        !excludedCohortIds.includes(c.id) &&
        c.title.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.title.localeCompare(b.title));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleConfirm = () => {
    const chosen = allCohorts.filter((c) => selected.has(c.id));
    if (chosen.length === 0) {
      toast({
        title: "No Cohort Selected",
        description: "Please select at least one cohort to import.",
        variant: "destructive",
      });
      return;
    }
    onConfirm(chosen);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Cohorts</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose one or more cohorts to import into this course. All topics
            (and their lessons) belonging to the selected cohorts will be added.
          </p>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Search cohorts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              {search ? "No matching cohorts." : "No cohorts available to import."}
            </p>
          ) : (
            <div className="space-y-2">
              {/* Select‑All row */}
              <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer">
                <Checkbox
                  id="select-all"
                  checked={selected.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="font-medium cursor-pointer">
                  Select All ({filtered.length})
                </label>
              </div>

              {filtered.map((cohort) => (
                <div
                  key={cohort.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggleSelect(cohort.id)}
                >
                  <Checkbox
                    id={`cohort-${cohort.id}`}
                    checked={selected.has(cohort.id)}
                    onCheckedChange={() => toggleSelect(cohort.id)}
                  />
                  <label htmlFor={`cohort-${cohort.id}`} className="flex-1 cursor-pointer">
                    <span className="font-medium">{cohort.title}</span>
                    {cohort.description && (
                      <p className="text-xs text-muted-foreground">
                        {cohort.description.slice(0, 60)}...
                      </p>
                    )}
                  </label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Import Selected ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CohortImporterModal;
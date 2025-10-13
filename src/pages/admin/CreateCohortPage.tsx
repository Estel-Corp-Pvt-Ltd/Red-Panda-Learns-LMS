// CohortBuilderPage.tsx
import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cohortService } from "@/services/cohortService";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Cohort } from "@/types/course";
import { useNavigate

 } from "react-router-dom";
type CohortBuilderPageProps = {
  onCohortCreated?: (cohort: Cohort) => void;
};

const CohortBuilderPage = ({ onCohortCreated }: CohortBuilderPageProps) => {
  const { toast } = useToast();
 const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice(0);
  };

  const saveCohort = async () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Cohort title is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const cohortData =  {
        title: title.trim(),
        description: description.trim(),
        price,
        topics: [],
      };

      // create the cohort in Firestore
      const newId = await cohortService.createCohort(cohortData);

      const fullCohort: Cohort = {
        id: newId,
        title: title.trim(),
        description: description.trim(),
        price,
        topics: [],
      };

      toast({
        title: "Success",
        description: "Cohort created successfully!",
      });

      // If parent listening, use callback instead of navigating
      if (onCohortCreated) {
        onCohortCreated(fullCohort);
      } else {
        // fallback: navigate to cohort page (original behavior)
       navigate(`/admin/cohort/${newId}`);
      }

      resetForm();
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          Create Cohort
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Cohort</DialogTitle>
          <DialogDescription>
            Enter the basic details for your new cohort.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="e.g., Spring 2024 Evening Batch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="A brief description of this cohort."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <Input
              type="number"
              placeholder="Enter price"
              value={price}
              onChange={(e) => setPrice(+e.target.value)}
              min="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { resetForm(); setIsOpen(false); }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={saveCohort} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Creating..." : "Create Cohort"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CohortBuilderPage;
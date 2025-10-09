import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const CohortBuilderPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

      const cohortData = {
        title: title.trim(),
        description: description.trim(),
        price: price,
        topics: [],
      };

      const newId = await cohortService.createCohort(cohortData);
      toast({
        title: "Success",
        description: "Cohort created successfully!",
      });
      
      resetForm();
      setIsOpen(false);
      navigate(`/admin/cohort/${newId}`);
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
        <Button size="lg" className="w-full sm:w-auto">
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
              step="0.01"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              setIsOpen(false);
            }}
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
// components/admin/TopicSelectorModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Course, Topic } from "@/types/course";

interface TopicSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (topics: { id: string; title: string }[]) => void;
  course: Course | null;
  selectedTopicIds: string[];
}

export const TopicSelectorModal = ({
  isOpen,
  onClose,
  onConfirm,
  course,
  selectedTopicIds,
}: TopicSelectorModalProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Clear selection when modal closes or course changes
  useEffect(() => {
    if (!isOpen) {
      setSelected([]);
    }
  }, [isOpen]);

  if (!course) {
    return null;
  }

  const filteredTopics = course.topics
    .filter(topic => !selectedTopicIds.includes(topic.id))
    .filter(topic => 
      topic.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const toggleTopic = (topicId: string) => {
    setSelected(prev => 
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleConfirm = () => {
    const selectedTopics = filteredTopics
      .filter(topic => selected.includes(topic.id))
      .map(topic => ({ id: topic.id, title: topic.title }));
    
    onConfirm(selectedTopics);
    setSelected([]);
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Topics from {course.title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Input
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredTopics.map((topic) => (
                <div key={topic.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`topic-${topic.id}`}
                    checked={selected.includes(topic.id)}
                    onCheckedChange={() => toggleTopic(topic.id)}
                  />
                  <label
                    htmlFor={`topic-${topic.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {topic.title}
                  </label>
                </div>
              ))}
              
              {filteredTopics.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm 
                    ? "No topics match your search" 
                    : "No available topics to add"}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selected.length === 0}
          >
            Add Selected ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
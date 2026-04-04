import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Search, Plus } from "lucide-react";
import { Lesson } from "@/types/lesson";
import { lessonService } from "@/services/lessonService";
import { useToast } from "@/hooks/use-toast";
import { CreateLessonModal } from "../lesson/AddLesson";

interface LessonSelectModalProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedLessons: Lesson[]) => void;
  excludedLessonIds: string[];
}

export const LessonSelectorModal = ({
  isOpen,
  onClose,
  onConfirm,
  excludedLessonIds,
  courseId,
}: LessonSelectModalProps) => {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filteredLessons, setFilteredLessons] = useState<Lesson[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);

  // Fetch lessons on modal open
  useEffect(() => {
    const fetchLessons = async () => {
      if (!isOpen) return;

      setLoading(true);
      try {
        const data = await lessonService.getAllLessons();

        // Filter out excluded lessons immediately
        const availableLessons = data.filter(
          (lesson) => !excludedLessonIds.includes(lesson.id)
        );

        setLessons(availableLessons);
        setFilteredLessons(availableLessons);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch lessons.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [isOpen, excludedLessonIds, toast]);

  // Filter lessons by title
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLessons(lessons);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      setFilteredLessons(
        lessons.filter((lesson) =>
          lesson.title?.toLowerCase().includes(lowerSearch)
        )
      );
    }
  }, [searchTerm, lessons]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const selectedLessons = lessons.filter((l) => selectedIds.includes(l.id));
    onConfirm(selectedLessons);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Select Lessons</DialogTitle>
          </DialogHeader>

          {/* Search filter */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lessons by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => setIsCreateLessonOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Lesson
            </Button>
          </div>

          {/* Lessons grid */}
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLessons.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No lessons found.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredLessons.map((lesson) => {
                const isSelected = selectedIds.includes(lesson.id);
                const isExcluded = excludedLessonIds?.includes(lesson.id); // from props

                return (
                  <Card
                    key={lesson.id}
                    onClick={() => !isExcluded && toggleSelect(lesson.id)}
                    className={`cursor-pointer border-2 transition ${isSelected
                      ? "border-primary"
                      : "border-transparent hover:border-muted"
                      }`}
                  >
                    <CardHeader className="flex items-center gap-2 pb-2">
                      <Checkbox
                        checked={isSelected}
                        disabled={isExcluded}
                        onCheckedChange={() =>
                          !isExcluded && toggleSelect(lesson.id)
                        }
                      />
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        {lesson.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {lesson.description || "No description"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
              Add Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <CreateLessonModal
        courseId={courseId}
        isOpen={isCreateLessonOpen}
        onClose={() => setIsCreateLessonOpen(false)}
        onLessonCreated={(lesson) => {
          onConfirm([lesson]);
          onClose();
        }}
      />
    </>
  );
};

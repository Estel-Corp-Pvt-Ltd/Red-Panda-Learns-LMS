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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  BookOpen,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";
import { Lesson } from "@/types/lesson";
import { lessonService } from "@/services/lessonService";
import { useToast } from "@/hooks/use-toast";
import { CreateLessonModal } from "../lesson/AddLesson";
import { Duration } from "@/types/general";
import { WhereFilterOp } from "firebase/firestore";

interface LessonImportModalProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedLessons: Lesson[]) => void;
}

interface PaginatedLessons {
  data: Lesson[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: any;
  previousCursor?: any;
  totalCount: number;
}

export const LessonImportModal = ({
  courseId,
  isOpen,
  onClose,
  onConfirm,
}: LessonImportModalProps) => {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<PaginatedLessons>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });
  const [filteredLessons, setFilteredLessons] = useState<Lesson[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [paginationState, setPaginationState] = useState({
    cursor: null as any,
    pageDirection: 'next' as 'next' | 'previous',
    currentPage: 1
  });

  // Fetch lessons with pagination
  const fetchLessons = async (options = {}) => {
    if (!isOpen) return;

    setLoading(true);
    try {
      // Create filters: search by title and exclude current course lessons
      const filters = [];

      if (searchTerm.trim()) {
        filters.push({
          field: 'title' as keyof Lesson,
          op: '>=' as WhereFilterOp,
          value: searchTerm
        });
      }

      // Exclude lessons that already belong to this course
      filters.push({
        field: 'courseId' as keyof Lesson,
        op: '!=' as WhereFilterOp,
        value: courseId
      });

      const result = await lessonService.getLessons(filters, {
        limit: 12,
        orderBy: { field: 'createdAt', direction: 'desc' },
        ...options
      });

      if (result.success) {
        setLessons(prev => ({
          ...prev,
          data: result.data.data
        }));
        setFilteredLessons(result.data.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch lessons.",
          variant: "destructive",
        });
      }
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

  const handleNextPage = async () => {
    if (!lessons.hasNextPage) return;

    setPaginationState(prev => ({
      cursor: lessons.nextCursor,
      pageDirection: 'next',
      currentPage: prev.currentPage + 1
    }));

    await fetchLessons({
      cursor: lessons.nextCursor,
      pageDirection: 'next'
    });
  };

  const handlePreviousPage = async () => {
    if (!lessons.hasPreviousPage) return;

    setPaginationState(prev => ({
      cursor: lessons.previousCursor,
      pageDirection: 'previous',
      currentPage: prev.currentPage - 1
    }));

    await fetchLessons({
      cursor: lessons.previousCursor,
      pageDirection: 'previous'
    });
  };

  // Filter lessons by title (client-side for better UX)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLessons(lessons.data);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      setFilteredLessons(
        lessons.data.filter((lesson) =>
          lesson.title?.toLowerCase().includes(lowerSearch)
        )
      );
    }
  }, [searchTerm, lessons.data]);

  // Reset and fetch lessons when modal opens or search term changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setSearchTerm("");
      setPaginationState({
        cursor: null,
        pageDirection: 'next',
        currentPage: 1
      });
      fetchLessons();
    }
  }, [isOpen, searchTerm]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const selectedLessons = lessons.data.filter((l) => selectedIds.includes(l.id));
    onConfirm(selectedLessons);
    onClose();
  };

  const formatDuration = (duration: Duration) => {
    const parts = [];
    if (duration.hours > 0) parts.push(`${duration.hours}h`);
    if (duration.minutes > 0) parts.push(`${duration.minutes}m`);
    return parts.join(' ') || '0m';
  };

  const getLessonTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'VIDEO_LECTURE':
        return "default";
      case 'SLIDE_DECK':
        return "secondary";
      case 'INTERACTIVE_PROJECT':
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-between">
              <span>Import Lessons</span>
              {lessons.totalCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  Page {paginationState.currentPage}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Search and controls */}
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
              <Plus className="mr-2 h-4 w-4" /> New Lesson
            </Button>
          </div>

          {/* Lessons grid */}
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No lessons match your search." : "No lessons available to import."}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setIsCreateLessonOpen(true)}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create First Lesson
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredLessons.map((lesson) => {
                  const isSelected = selectedIds.includes(lesson.id);

                  return (
                    <Card
                      key={lesson.id}
                      onClick={() => toggleSelect(lesson.id)}
                      className={`cursor-pointer border-2 transition-all ${isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-muted hover:bg-muted/5"
                        }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(lesson.id)}
                            className="mt-1"
                          />
                          <Badge
                            variant={getLessonTypeBadgeVariant(lesson.type)}
                            className="text-xs"
                          >
                            {lesson.type}
                          </Badge>
                        </div>
                        <CardTitle className="text-base flex items-center gap-2 mt-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="line-clamp-2">{lesson.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {lesson.description || "No description available"}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(lesson.duration)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {lessons.data.length > 0 && (
                <div className="flex items-center justify-between space-x-2 pt-4 border-t">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {filteredLessons.length} of {lessons.totalCount} lessons
                    {searchTerm && ` (filtered from ${lessons.data.length})`}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={!lessons.hasPreviousPage || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!lessons.hasNextPage || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Selection summary and action buttons */}
          <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedIds.length > 0 ? (
                <span>{selectedIds.length} lesson{selectedIds.length !== 1 ? 's' : ''} selected</span>
              ) : (
                <span>No lessons selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
                Import Selected ({selectedIds.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Lesson Modal */}
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

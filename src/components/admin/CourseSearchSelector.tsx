import React, { useState } from "react";
import { Check, ChevronsUpDown, BookOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Course } from "@/types/course";

interface CourseSearchSelectorProps {
  courses: Course[];
  selectedCourseId: string;
  onCourseSelect: (courseId: string) => void;
  onClearSelection?: () => void;
  isLoading?: boolean;
  label?: string;
  placeholder?: string;
  showClearButton?: boolean;
  className?: string;
}

const CourseSearchSelector: React.FC<CourseSearchSelectorProps> = ({
  courses,
  selectedCourseId,
  onCourseSelect,
  onClearSelection,
  isLoading = false,
  label = "Active Course",
  placeholder = "Select a course...",
  showClearButton = true,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const handleSelect = (courseId: string) => {
    onCourseSelect(courseId);
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearSelection?.();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
        className="w-full justify-between h-11 bg-background px-3 shadow-sm hover:bg-accent    text-left"
      >
        <div className="flex items-center gap-2 overflow-hidden w-full ">
          <BookOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="truncate flex-1">
            {selectedCourse ? (
              selectedCourse.title
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            Search
          </kbd>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </Button>

      {/* Centered Spotlight Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 gap-0 max-w-2xl outline-none overflow-hidden shadow-2xl bg-transparent border-none">
          <div className="bg-background border rounded-lg overflow-hidden shadow-xl">
            <Command className="w-full h-full max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="border-b px-4 py-3 flex items-center gap-2 bg-muted/20">
                <Search className="h-5 w-5 text-muted-foreground" />
                <CommandInput
                  placeholder="Type to search courses..."
                  className="border-none focus:ring-0 text-base h-9 bg-transparent"
                />
                <div className="ml-64  text-xs text-muted-foreground border px-2 py-0.5 rounded bg-background ">
                  ESC to close
                </div>
              </div>

              <CommandList className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <CommandEmpty className="py-12 text-center text-sm text-muted-foreground">
                  No courses found.
                </CommandEmpty>

                <CommandGroup heading="Available Courses" className="px-2 pb-2">
                  {courses.map((course) => (
                    <CommandItem
                      key={course.id}
                      value={course.title}
                      onSelect={() => handleSelect(course.id)}
                      className="aria-selected:bg-accent aria-selected:text-accent-foreground my-1 rounded-md px-4 py-3 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                              selectedCourseId === course.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground"
                            )}
                          >
                            {selectedCourseId === course.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <BookOpen className="h-4 w-4" />
                            )}
                          </div>

                          <div className="flex flex-col overflow-hidden">
                            <span className="font-medium truncate text-sm sm:text-base">
                              {course.title}
                            </span>
                            <span className="text-xs  text-muted-foreground dark:text-slate-50 round truncate font-mono">
                              ID: {course.id}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant={
                            course.status === "PUBLISHED"
                              ? "default"
                              : "secondary"
                          }
                          className="shrink-0"
                        >
                          {course.status}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear selection */}
      {showClearButton && selectedCourseId && onClearSelection && (
        <div className="flex justify-end mt-1">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleClear}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
          >
            Clear selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default CourseSearchSelector;

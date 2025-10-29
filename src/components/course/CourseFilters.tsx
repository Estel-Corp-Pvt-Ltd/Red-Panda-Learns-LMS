import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  CourseFilters as CourseFiltersType,
  DURATION_OPTIONS,
  ENROLLMENT_STATUS_OPTIONS,
  PRICE_RANGE_OPTIONS,
} from "@/types/course-filters";
import { ChevronDown, Filter, X } from "lucide-react";

interface CourseFiltersProps {
  filters: CourseFiltersType;
  uniqueInstructors: string[];
  onUpdateFilter: <K extends keyof CourseFiltersType>(key: K, value: CourseFiltersType[K]) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  showEnrollmentStatus?: boolean; // Only show when logged in
}

const CourseFilters = ({
  filters,
  uniqueInstructors,
  onUpdateFilter,
  onClearFilters,
  activeFilterCount,
  showEnrollmentStatus = false,
}: CourseFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // If enrollment status is hidden (logged out), ensure it doesn't linger in state
  useEffect(() => {
    if (!showEnrollmentStatus && filters.enrollmentStatus !== "all") {
      onUpdateFilter("enrollmentStatus", "all");
    }
  }, [showEnrollmentStatus, filters.enrollmentStatus, onUpdateFilter]);

  const handleInstructorToggle = (instructor: string) => {
    const newInstructors = filters.instructors.includes(instructor)
      ? filters.instructors.filter((i) => i !== instructor)
      : [...filters.instructors, instructor];
    onUpdateFilter("instructors", newInstructors);
  };

  const removeActiveFilter = (filterKey: keyof CourseFiltersType) => {
    switch (filterKey) {
      case "searchTerm":
        onUpdateFilter("searchTerm", "");
        break;
      case "priceRange":
        onUpdateFilter("priceRange", "all");
        break;
      case "instructors":
        onUpdateFilter("instructors", []);
        break;
      case "enrollmentStatus":
        onUpdateFilter("enrollmentStatus", "all");
        break;
      case "duration":
        onUpdateFilter("duration", "all");
        break;
    }
  };

  const getFilterLabel = (filterKey: keyof CourseFiltersType) => {
    switch (filterKey) {
      case "searchTerm":
        return `Search: "${filters.searchTerm}"`;
      case "priceRange":
        return PRICE_RANGE_OPTIONS.find((opt) => opt.value === filters.priceRange)?.label || "";
      case "instructors":
        return `Instructors: ${filters.instructors.length}`;
      case "enrollmentStatus":
        return ENROLLMENT_STATUS_OPTIONS.find((opt) => opt.value === filters.enrollmentStatus)?.label || "";
      case "duration":
        return DURATION_OPTIONS.find((opt) => opt.value === filters.duration)?.label || "";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search courses, instructors, content..."
            value={filters.searchTerm}
            onChange={(e) => onUpdateFilter("searchTerm", e.target.value)}
            className="w-full"
          />
        </div>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="whitespace-nowrap">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 space-y-4">
              {/* Price Range */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Price Range</Label>
                <RadioGroup
                  value={filters.priceRange}
                  onValueChange={(value) => onUpdateFilter("priceRange", value as any)}
                >
                  {PRICE_RANGE_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`price-${option.value}`} />
                      <Label htmlFor={`price-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* Enrollment Status (only if allowed) */}
              {showEnrollmentStatus && (
                <>
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Enrollment Status</Label>
                    <RadioGroup
                      value={filters.enrollmentStatus}
                      onValueChange={(value) => onUpdateFilter("enrollmentStatus", value as any)}
                    >
                      {ENROLLMENT_STATUS_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`enrollment-${option.value}`} />
                          <Label htmlFor={`enrollment-${option.value}`} className="text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Separator />
                </>
              )}

              {/* Course Duration */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Course Duration</Label>
                <RadioGroup
                  value={filters.duration}
                  onValueChange={(value) => onUpdateFilter("duration", value as any)}
                >
                  {DURATION_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`duration-${option.value}`} />
                      <Label htmlFor={`duration-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* Instructors */}
              {uniqueInstructors.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">Instructors</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uniqueInstructors.map((instructor) => (
                      <div key={instructor} className="flex items-center space-x-2">
                        <Checkbox
                          id={`instructor-${instructor}`}
                          checked={filters.instructors.includes(instructor)}
                          onCheckedChange={() => handleInstructorToggle(instructor)}
                        />
                        <Label htmlFor={`instructor-${instructor}`} className="text-sm">
                          {instructor}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeFilterCount > 0 && (
                <>
                  <Separator />
                  <Button variant="outline" size="sm" onClick={onClearFilters} className="w-full">
                    Clear All Filters
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.searchTerm && (
            <Badge variant="secondary" className="gap-1">
              {getFilterLabel("searchTerm")}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeActiveFilter("searchTerm")}
              />
            </Badge>
          )}
          {filters.priceRange !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {getFilterLabel("priceRange")}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeActiveFilter("priceRange")}
              />
            </Badge>
          )}
          {filters.instructors.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              {getFilterLabel("instructors")}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeActiveFilter("instructors")}
              />
            </Badge>
          )}
          {showEnrollmentStatus && filters.enrollmentStatus !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {getFilterLabel("enrollmentStatus")}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeActiveFilter("enrollmentStatus")}
              />
            </Badge>
          )}
          {filters.duration !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {getFilterLabel("duration")}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeActiveFilter("duration")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseFilters;
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { organizationService } from "@/services/organizationService";
import { Organization } from "@/types/organization";
import { User } from "@/types/user";

interface ClassDivisionFilterProps {
  organizationId: string;
  onFilterChange: (
    selectedClass: string | null,
    selectedDivision: string | null
  ) => void;
  compact?: boolean;
  students?: User[];
}

export const ClassDivisionFilter: React.FC<ClassDivisionFilterProps> = ({
  organizationId,
  onFilterChange,
  compact = false,
  students,
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganization = async () => {
      setLoading(true);
      try {
        const org = await organizationService.getOrganizationById(
          organizationId
        );
        setOrganization(org);
      } catch (error) {
        console.error("Failed to fetch organization:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [organizationId]);

  const stableOnFilterChange = useCallback(onFilterChange, []);

  useEffect(() => {
    stableOnFilterChange(selectedClass, selectedDivision);
  }, [selectedClass, selectedDivision, stableOnFilterChange]);

  const handleClearFilters = () => {
    setSelectedClass(null);
    setSelectedDivision(null);
  };

  // Derive available classes/divisions from org config + student data
  const availableClasses = useMemo(() => {
    const orgClasses = organization?.classes || [];
    const studentClasses = students
      ? [...new Set(students.map((s) => s.class).filter((c): c is string => !!c))]
      : [];
    const merged = [...new Set([...orgClasses, ...studentClasses])];
    return merged.sort();
  }, [organization, students]);

  const availableDivisions = useMemo(() => {
    const orgDivisions = organization?.divisions || [];
    const studentDivisions = students
      ? [...new Set(students.map((s) => s.division).filter((d): d is string => !!d))]
      : [];
    const merged = [...new Set([...orgDivisions, ...studentDivisions])];
    return merged.sort();
  }, [organization, students]);

  if (loading) return null;

  const hasClasses = availableClasses.length > 0;
  const hasDivisions = availableDivisions.length > 0;

  if (!hasClasses && !hasDivisions) return null;

  const hasActiveFilters =
    selectedClass !== null || selectedDivision !== null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {hasClasses && (
          <Select
            value={selectedClass || "all"}
            onValueChange={(value) =>
              setSelectedClass(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {availableClasses.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasDivisions && (
          <Select
            value={selectedDivision || "all"}
            onValueChange={(value) =>
              setSelectedDivision(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {availableDivisions.map((div) => (
                <SelectItem key={div} value={div}>
                  {div}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-card flex-wrap">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
        <Filter className="h-4 w-4" />
        <span>Filter</span>
      </div>

      {hasClasses && (
        <Select
          value={selectedClass || "all"}
          onValueChange={(value) =>
            setSelectedClass(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {availableClasses.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasDivisions && (
        <Select
          value={selectedDivision || "all"}
          onValueChange={(value) =>
            setSelectedDivision(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Divisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {availableDivisions.map((div) => (
              <SelectItem key={div} value={div}>
                {div}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <>
          <div className="flex items-center gap-1.5 ml-2">
            {selectedClass && (
              <Badge variant="secondary" className="text-xs">
                {selectedClass}
              </Badge>
            )}
            {selectedDivision && (
              <Badge variant="secondary" className="text-xs">
                Div {selectedDivision}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 px-2 ml-auto"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </>
      )}
    </div>
  );
};

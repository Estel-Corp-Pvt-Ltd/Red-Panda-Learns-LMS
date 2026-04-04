import { instructorService } from '@/services/instructorService';
import { Course } from '@/types/course';
import { CourseFilters } from '@/types/course-filters';
import { compareDates, parseDuration } from '@/utils/date-time';
import { useEffect, useMemo, useState } from 'react';
import { toast } from './use-toast';
import { getFullName } from '@/utils/name';

export function useCourseFilters(courses: Course[] = [], enrolledCourseIds: string[]) {
  const [filters, setFilters] = useState<CourseFilters>({
    searchTerm: '',
    priceRange: 'all',
    instructors: [],
    enrollmentStatus: 'all',
    duration: 'all',
    sortBy: 'recent',
  });

  // TODO: Should have only the required amount of data
  const [uniqueInstructors, setUniqueInstructors] = useState<string[]>([]);

  useEffect(() => {
    const fetchInstructors = async () => {
      const result = await instructorService.getAllInstructors();

      if (result.success) {
        setUniqueInstructors(result.data.map(instructor => getFullName(instructor.firstName, instructor.middleName, instructor.lastName)));
      } else {
        toast({
          title: "Failed to fetch instructors!",
          variant: "destructive"
        });
      }
    };

    fetchInstructors();
  }, []);

  const filteredCourses = useMemo(() => {
    let filtered = courses;

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered?.filter(course =>
        course.title?.toLowerCase().includes(searchLower) ||
        course.description?.toLowerCase().includes(searchLower) ||
        course.instructorName?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(course => {
        const price = course.regularPrice || 0;
        switch (filters.priceRange) {
          case 'free':
            return price === 0;
          case 'under-1000':
            return price > 0 && price < 1000;
          case '1000-5000':
            return price >= 1000 && price <= 5000;
          case 'above-5000':
            return price > 5000;
          default:
            return true;
        }
      });
    }

    if (filters.instructors.length > 0) {
      filtered = filtered.filter(course =>
        filters.instructors.includes(course.instructorName)
      );
    }

    if (filters.enrollmentStatus !== 'all') {
      filtered = filtered.filter(course => {
        switch (filters.enrollmentStatus) {
          case 'enrolled':
            return enrolledCourseIds.includes(course.id);
          case 'not-enrolled':
            return !enrolledCourseIds.includes(course.id);
          default:
            return true;
        }
      });
    }

    if (filters.duration !== 'all') {
      filtered = filtered.filter(course => {
        const hours = course.duration.hours;

        if (!hours)
          return true;

        switch (filters.duration) {
          case 'short':
            return hours < 2;
          case 'medium':
            return hours >= 2 && hours <= 8;
          case 'long':
            return hours > 8;
          default:
            return true;
        }
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-low':
          return (a.salePrice || 0) - (b.salePrice || 0);
        case 'price-high':
          return (b.salePrice || 0) - (a.salePrice || 0);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'recent':
        default:
          return compareDates(b.createdAt, a.createdAt);
      }
    });

    return sorted;
  }, [courses, filters]);

  const updateFilter = <K extends keyof CourseFilters>(
    key: K,
    value: CourseFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      priceRange: 'all',
      instructors: [],
      enrollmentStatus: 'all',
      duration: 'all',
      sortBy: 'recent',
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.instructors.length > 0) count++;
    if (filters.enrollmentStatus !== 'all') count++;
    if (filters.duration !== 'all') count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredCourses,
    uniqueInstructors,
    updateFilter,
    clearFilters,
    activeFilterCount,
  };
};

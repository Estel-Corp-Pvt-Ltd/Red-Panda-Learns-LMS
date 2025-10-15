import { useState, useMemo } from 'react';
import { Course } from '@/types/course';
import { CourseFilters } from '@/types/courseFilters';

export function useCourseFilters(courses: Course[] = []) {
  const [filters, setFilters] = useState<CourseFilters>({
    searchTerm: '',
    priceRange: 'all',
    instructors: [],
    enrollmentStatus: 'all',
    duration: 'all',
    sortBy: 'recent',
  });

  // Extract unique instructors from courses
  const uniqueInstructors = useMemo(() => {
    const instructors = courses.map(course => course.authorName);
    return [...new Set(instructors)].sort();
  }, [courses]);

  // Filter and sort courses based on current filters
  const filteredCourses = useMemo(() => {
    let filtered = courses;

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered?.filter(course =>
        course?.title.toLowerCase().includes(searchLower) ||
        course?.description.toLowerCase().includes(searchLower) ||
        course?.authorId.toLowerCase().includes(searchLower)
      );
    }

    // Price range filter
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

    // Instructor filter
    if (filters.instructors.length > 0) {
      filtered = filtered.filter(course =>
        filters.instructors.includes(course.authorId)
      );
    }

    // Enrollment status filter
    // if (filters.enrollmentStatus !== 'all') {
    //   filtered = filtered.filter(course => {
    //     switch (filters.enrollmentStatus) {
    //       case 'enrolled':
    //         return course.is_enrolled;
    //       case 'not-enrolled':
    //         return !course.is_enrolled;
    //       default:
    //         return true;
    //     }
    //   });
    // }

    // Duration filter
    // if (filters.duration !== 'all') {
    //   filtered = filtered.filter(course => {
    //     const duration = parseDuration(course.course_duration);
    //     switch (filters.duration) {
    //       case 'short':
    //         return duration < 2;
    //       case 'medium':
    //         return duration >= 2 && duration <= 8;
    //       case 'long':
    //         return duration > 8;
    //       default:
    //         return true;
    //     }
    //   });
    // }

    // Sort courses
    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        // case 'popular':
        //   return (b.total_students || 0) - (a.total_students || 0);
        case 'price-low':
          return (a.salePrice || 0) - (b.salePrice || 0);
        case 'price-high':
          return (b.salePrice || 0) - (a.salePrice || 0);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [courses, filters]);

  // Update individual filter values
  const updateFilter = <K extends keyof CourseFilters>(
    key: K,
    value: CourseFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
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

  // Get active filter count
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
}

// Helper function to parse duration string
function parseDuration(duration: string): number {
  if (!duration) return 0;

  // Extract hours from duration string (e.g., "2h 30m" -> 2.5)
  const hourMatch = duration.match(/(\d+)h/);
  const minuteMatch = duration.match(/(\d+)m/);

  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;

  return hours + minutes / 60;
}

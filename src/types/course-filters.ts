export interface CourseFilters {
  searchTerm: string;
  priceRange: PriceRange;
  instructors: string[];
  enrollmentStatus: EnrollmentStatus;
  duration: DurationRange;
  sortBy: SortOption;
};

export type PriceRange = 'all' | 'free' | 'under-1000' | '1000-5000' | 'above-5000';
export type EnrollmentStatus = 'all' | 'enrolled' | 'not-enrolled';
export type DurationRange = 'all' | 'short' | 'medium' | 'long';
export type SortOption = 'recent' | 'popular' | 'price-low' | 'price-high' | 'alphabetical';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
};

export const PRICE_RANGE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Prices' },
  { value: 'free', label: 'Free' },
  { value: 'under-1000', label: 'Under ₹1,000' },
  { value: '1000-5000', label: '₹1,000 - ₹5,000' },
  { value: 'above-5000', label: 'Above ₹5,000' },
];

export const ENROLLMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Courses' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'not-enrolled', label: 'Not Enrolled' },
];

export const DURATION_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Any Duration' },
  { value: 'short', label: 'Short (< 2 hours)' },
  { value: 'medium', label: 'Medium (2-8 hours)' },
  { value: 'long', label: 'Long (> 8 hours)' },
];

export const SORT_OPTIONS: FilterOption[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'alphabetical', label: 'Alphabetical' },
];

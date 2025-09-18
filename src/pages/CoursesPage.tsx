import { useState } from "react";
import { Grid, List, TrendingUp, Clock, Users } from "lucide-react";
import { Header } from "@/components/layout/header";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseListView } from "@/components/course/CourseListView";
import { CourseFilters } from "@/components/course/CourseFilters";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useCoursesQuery, useCohortsQuery } from "@/hooks/useFirebaseApi";
import { usePublishedBundlesQuery } from "@/hooks/useBundleApi";
import { useCourseFilters } from "@/hooks/useCourseFilters";
import { BundleCard } from "@/components/bundle/BundleCard";
import { CohortCard } from "@/components/cohort/cohort-card";
import { SORT_OPTIONS } from "@/types/courseFilters";
import { cn } from "@/lib/utils";

export default function CoursesPage() {

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    data: courses,
    isLoading,
    isError,
    error,
    refetch
  } = useCoursesQuery();

  // Fetch published bundles
  const {
    data: bundles,
    isLoading: bundlesLoading,
    isError: bundlesError
  } = usePublishedBundlesQuery();

  // Fetch active cohorts
  const {
    data: cohorts,
    isLoading: cohortsLoading,
    isError: cohortsError
  } = useCohortsQuery();

  // Use course filters hook
  const {
    filters,
    filteredCourses,
    uniqueInstructors,
    updateFilter,
    clearFilters,
    activeFilterCount,
  } = useCourseFilters(courses || []);

  const stats = {
    total: courses?.length || 0,
    // enrolled: courses?.filter(c => c.is_enrolled).length || 0,
    completed: 0, // This would come from user progress data
    bundles: bundles?.length || 0,
    cohorts: cohorts?.length || 0,
    filtered: filteredCourses.length,
  };

  const handleBundlePurchase = (bundleId: string) => {
    window.location.href = `/bundle/${bundleId}`;
  };


  return (
    <div className="min-h-screen bg-background">
      <Header showSearchBar />

      <main className="container px-4 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 md:p-12 mb-8">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Complete AI solutions for industry, research, and education
            </h1>
            <p className="text-primary-foreground/90 text-lg mb-6">
              Our mission: Make AI accessible for all
            </p>
            <div className="flex flex-wrap gap-4">
              <Badge variant="secondary" className="text-sm bg-primary-foreground/20 text-primary-foreground border-0 backdrop-blur-sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.total} Total Courses
              </Badge>
              <Badge variant="secondary" className="text-sm bg-primary-foreground/20 text-primary-foreground border-0 backdrop-blur-sm">
                <Clock className="h-3 w-3 mr-1" />
                New Content Weekly
              </Badge>
              <Badge variant="secondary" className="text-sm bg-primary-foreground/20 text-primary-foreground border-0 backdrop-blur-sm">
                <Users className="h-3 w-3 mr-1" />
                Expert Instructors
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 border-primary text-white rounded-full border-4 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Available Courses</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 border-primary rounded-full border-4 text-white flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.cohorts}</p>
                <p className="text-sm text-muted-foreground">Live Cohorts</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 rounded-full border-4 border-primary text-white flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.bundles}</p>
                <p className="text-sm text-muted-foreground">Course Bundles</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 rounded-full border-4 text-white border-primary flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters and Search */}
        <div className="bg-card rounded-xl p-6 border shadow-sm mb-8">
          <CourseFilters
            filters={filters}
            uniqueInstructors={uniqueInstructors}
            onUpdateFilter={updateFilter}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter('sortBy', value as any)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading || cohortsLoading ? (
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid'
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
          )}>
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        ) : isError || cohortsError ? (
          <ErrorState
            error={(error || cohortsError) as Error}
            onRetry={refetch}
            className="my-12"
          />
        ) : filteredCourses.length === 0 && (!cohorts || cohorts.length === 0) && (!bundles || bundles.length === 0) ? (
          <ErrorState
            variant="empty"
            title="No courses found"
            description={filters.searchTerm ? `No courses match "${filters.searchTerm}"` : "No courses available at the moment."}
            className="my-12"
          />
        ) : (
          <div className="space-y-8">
            {/* Cohorts Section */}
            {cohorts && cohorts.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Live Cohorts ({cohorts.length})
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Join structured learning cohorts
                  </p>
                </div>

                <div className={cn(
                  "grid gap-6 animate-fade-in",
                  viewMode === 'grid'
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 max-w-4xl"
                )}>
                  {cohorts.map((cohort, index) => (
                    <div
                      key={cohort.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CohortCard
                        cohort={cohort}
                        variant={viewMode === 'list' ? 'compact' : 'default'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Bundles Section */}
            {bundles && bundles.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Course Bundles ({bundles.length})
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Save more with course bundles
                  </p>
                </div>

                <div className={cn(
                  "grid gap-6 animate-fade-in",
                  viewMode === 'grid'
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 max-w-4xl"
                )}>
                  {bundles.map((bundle, index) => (
                    <div
                      key={bundle.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <BundleCard
                        bundle={bundle}
                        variant={viewMode === 'list' ? 'compact' : 'default'}
                        onPurchase={handleBundlePurchase}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Courses Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  {filters.searchTerm ? `Search Results (${filteredCourses.length})` : 'Individual Courses'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredCourses.length} of {stats.total} courses
                </p>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid gap-6 animate-fade-in grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCourses.map((course, index) => (
                    <div
                      key={course.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CourseCard
                        course={course}
                        variant="default"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <CourseListView courses={filteredCourses} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
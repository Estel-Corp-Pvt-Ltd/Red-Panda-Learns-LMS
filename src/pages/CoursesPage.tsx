import {
  BookOpen,
  CheckCircle,
  Clock,
  Grid,
  Layers,
  List,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState, useMemo } from "react";

import { Header } from "@/components/Header";
import { BundleWrapper } from "@/components/bundle/BundleWrapper";
import CourseCard from "@/components/course/CourseCard";
import CourseFilters from "@/components/course/CourseFilters";
import CourseListView from "@/components/course/CourseListView";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCourseFilters } from "@/hooks/use-course-filters";
import { usePublishedBundlesQuery } from "@/hooks/useBundleApi";
import { useCohortsQuery, useCoursesQuery } from "@/hooks/useCaching";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS } from "@/types/course-filters";
import { COURSE_STATUS } from "@/constants";

const CoursesPage = () => {
  const { enrollments, isEnrolledInBundle } = useEnrollment();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();
  const {
    data: courses,
    isLoading,
    isError,
    error,
    refetch,
  } = useCoursesQuery();

  const {
    data: bundles,
    isLoading: bundlesLoading,
    isError: bundlesError,
  } = usePublishedBundlesQuery();

  const {
    data: cohorts,
    isLoading: cohortsLoading,
    isError: cohortsError,
  } = useCohortsQuery();

  // Simple login check: just rely on user presence
  const isLoggedIn = !!user;

  const enrolledCourseIds = enrollments.map(
    (enrollment) => enrollment.courseId
  );

  const publishedCourses = useMemo(
    () => (courses ?? []).filter((c) => c?.status === COURSE_STATUS.PUBLISHED),
    [courses]
  );

  // All filtering (including enrollmentStatus) is handled by useCourseFilters
  const {
    filters,
    filteredCourses,
    uniqueInstructors,
    updateFilter,
    clearFilters,
    activeFilterCount,
  } = useCourseFilters(publishedCourses, enrolledCourseIds);

  const stats = {
    total: publishedCourses?.length || 0,
    completed: 0,
    bundles: bundles?.length || 0,
    cohorts: cohorts?.length || 0,
    filtered: filteredCourses.length,
  };

  const handleBundlePurchase = (bundleId: string) => {
    navigate(`/bundle/${bundleId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8">
        {/* Hero Section  */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 md:p-12 mb-8">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Complete AI solutions for industry, research, and education
            </h1>
            <p className="text-muted-foreground text-lg mb-6">
              Our mission: Make AI accessible for all
            </p>
            <div className="flex flex-wrap gap-4">
              <Badge
                variant="secondary"
                className="text-sm bg-background/80 text-foreground border border-border"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.total} Total Courses
              </Badge>
              <Badge
                variant="secondary"
                className="text-sm bg-background/80 text-foreground border border-border"
              >
                <Clock className="h-3 w-3 mr-1" />
                New Content Frequently
              </Badge>
              <Badge
                variant="secondary"
                className="text-sm bg-background/80 text-foreground border border-border"
              >
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
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
                <p className="text-sm text-muted-foreground">
                  Available Courses
                </p>
              </div>
            </div>
          </div>

          {/* <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 border-primary rounded-full border-4 text-white flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.cohorts}
                </p>
                <p className="text-sm text-muted-foreground">Live Cohorts</p>
              </div>
            </div>
          </div> */}

          <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 rounded-full border-4 border-primary text-white flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.bundles}
                </p>
                <p className="text-sm text-muted-foreground">Course Bundles</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 rounded-full border-4 text-white border-primary flex items-center justify-center">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.completed}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl p-6 border shadow-sm mb-8">
          <CourseFilters
            filters={filters}
            uniqueInstructors={uniqueInstructors}
            onUpdateFilter={updateFilter}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
            showEnrollmentStatus={isLoggedIn}
          />

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              {/* Sort */}
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter("sortBy", value as any)}
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
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        {isLoading || cohortsLoading ? (
          <div
            className={cn(
              "grid gap-6",
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            )}
          >
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
        ) : filteredCourses.length === 0 &&
          (!cohorts || cohorts.length === 0) &&
          (!bundles || bundles.length === 0) ? (
          <ErrorState
            variant="empty"
            title="No courses found"
            description={
              filters.searchTerm
                ? `No courses match "${filters.searchTerm}"`
                : "No courses available at the moment."
            }
            className="my-12"
          />
        ) : (
          <div className="space-y-8">
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

                <div
                  className={cn(
                    "grid gap-6 animate-fade-in",
                    viewMode === "grid"
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1 max-w-4xl"
                  )}
                >
                  {bundles.map((bundle, index) => (
                    <BundleWrapper
                      key={bundle.id}
                      bundle={bundle}
                      index={index}
                      user={user}
                      isEnrolledInBundle={async (id) =>
                        Promise.resolve(isEnrolledInBundle(id))
                      }
                      viewMode={viewMode}
                      handleBundlePurchase={(id) => {
                        // If your BundleWrapper includes CTA buttons,
                        // ensure those buttons call e.stopPropagation() in their onClick handlers.
                        handleBundlePurchase(id);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Courses Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  {filters.searchTerm
                    ? `Search Results (${filteredCourses.length})`
                    : "Individual Courses"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredCourses.length} of {stats.total} courses
                </p>
              </div>

              {viewMode === "grid" ? (
                <div className="grid gap-6 animate-fade-in grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCourses
                    .filter(course => course.salePrice > 0)
                    .map((course, index) => (
                      <div
                        key={course.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <CourseCard course={course} variant="default" />
                      </div>
                    ))}
                </div>
              ) : (
                <CourseListView
                  courses={filteredCourses.filter(course => course.salePrice > 0)}
                  enrolledCourseIds={enrolledCourseIds}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoursesPage;

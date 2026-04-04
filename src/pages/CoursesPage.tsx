import {
  BookOpen,
  ChartBarStacked,
  CheckCircle,
  Clock,
  Layers,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Header } from "@/components/Header";
import { BundleWrapper } from "@/components/bundle/BundleWrapper";
import CourseCard from "@/components/course/CourseCard";
import CourseListView from "@/components/course/CourseListView";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { COURSE_STATUS, USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { usePublishedBundlesQuery } from "@/hooks/useBundleApi";
import { useCoursesQuery } from "@/hooks/useCaching";
import { cn } from "@/lib/utils";
import { courseArrangementService } from "@/services/courseArrangementService";
import { CoursePageHeading } from "@/types/course-arrangement";
import { useNavigate } from "react-router-dom";

interface ArrangedContent {
  heading: CoursePageHeading;
  courses: any[];
  bundles: any[];
}

const CoursesPage = () => {
  const { enrollments, isEnrolledInBundle } = useEnrollment();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Courses | RedPanda Learns";
    return () => { document.title = "RedPanda Learns"; };
  }, []);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseArrangement, setCourseArrangement] = useState<CoursePageHeading[]>([]);
  const [isLoadingArrangement, setIsLoadingArrangement] = useState(false);
  const navigate = useNavigate();

  const { data: courses, isLoading, isError, error, refetch } = useCoursesQuery();

  const {
    data: allBundles,
    isLoading: bundlesLoading,
    isError: bundlesError,
  } = usePublishedBundlesQuery();

  // Load course arrangement on component mount
  useEffect(() => {
    const loadDefaultArrangement = async () => {
      try {
        setIsLoadingArrangement(true);
        const result = await courseArrangementService.loadCourseArrangement("default_arrangement");
        if (result.success) {
          setCourseArrangement(result.data.headings);
        }
      } catch (error) {
        console.error("Failed to load course arrangement:", error);
      } finally {
        setIsLoadingArrangement(false);
      }
    };

    loadDefaultArrangement();
  }, []);

  // Simple login check: just rely on user presence
  const isLoggedIn = !!user;

  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.courseId);

  const publishedCourses = useMemo(
    () => (courses ?? []).filter((c) => c?.status === COURSE_STATUS.PUBLISHED),
    [courses]
  );

  // Create maps for quick lookup
  const courseMap = useMemo(
    () => new Map(publishedCourses.map((course) => [course.id, course])),
    [publishedCourses]
  );

  const bundleMap = useMemo(
    () => new Map(allBundles?.map((bundle) => [bundle.id, bundle]) || []),
    [allBundles]
  );

  // Organize content by headings when not searching
  const arrangedContent = useMemo((): ArrangedContent[] => {
    if (searchQuery.trim() || !courseArrangement.length) return [];

    return courseArrangement.map((heading) => {
      const headingCourses: any[] = [];
      const headingBundles: any[] = [];

      heading.items.forEach((item) => {
        if (item.type === "COURSE") {
          const course = courseMap.get(item.refId);
          if (course) {
            headingCourses.push(course);
          }
        } else if (item.type === "BUNDLE") {
          const bundle = bundleMap.get(item.refId);
          if (bundle) {
            headingBundles.push(bundle);
          }
        }
      });

      return {
        heading,
        courses: headingCourses,
        bundles: headingBundles,
      };
    });
  }, [courseArrangement, courseMap, bundleMap, searchQuery]);

  // Filter courses and bundles for search mode
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { courses: [], bundles: [] };

    const searchTerm = searchQuery.toLowerCase();

    const searchedCourses = publishedCourses.filter(
      (course) =>
        course.title.toLowerCase().includes(searchTerm) ||
        course.description?.toLowerCase().includes(searchTerm) ||
        course.instructorName?.toLowerCase().includes(searchTerm)
    );

    const searchedBundles = (allBundles || []).filter(
      (bundle) =>
        bundle.title.toLowerCase().includes(searchTerm) ||
        bundle.description?.toLowerCase().includes(searchTerm)
    );

    return {
      courses: searchedCourses,
      bundles: searchedBundles,
    };
  }, [searchQuery, publishedCourses, allBundles]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: publishedCourses.length || 0,
      completed: 0,
      bundles: allBundles?.length || 0,
      filtered: searchResults.courses.length || 0,
    };
  }, [publishedCourses, allBundles, arrangedContent, searchResults]);

  const handleBundlePurchase = (bundleId: string) => {
    navigate(`/bundle/${bundleId}`);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Check if we're in search mode
  const isSearchMode = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8">
        {/* Hero Section  */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero py-8 mb-8">
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
                {stats.total}
                <p className="text-sm text-muted-foreground">Available Courses</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 rounded-full border-4 border-primary text-white flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.bundles}</p>
                <p className="text-sm text-muted-foreground">Available Bundles</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/80 rounded-full border-4 text-white border-primary flex items-center justify-center">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-card rounded-xl p-6 border shadow-sm mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search courses by title, instructor, or topic..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                ×
              </Button>
            )}
          </div>
          {!isSearchMode && arrangedContent.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Browse featured content organized by category.{" "}
              <b>Use search to explore all available courses and bundles.</b>
            </p>
          )}
        </div>

        {/* Main Content Sections */}
        {isLoading || isLoadingArrangement ? (
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
        ) : isError ? (
          <ErrorState error={error as Error} onRetry={refetch} className="my-12" />
        ) : isSearchMode ? (
          // Search Results View
          <div className="space-y-8">
            {/* Search Results for Bundles */}
            {searchResults.bundles.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Bundles Found ({searchResults.bundles.length})
                  </h2>
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                    Search Results
                  </Badge>
                </div>

                <div
                  className={cn(
                    "grid gap-6 animate-fade-in",
                    viewMode === "grid"
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1 max-w-4xl"
                  )}
                >
                  {searchResults.bundles.map((bundle, index) => (
                    <BundleWrapper
                      key={bundle.id}
                      bundle={bundle}
                      index={index}
                      user={user}
                      isEnrolledInBundle={async (id) => Promise.resolve(isEnrolledInBundle(id))}
                      viewMode={viewMode}
                      handleBundlePurchase={(id) => {
                        handleBundlePurchase(id);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Search Results for Courses */}
            {searchResults.courses.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Courses Found ({searchResults.courses.length})
                  </h2>
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                    Search Results
                  </Badge>
                </div>

                {viewMode === "grid" ? (
                  <div className="grid gap-6 animate-fade-in grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {searchResults.courses
                      .filter((course) => user?.role === USER_ROLE.ADMIN)
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
                    courses={
                      user?.role === USER_ROLE.ADMIN
                        ? searchResults.courses
                        : searchResults.courses.filter((course) => course.salePrice > 0)
                    }
                    enrolledCourseIds={enrolledCourseIds}
                  />
                )}
              </div>
            )}

            {/* No Search Results */}
            {searchResults.courses.length === 0 && searchResults.bundles.length === 0 && (
              <ErrorState
                variant="empty"
                title="No results found"
                description={`No courses or bundles match "${searchQuery}"`}
                className="my-12"
              />
            )}
          </div>
        ) : arrangedContent.length > 0 ? (
          // Arranged Content View
          <div className="space-y-12">
            {arrangedContent.map((content, sectionIndex) => (
              <section key={content.heading.id} className="space-y-6">
                {/* Section Header */}
                <div>
                  <div className="flex items-center justify-between mt-6 mb-3">
                    <div className="flex items-center gap-3">
                      <ChartBarStacked />
                      <h2 className="text-3xl m-0 font-bold text-foreground">
                        {content.heading.title}
                      </h2>
                    </div>
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {content.bundles.length + content.courses.length} items
                    </Badge>
                  </div>
                  <hr className="mb-6" />
                </div>

                {content.bundles.length > 0 && (
                  <div className="space-y-4">
                    <div
                      className={cn(
                        "grid gap-6",
                        viewMode === "grid"
                          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                          : "grid-cols-1 max-w-4xl"
                      )}
                    >
                      {content.bundles.map((bundle, index) => (
                        <BundleWrapper
                          key={bundle.id}
                          bundle={bundle}
                          index={index}
                          user={user}
                          isEnrolledInBundle={async (id) => Promise.resolve(isEnrolledInBundle(id))}
                          viewMode={viewMode}
                          handleBundlePurchase={(id) => {
                            handleBundlePurchase(id);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Courses in this section */}
                {content.courses.length > 0 && (
                  <div className="space-y-4">
                    {viewMode === "grid" ? (
                      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {content.courses
                          .filter(
                            (course) => user?.role === USER_ROLE.ADMIN || course.salePrice > 0
                          )
                          .map((course, index) => (
                            <div
                              key={course.id}
                              className="animate-fade-in-up relative"
                              style={{ animationDelay: `${index * 0.1}s` }}
                            >
                              <div className="absolute top-2 left-2.5 z-10">
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-red-600 text-white"
                                >
                                  Featured
                                </Badge>
                              </div>
                              <CourseCard course={course} variant="default" />
                            </div>
                          ))}
                      </div>
                    ) : (
                      <CourseListView
                        courses={
                          user?.role === USER_ROLE.ADMIN
                            ? content.courses
                            : content.courses.filter((course) => course.salePrice > 0)
                        }
                        enrolledCourseIds={enrolledCourseIds}
                      />
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          // No featured content available
          <ErrorState
            variant="empty"
            title="No featured content"
            description="No featured courses or bundles are currently available. Use search to explore all content."
            className="my-12"
          />
        )}
      </main>
    </div>
  );
};

export default CoursesPage;

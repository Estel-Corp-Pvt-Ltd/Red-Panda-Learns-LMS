import CourseCard from '@/components/course/CourseCard';
import { Header } from '@/components/Header';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { courseService } from '@/services/courseService';
import { Course } from '@/types/course';
import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

const FreeCourses: React.FC = () => {
  const freeCourseIds = [
    "course_20001778",
    "course_20001109",
    "course_20001725",
    "course_20002986",
    // Add more free course IDs as needed
  ];

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFreeCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all free courses by their IDs
        const coursePromises = freeCourseIds.map(id =>
          courseService.getCourseById(id)
        );

        const courseResults = await Promise.allSettled(coursePromises);

        const validCourses = courseResults
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<Course | null>).value)
          .filter((course): course is Course => course !== null);

        setCourses(validCourses);

      } catch (error) {
        console.error('Error fetching free courses:', error);
        setError('An error occurred while loading courses');
      } finally {
        setLoading(false);
      }
    };

    fetchFreeCourses();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Free Courses
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore our specially selected free courses to start your learning journey.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <LoadingSkeleton className="h-64" />
            <LoadingSkeleton className="h-64" />
            <LoadingSkeleton className="h-64" />
            <LoadingSkeleton className="h-64" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-12">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-destructive mb-2">
                Unable to load courses
              </h3>
              <p className="text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Free Courses Available
            </h3>
            <p className="text-muted-foreground">
              Check back later for new free courses.
            </p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <>
            <div className="mb-6 text-center">
              <p className="text-muted-foreground">
                {courses.length} free course{courses.length !== 1 ? 's' : ''} available
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  className="h-full"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FreeCourses;

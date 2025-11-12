import CourseCard from '@/components/course/CourseCard';
import { Header } from '@/components/Header';
import { courseService } from '@/services/courseService';
import { Course } from '@/types/course';
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Free Courses
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our specially selected free courses to start your learning journey.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
            <span className="text-lg text-gray-600">Loading free courses...</span>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Unable to load courses
              </h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Free Courses Available
              </h3>
            </div>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <>
            <div className="mb-6 text-center">
              <p className="text-gray-600">
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

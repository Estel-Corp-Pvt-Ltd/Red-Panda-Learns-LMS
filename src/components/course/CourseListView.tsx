import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Course } from '@/types/course';
import { getCourseStructureCounts } from '@/utils/course';
import { parseDuration } from '@/utils/date-time';
import { BookOpen, Clock, IndianRupee, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/badge';

type CourseListViewProps = {
  courses: Course[];
  enrolledCourseIds: string[];
};

const CourseListView = ({
  courses,
  enrolledCourseIds
}: CourseListViewProps) => {

  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {courses.map((course) => {

        const { lessonCount } = getCourseStructureCounts(course);

        return (
          <Card
            key={course.id}
            className="p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-48 lg:h-32 w-full h-48 flex-shrink-0">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <img
                    src={"/placeholder.svg"}
                    alt={course.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <h3 className="text-xl font-semibold leading-tight hover:text-primary cursor-pointer">
                    "{course.title}"
                  </h3>
                  {enrolledCourseIds.includes(course.id) && (
                    <Badge variant="secondary" className="w-fit">
                      Enrolled
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="text-sm">
                    {course.instructorName ?? "No instructor assigned yet"}
                  </span>
                </div>

                {course.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {course.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration.hours} hrs</span>
                      <span>{course.duration.minutes} min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{lessonCount} lessons</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-semibold text-primary">
                      {course.salePrice}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/course/${course.url ? course.url : course.id}`
                        )
                      }
                    >
                      View Details
                    </Button>
                    {!enrolledCourseIds.includes(course.id) ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/checkout/${course.url ? course.url : course.id}`
                          )
                        }
                      >
                        {course.salePrice === 0 ? "Enroll Free" : "Buy Now"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/course/${course.url ? course.url : course.id}`
                          )
                        }
                      >
                        Continue Learning
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CourseListView;

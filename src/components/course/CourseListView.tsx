import { User, DollarSign } from 'lucide-react';
import { Course } from '@/types/course';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

type CourseListViewProps = {
  courses: Course[];
};

export function CourseListView({ courses }: CourseListViewProps) {
  const navigate = useNavigate();

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return 'Free';
    return `₹${numPrice?.toLocaleString()}`;
  };

  const formatDuration = (duration: string) => {
    if (!duration) return 'Duration not specified';
    return duration;
  };

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <Card key={course.id} className="p-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Course Image */}
            <div className="lg:w-48 lg:h-32 w-full h-48 flex-shrink-0">
              <img
                src={'/placeholder.svg'}
                alt={course.title}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>

            {/* Course Content */}
            <div className="flex-1 space-y-3">
              {/* Title and Enrollment Status */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <h3 className="text-xl font-semibold leading-tight hover:text-primary cursor-pointer">
                  {course.title}
                </h3>
                {/* {course.is_enrolled && (
                  <Badge variant="secondary" className="w-fit">
                    Enrolled
                  </Badge>
                )} */}
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="text-sm">{course.authorId}</span>
              </div>

              {/* Description */}
              {course.description && (
                <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                  {course.description}
                </p>
              )}

              {/* Course Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {/* <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(course.course_duration)}</span>
                </div> */}
                {/* <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.total_lessons || 0} lessons</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{course.total_students || 0} students</span>
                </div> */}
              </div>

              {/* Price and Action */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-semibold text-primary">
                    {/* {formatPrice(course.salePrice)} */}
                    {course.salePrice}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/course/${course?.id}`)}
                  >
                    View Details
                  </Button>
                  {/* {!course.is_enrolled && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/checkout?courseId=${course?.ID}`)}
                    >
                      {parseFloat(course.course_price) === 0 ? 'Enroll Free' : 'Buy Now'}
                    </Button>
                  )} */}
                  {/* {course.is_enrolled && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/course/${course?.ID}`)}
                    >
                      Continue Learning
                    </Button>
                  )} */}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
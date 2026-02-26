import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";

import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import CourseCard from "@/components/course/CourseCard";
import { courseService } from "@/services/courseService";
import type { Course } from "@/types/course";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      setIsLoading(true);
      const data = await courseService.getPublishedCourses();
      setCourses(data);
      setIsLoading(false);
    };
    loadCourses();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return courses;
    const lower = query.toLowerCase();
    return courses.filter((c) => c.title.toLowerCase().includes(lower));
  }, [query, courses]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="relative mb-8 max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search courses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-16">Loading courses...</div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground">
              {query.trim()
                ? `No courses match "${query}"`
                : "No published courses available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

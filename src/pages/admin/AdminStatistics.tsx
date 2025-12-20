import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseAnalytics, courseAnalyticsService } from "@/services/analytics/courseAnalyticsService";
import { LessonAnalytics, lessonAnalyticsService } from "@/services/analytics/lessonAnalyticsService";
import {
  Users,
  Clock,
  Award,
  BookOpen,
  TrendingUp,
  BarChart3,
  Download,
  Eye,
  Target,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from '@/components/AdminLayout';

const AdminAnalyticsPage: React.FC = () => {
  const [allCourses, setAllCourses] = React.useState<CourseAnalytics[]>([]);
  const [topLessons, setTopLessons] = React.useState<LessonAnalytics[]>([]);
  const [mostTimeSpentCourse, setMostTimeSpentCourse] = React.useState<CourseAnalytics | null>(null);
  const [mostPopularLesson, setMostPopularLesson] = React.useState<LessonAnalytics | null>(null);
  const [topCoursesByTimeSpent, setTopCoursesByTimeSpent] = React.useState<CourseAnalytics[]>([]);
  const [topCoursesByCompletion, setTopCoursesByCompletion] = React.useState<CourseAnalytics[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [courses, lessons, topCourse, topLesson, topByTime, topByCompletion] = await Promise.all([
          courseAnalyticsService.getAllCourseAnalytics(),
          lessonAnalyticsService.getTopLessonsByTimeSpent(10),
          courseAnalyticsService.getMostTimeSpentCourse(),
          lessonAnalyticsService.getMostPopularLesson(),
          courseAnalyticsService.getTopCoursesByTimeSpent(5),
          courseAnalyticsService.getTopCoursesByCompletionRate(5),
        ]);

        setAllCourses(courses);
        setTopLessons(lessons);
        setMostTimeSpentCourse(topCourse);
        setMostPopularLesson(topLesson);
        setTopCoursesByTimeSpent(topByTime);
        setTopCoursesByCompletion(topByCompletion);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Insights and metrics for course performance and learner engagement
            </p>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="courses">
              <BookOpen className="h-4 w-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="lessons">
              <Eye className="h-4 w-4 mr-2" />
              Lessons
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Time Spent Course */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Most Time Spent Course
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mostTimeSpentCourse ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-nowrap max-w-96 overflow-hidden text-ellipsis">{mostTimeSpentCourse.courseTitle}</h3>
                          <p className="text-muted-foreground">{mostTimeSpentCourse.formattedTime} total</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {mostTimeSpentCourse.avgCompletionRate?.toFixed(1) || 0}%
                          </div>
                          <p className="text-sm text-muted-foreground">Completion Rate</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Learners</p>
                          <p className="font-medium">{mostTimeSpentCourse.totalLearners}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Completions</p>
                          <p className="font-medium">{mostTimeSpentCourse.totalLessonsCompleted}</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(mostTimeSpentCourse.avgCompletionRate || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Most Popular Lesson */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-500" />
                    Most Popular Lesson
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mostPopularLesson ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold">{mostPopularLesson.lessonTitle}</h3>
                          <p className="text-muted-foreground">{mostPopularLesson.courseTitle}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {mostPopularLesson.formattedTime}
                          </div>
                          <p className="text-sm text-muted-foreground">Time Spent</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Completions</p>
                          <p className="font-medium">{mostPopularLesson.totalCompletions}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Completion Rate</p>
                          <p className="font-medium">{mostPopularLesson.completionRate?.toFixed(1) || 0}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${Math.min(mostPopularLesson.completionRate || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Courses Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Courses by Time Spent */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Courses by Time Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topCoursesByTimeSpent.map((course, index) => (
                      <div key={course.courseId} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-100 text-yellow-800' : index === 1 ? 'bg-gray-100 text-gray-800' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                            <span className="font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{course.courseTitle}</p>
                            <p className="text-sm text-muted-foreground">{course.totalLearners} learners</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{course.formattedTime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Courses by Completion */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Courses by Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topCoursesByCompletion.map((course, index) => (
                      <div key={course.courseId} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${index === 0 ? 'bg-green-100 text-green-800' : index === 1 ? 'bg-teal-100 text-teal-800' : index === 2 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            <span className="font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{course.courseTitle}</p>
                            <p className="text-sm text-muted-foreground">{course.totalLearners} learners</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${Math.min(course.avgCompletionRate || 0, 100)}%` }}
                              />
                            </div>
                            <span className="font-semibold">{course.avgCompletionRate?.toFixed(1) || 0}%</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{course.totalLessonsCompleted} completions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Courses Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Course Name</th>
                        <th className="text-left py-3 px-4 font-semibold">Learners</th>
                        <th className="text-left py-3 px-4 font-semibold">Time Spent</th>
                        <th className="text-left py-3 px-4 font-semibold">Completions</th>
                        <th className="text-left py-3 px-4 font-semibold">Completion Rate</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCourses.map((course) => {
                        // Use server-computed completion rate if available, otherwise calculate
                        const completionRate = course.avgCompletionRate !== undefined
                          ? course.avgCompletionRate
                          : course.totalLearners > 0
                            ? (course.totalLessonsCompleted / course.totalLearners) * 100
                            : 0;

                        return (
                          <tr key={course.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-3 px-4">
                              <div className="font-medium">{course.courseTitle}</div>
                              <div className="text-sm text-muted-foreground">
                                Updated: {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{course.totalLearners}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{formatSeconds(course.totalTimeSpentSec)}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{course.totalLessonsCompleted}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${completionRate > 70 ? 'bg-green-500' : completionRate > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(completionRate, 100)}%` }}
                                  />
                                </div>
                                <span className="font-medium">{completionRate.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Button variant="outline" size="sm">View Details</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Lessons by Engagement</CardTitle>
                <p className="text-muted-foreground">Lessons with highest time spent</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Rank</th>
                        <th className="text-left py-3 px-4 font-semibold">Lesson Name</th>
                        <th className="text-left py-3 px-4 font-semibold">Course</th>
                        <th className="text-left py-3 px-4 font-semibold">Time Spent</th>
                        <th className="text-left py-3 px-4 font-semibold">Learners</th>
                        <th className="text-left py-3 px-4 font-semibold">Completions</th>
                        <th className="text-left py-3 px-4 font-semibold">Completion Rate</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topLessons.map((lesson, index) => {
                        // Use server-computed completion rate (already fixed to use correct formula)
                        const completionRate = lesson.completionRate || 0;

                        return (
                          <tr key={lesson.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="py-3 px-4">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${index < 3 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                                <span className="font-bold">#{index + 1}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold">{lesson.lessonTitle}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-muted-foreground max-w-64 overflow-hidden text-ellipsis">
                                {lesson.courseTitle}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{formatSeconds(lesson.totalTimeSpentSec)}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{lesson.totalLearners}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{lesson.totalCompletions}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${completionRate > 70 ? 'bg-green-500' : completionRate > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(completionRate, 100)}%` }}
                                  />
                                </div>
                                <span className="font-medium">{completionRate.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Analytics Data</CardTitle>
                <p className="text-muted-foreground">Download analytics data in various formats</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <ExportOptionCard
                    title="JSON Format"
                    description="Full dataset in JSON format for programmatic use"
                    format="json"
                    icon="{ }"
                    color="bg-blue-500"
                  />
                  <ExportOptionCard
                    title="CSV Format"
                    description="Spreadsheet-friendly format for Excel or Google Sheets"
                    format="csv"
                    icon="CSV"
                    color="bg-green-500"
                  />
                  <ExportOptionCard
                    title="PDF Report"
                    description="Formatted report with charts and insights"
                    format="pdf"
                    icon="PDF"
                    color="bg-red-500"
                  />
                </div>

                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="font-medium mb-2">Export Details</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Records</div>
                      <div className="font-medium">{allCourses.length} courses, {topLessons.length} lessons</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Data Range</div>
                      <div className="font-medium">All time</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Updated</div>
                      <div className="font-medium">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">File Size</div>
                      <div className="font-medium">~{Math.round((allCourses.length * 0.5) + (topLessons.length * 0.3))}KB</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Helper Components
function SummaryCard({
  title,
  value,
  icon,
  color,
  trend,
  description
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h2 className="text-3xl font-bold">{value}</h2>
            {trend && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="h-4 w-4" />
                {trend}
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`${color} p-3 rounded-lg`}>
            <div className="text-white">{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportOptionCard({
  title,
  description,
  format,
  icon,
  color
}: {
  title: string;
  description: string;
  format: string;
  icon: string;
  color: string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className={`${color} text-white h-12 w-12 rounded-lg flex items-center justify-center text-xl font-bold`}>
            {icon}
          </div>
        </div>
        <Button className="w-full mt-4" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download {format.toUpperCase()}
        </Button>
      </CardContent>
    </Card>
  );
}

// Helper function to format seconds
function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

export default AdminAnalyticsPage;

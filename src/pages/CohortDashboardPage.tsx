import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Calendar, Clock, Users, Video, BookOpen, Award, Bell, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/contexts/AuthContext';
import { useCohort } from '@/contexts/CohortContext';
import { cohortService } from '@/services/cohortService';
import { courseService } from '@/services/courseService';
import { Cohort, CohortEnrollment } from '@/types/cohort';
import { Course } from '@/types/api';

export default function CohortDashboardPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const { user } = useAuth();
  const { isEnrolledInCohort, cohortEnrollments } = useCohort();

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CohortEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!cohortId || !user) return;

      try {
        setIsLoading(true);
        setError(null);

        // Check if user is enrolled
        const userEnrollment = cohortEnrollments.find(e => e.cohortId === cohortId);
        if (!userEnrollment) {
          setError('You are not enrolled in this cohort');
          return;
        }
        setEnrollment(userEnrollment);

        // Load cohort data
        const cohortData = await cohortService.getCohortById(cohortId);
        if (!cohortData) {
          setError('Cohort not found');
          return;
        }
        setCohort(cohortData);

        // Load course data if available
        try {
          const courseData = await courseService.getCourseById(cohortData.courseId);
          if (courseData) setCourse(courseData as any);
        } catch (err) {
          console.log('Course not found, continuing without course data');
        }

      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load cohort dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [cohortId, user, cohortEnrollments]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUpcomingSessions = () => {
    if (!cohort) return [];
    const now = new Date();
    return cohort.liveSessionSchedule
      .filter(session => new Date(session.scheduledDate) > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 3);
  };

  const getCurrentWeek = () => {
    if (!cohort || !enrollment) return null;
    return enrollment.progress.currentWeek;
  };

  const getWeekProgress = () => {
    if (!enrollment) return [];
    return enrollment.progress.weeklyProgress;
  };

  // Redirect if not enrolled
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!isEnrolledInCohort(cohortId!)) {
    return <Navigate to={`/cohort/${cohortId}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <LoadingSkeleton variant="card" />
        </main>
      </div>
    );
  }

  if (error || !cohort || !enrollment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <ErrorState
            title="Dashboard not available"
            description={error || 'Unable to load your cohort dashboard.'}
          />
          <div className="mt-4">
            <Button asChild>
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const upcomingSessions = getUpcomingSessions();
  const currentWeek = getCurrentWeek();
  const weekProgress = getWeekProgress();
  const completionPercentage = enrollment.progress.completionPercentage;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link to={`/cohort/${cohortId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cohort Details
            </Link>
          </Button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{cohort.name}</h1>
            <p className="text-muted-foreground">Your learning dashboard</p>
          </div>

          {/* Overview Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Current Week</p>
                    <p className="text-2xl font-bold">{currentWeek}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-2xl font-bold">{completionPercentage}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Video className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions Attended</p>
                    <p className="text-2xl font-bold">{enrollment.attendedSessions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cohort Size</p>
                    <p className="text-2xl font-bold">{cohort.currentEnrollments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Course Completion</span>
                        <span>{completionPercentage}%</span>
                      </div>
                      <Progress value={completionPercentage} className="h-2" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Lessons completed: {enrollment.completedLessons.length}</p>
                      <p>Assignments completed: {enrollment.completedAssignments.length}</p>
                      <p>Last activity: {formatDate(enrollment.progress.lastActivityDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Curriculum</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cohort.weeklySchedule.map((week) => {
                      const weekProgressData = weekProgress.find(w => w.weekNumber === week.weekNumber);
                      const isUnlocked = weekProgressData?.isUnlocked || false;
                      const isCompleted = weekProgressData?.isCompleted || false;
                      const isCurrent = week.weekNumber === currentWeek;

                      return (
                        <div key={week.weekNumber} className={`border rounded-lg p-4 ${
                          isCurrent ? 'border-primary bg-primary/5' : ''
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">Week {week.weekNumber}: {week.title}</h3>
                            <div className="flex items-center gap-2">
                              {isCompleted && (
                                <Badge variant="default" className="bg-success text-success-foreground">
                                  Completed
                                </Badge>
                              )}
                              {isCurrent && !isCompleted && (
                                <Badge variant="outline" className="border-primary text-primary">
                                  Current
                                </Badge>
                              )}
                              {!isUnlocked && (
                                <Badge variant="secondary">
                                  Locked
                                </Badge>
                              )}
                            </div>
                          </div>
                          {week.description && (
                            <p className="text-sm text-muted-foreground mb-2">{week.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Unlocks: {formatDate(week.unlockDate)}</span>
                            <span>{week.estimatedHours}h estimated</span>
                          </div>
                          {weekProgressData && (
                            <div className="mt-2">
                              <Progress 
                                value={(weekProgressData.lessonsCompleted / weekProgressData.totalLessons) * 100} 
                                className="h-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {weekProgressData.lessonsCompleted}/{weekProgressData.totalLessons} lessons
                              </p>
                            </div>
                          )}
                          {isUnlocked && (
                            <Button variant="outline" size="sm" className="mt-2" asChild>
                              <Link to={`/course/${cohort.courseId}`}>
                                {isCompleted ? 'Review Content' : 'Start Learning'}
                              </Link>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Upcoming Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingSessions.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingSessions.map((session) => (
                        <div key={session.id} className="border rounded-lg p-3">
                          <h4 className="font-medium mb-1">{session.title}</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(session.scheduledDate)}
                            </p>
                            <p className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(session.scheduledDate)} ({session.duration} min)
                            </p>
                          </div>
                          {session.isRequired && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" asChild>
                    <Link to={`/course/${cohort.courseId}`}>
                      Continue Learning
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full">
                    View Assignments
                  </Button>
                  <Button variant="outline" className="w-full">
                    Community Forum
                  </Button>
                  <Button variant="outline" className="w-full">
                    Contact Instructor
                  </Button>
                </CardContent>
              </Card>

              {/* Cohort Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Cohort Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{cohort.weeklySchedule.length} weeks</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p className="font-medium">{formatDate(cohort.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Enrolled Students</p>
                    <p className="font-medium">{cohort.currentEnrollments}/{cohort.maxStudents}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
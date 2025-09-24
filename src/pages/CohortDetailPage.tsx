import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Users, Clock, DollarSign, ArrowLeft, BookOpen, Video, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/contexts/AuthContext';
import { useCohort } from '@/contexts/CohortContext';
import { cohortService } from '@/services/cohortService';
import { courseService } from '@/services/courseService';
import { Cohort } from '@/types/cohort';
import { Course } from '@/types/api';

export default function CohortDetailPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const { user } = useAuth();
  const { isEnrolledInCohort } = useCohort();

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEnrolled = user && cohortId ? isEnrolledInCohort(cohortId) : false;

  useEffect(() => {
    const loadCohortData = async () => {
      if (!cohortId) return;

      try {
        setIsLoading(true);
        setError(null);

        const cohortData = await cohortService.getCohortById(cohortId);
        if (!cohortData) {
          setError('Cohort not found');
          return;
        }

        setCohort(cohortData);

        // Fetch associated course (optional - may not exist)
        try {
          const courseData = await courseService.getCourseById(cohortData.courseId);
          if (courseData) setCourse(courseData as any);
        } catch (err) {
          console.log('Course not found, continuing without course data');
        }

      } catch (err) {
        console.error('Error loading cohort:', err);
        setError('Failed to load cohort information');
      } finally {
        setIsLoading(false);
      }
    };

    loadCohortData();
  }, [cohortId]);

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${price?.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date)?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-success text-success-foreground';
      case 'in-progress': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

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

  if (error || !cohort) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <ErrorState
            title="Cohort not found"
            description={error || 'The requested cohort could not be found.'}
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

  const spotsLeft = cohort.maxStudents - cohort.currentEnrollments;
  const isFull = spotsLeft <= 0;
  const isNearFull = spotsLeft <= 3 && spotsLeft > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
          </Button>

          {/* Hero Section */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-3xl font-bold">{cohort.name}</h1>
                  <Badge className={cn("capitalize", getStatusColor(cohort.status))}>
                    {cohort.status === 'in-progress' ? 'In Progress' : cohort.status}
                  </Badge>
                </div>
                
                {course && (
                  <p className="text-lg text-muted-foreground mb-4">
                    Based on: {course.post_title}
                  </p>
                )}

                {cohort.description && (
                  <p className="text-muted-foreground">{cohort.description}</p>
                )}
              </div>

              {/* Key Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="font-medium">{formatDate(cohort.startDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{cohort.weeklySchedule.length} weeks</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Enrollment</p>
                        <p className="font-medium">{cohort.currentEnrollments}/{cohort.maxStudents} students</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="font-medium">{formatPrice(cohort.price, cohort.currency)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Enrollment Card */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Enrollment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{formatPrice(cohort.price, cohort.currency)}</p>
                    <p className="text-sm text-muted-foreground">One-time payment</p>
                  </div>

                  {isNearFull && (
                    <Badge variant="outline" className="w-full justify-center text-warning border-warning">
                      Only {spotsLeft} spots left!
                    </Badge>
                  )}

                  {isFull && (
                    <Badge variant="outline" className="w-full justify-center text-destructive border-destructive">
                      Cohort Full
                    </Badge>
                  )}

                  {isEnrolled && (
                    <Badge variant="outline" className="w-full justify-center text-success border-success">
                      ✓ You're Enrolled
                    </Badge>
                  )}

                  <div className="space-y-2">
                    {!isEnrolled && cohort.status === 'open' && !isFull ? (
                      <Button asChild className="w-full">
                        <Link to={`/cohort/${cohort.id}/checkout`}>
                          Enroll Now
                        </Link>
                      </Button>
                    ) : isEnrolled ? (
                      <Button asChild className="w-full">
                        <Link to={`/cohort/${cohort.id}/dashboard`}>
                          Go to Dashboard
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled className="w-full">
                        {isFull ? 'Cohort Full' : 'Enrollment Closed'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* What's Included */}
              <Card>
                <CardHeader>
                  <CardTitle>What's Included</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-success" />
                    <span>{cohort.weeklySchedule.length} weeks of content</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="h-4 w-4 text-success" />
                    <span>{cohort.liveSessionSchedule.length} live sessions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-success" />
                    <span>Community access</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-success" />
                    <span>Certificate of completion</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Information */}
          <Tabs defaultValue="curriculum" className="space-y-6">
            <TabsList>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="schedule">Live Sessions</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            <TabsContent value="curriculum" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Curriculum</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cohort.weeklySchedule.map((week) => (
                      <div key={week.weekNumber} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">Week {week.weekNumber}: {week.title}</h3>
                          <Badge variant="outline">
                            {week.estimatedHours}h
                          </Badge>
                        </div>
                        {week.description && (
                          <p className="text-sm text-muted-foreground mb-2">{week.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Unlocks: {formatDate(week.unlockDate)}</span>
                          {week.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Live Session Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cohort.liveSessionSchedule.map((session) => (
                      <div key={session.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{session.title}</h3>
                          <Badge variant="outline">
                            {session.duration} min
                          </Badge>
                        </div>
                        {session.description && (
                          <p className="text-sm text-muted-foreground mb-2">{session.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatDate(session.scheduledDate)}</span>
                          {session.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>About This Cohort</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Course Overview</h3>
                    {course ? (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">{course.post_excerpt}</p>
                        <div className="text-xs text-muted-foreground">
                          <p>Instructor: TBD</p>
                          <p>Difficulty: Intermediate</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading course information...</p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Enrollment Information</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Enrollment Deadline: {formatDate(cohort.enrollmentDeadline)}</p>
                      <p>Maximum Students: {cohort.maxStudents}</p>
                      <p>Current Enrollments: {cohort.currentEnrollments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
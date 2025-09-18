import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Edit, 
  Users, 
  Calendar, 
  Clock, 
  BookOpen,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Settings
} from 'lucide-react';
import { cohortService } from '@/services/cohortService';
import { courseService } from '@/services/courseService';
import { Cohort, CohortEnrollment } from '@/types/cohort';

export function CohortDetailPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [enrollments, setEnrollments] = useState<CohortEnrollment[]>([]);
  const [courseName, setCourseName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cohortId) {
      loadCohortDetails();
    }
  }, [cohortId]);

  const loadCohortDetails = async () => {
    if (!cohortId) return;
    
    try {
      const [cohortData, enrollmentData] = await Promise.all([
        cohortService.getCohortById(cohortId),
        cohortService.getCohortEnrollments(cohortId)
      ]);

      if (cohortData) {
        setCohort(cohortData);
        setEnrollments(enrollmentData);
        
        // Load course name
        const course = await courseService.getCourseById(cohortData.courseId);
        if (course) {
          setCourseName(course?.title);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cohort details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'default';
      case 'open':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'draft':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Cohort not found</h1>
          <Button onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{cohort.name}</h1>
          <p className="text-muted-foreground">{courseName}</p>
        </div>
        <Button onClick={() => navigate(`/admin/cohort/${cohort.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Cohort
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusColor(cohort.status)}>
              {cohort.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cohort.currentEnrollments}/{cohort.maxStudents}
            </div>
            <Progress 
              value={(cohort.currentEnrollments / cohort.maxStudents) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cohort.weeklySchedule.length}</div>
            <p className="text-xs text-muted-foreground">weeks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cohort.liveSessionSchedule.length}</div>
            <p className="text-xs text-muted-foreground">sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="sessions">Live Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cohort Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cohort?.description || 'No description provided'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(cohort?.startDate)?.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(cohort?.endDate)?.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Enrollment Deadline</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(cohort?.enrollmentDeadline)?.toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Enrollment Rate</span>
                    <span>{Math.round((cohort.currentEnrollments / cohort.maxStudents) * 100)}%</span>
                  </div>
                  <Progress value={(cohort.currentEnrollments / cohort.maxStudents) * 100} />
                  
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Students</span>
                      <span>{enrollments.filter(e => e.status === 'active').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Completed</span>
                      <span>{enrollments.filter(e => e.status === 'completed').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Dropped</span>
                      <span>{enrollments.filter(e => e.status === 'dropped').length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                Manage student enrollments and track progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No students enrolled</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Students will appear here once they enroll in this cohort.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">
                          {enrollment.userId}
                        </TableCell>
                        <TableCell>
                          {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={enrollment.progress.completionPercentage} 
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {Math.round(enrollment.progress.completionPercentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            enrollment.status === 'active' ? 'default' : 
                            enrollment.status === 'completed' ? 'outline' : 'destructive'
                          }>
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(enrollment.progress.lastActivityDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>
                Content unlock schedule for this cohort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cohort.weeklySchedule.map((week, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Week {week.weekNumber}</Badge>
                          <h3 className="font-semibold">{week.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {week.description || 'No description'}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Unlock Date:</span>
                            <p className="text-muted-foreground">
                              {new Date(week.unlockDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Estimated Hours:</span>
                            <p className="text-muted-foreground">{week.estimatedHours}h</p>
                          </div>
                        </div>
                      </div>
                      {week.isRequired && (
                        <Badge variant="secondary">Required</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Live Sessions</CardTitle>
              <CardDescription>
                Scheduled live sessions for this cohort
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohort.liveSessionSchedule.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No live sessions</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Live sessions will appear here when scheduled.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cohort.liveSessionSchedule.map((session, index) => (
                    <Card key={session.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{session.title}</h3>
                            <Badge variant={
                              session.status === 'completed' ? 'outline' :
                              session.status === 'live' ? 'default' :
                              session.status === 'scheduled' ? 'secondary' : 'destructive'
                            }>
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {session.description || 'No description'}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Date & Time:</span>
                              <p className="text-muted-foreground">
                                {new Date(session?.scheduledDate)?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span>
                              <p className="text-muted-foreground">{session.duration} minutes</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.isRequired && (
                            <Badge variant="secondary">Required</Badge>
                          )}
                          {session.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : session.status === 'cancelled' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CohortDetailPage;
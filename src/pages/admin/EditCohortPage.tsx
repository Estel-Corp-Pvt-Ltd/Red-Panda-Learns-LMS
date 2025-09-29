import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Calendar, Users, Clock, Loader2 } from 'lucide-react';
import { cohortService } from '@/services/cohortService';
import { courseService } from '@/services/courseService';
import { Course } from '@/types/course';
import { WeeklyModule, LiveSession } from '@/types/cohort';

const cohortSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  name: z.string().min(1, 'Cohort name is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  enrollmentDeadline: z.string().min(1, 'Enrollment deadline is required'),
  maxStudents: z.number().min(1, 'Maximum students must be at least 1'),
  instructorId: z.string().min(1, 'Instructor is required'),
  status: z.enum(['draft', 'open', 'in-progress', 'completed', 'cancelled']),
  weeklySchedule: z.array(z.object({
    weekNumber: z.number(),
    title: z.string().min(1, 'Week title is required'),
    description: z.string().optional(),
    unlockDate: z.string().min(1, 'Unlock date is required'),
    topicIds: z.array(z.string()),
    estimatedHours: z.number().min(1, 'Estimated hours required')
  })),
  liveSessionSchedule: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, 'Session title is required'),
    description: z.string().optional(),
    scheduledDate: z.string().min(1, 'Session date is required'),
    duration: z.number().min(15, 'Duration must be at least 15 minutes'),
    isRequired: z.boolean(),
    status: z.enum(['scheduled', 'live', 'completed', 'cancelled'])
  }))
});

type CohortFormData = z.infer<typeof cohortSchema>;

export function EditCohortPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const form = useForm<CohortFormData>({
    resolver: zodResolver(cohortSchema),
    defaultValues: {
      courseId: '',
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      enrollmentDeadline: '',
      maxStudents: 30,
      instructorId: '',
      status: 'draft',
      weeklySchedule: [],
      liveSessionSchedule: []
    }
  });

  const { fields: weekFields, append: appendWeek, remove: removeWeek } = useFieldArray({
    control: form.control,
    name: 'weeklySchedule'
  });

  const { fields: sessionFields, append: appendSession, remove: removeSession } = useFieldArray({
    control: form.control,
    name: 'liveSessionSchedule'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!cohortId) return;
    
    try {
      const [coursesList, cohortData] = await Promise.all([
        courseService.getAllCourses(),
        cohortService.getCohortById(cohortId)
      ]);
      
      setCourses(coursesList);

      if (cohortData) {
        // Convert dates to string format for form inputs
        const formatDate = (date: Date) => {
          return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        };

        form.reset({
          courseId: cohortData.courseId,
          name: cohortData.name,
          description: cohortData.description || '',
          startDate: formatDate(cohortData.startDate),
          endDate: formatDate(cohortData.endDate),
          enrollmentDeadline: formatDate(cohortData.enrollmentDeadline),
          maxStudents: cohortData.maxStudents,
          instructorId: cohortData.instructorId,
          status: cohortData.status,
          weeklySchedule: cohortData.weeklySchedule.map(week => ({
            ...week,
            unlockDate: formatDate(week.unlockDate),
            topicIds: week.topicIds || []
          })),
          liveSessionSchedule: cohortData.liveSessionSchedule.map(session => ({
            ...session,
            scheduledDate: formatDate(session.scheduledDate)
          }))
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cohort data',
        variant: 'destructive'
      });
    } finally {
      setPageLoading(false);
    }
  };

  const onSubmit = async (data: CohortFormData) => {
    if (!cohortId) return;
    
    setIsLoading(true);
    try {
      // Convert date strings to Date objects
      const cohortData = {
        courseId: data.courseId,
        name: data.name,
        description: data.description || '',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        enrollmentDeadline: new Date(data.enrollmentDeadline),
        maxStudents: data.maxStudents,
        status: data.status,
        instructorId: data.instructorId,
        weeklySchedule: data.weeklySchedule.map(week => ({
          ...week,
          unlockDate: new Date(week.unlockDate),
          isRequired: true
        })) as WeeklyModule[],
        liveSessionSchedule: data.liveSessionSchedule.map(session => ({
          ...session,
          scheduledDate: new Date(session.scheduledDate)
        })) as LiveSession[]
      };

      await cohortService.updateCohort(cohortId, cohortData);
      
      toast({
        title: 'Success',
        description: 'Cohort updated successfully'
      });
      
      navigate(`/admin/cohort/${cohortId}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update cohort',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addWeek = () => {
    const nextWeekNumber = weekFields.length + 1;
    appendWeek({
      weekNumber: nextWeekNumber,
      title: `Week ${nextWeekNumber}`,
      description: '',
      unlockDate: '',
      topicIds: [],
      estimatedHours: 8
    });
  };

  const addLiveSession = () => {
    appendSession({
      id: crypto.randomUUID(),
      title: 'Live Session',
      description: '',
      scheduledDate: '',
      duration: 60,
      isRequired: false,
      status: 'scheduled'
    });
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(`/admin/cohort/${cohortId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Cohort</h1>
          <p className="text-muted-foreground">Update cohort settings and schedule</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Configure the basic settings for your cohort
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cohort Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Python Bootcamp - July 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this cohort and what makes it special"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="open">Open for Enrollment</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="enrollmentDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enrollment Deadline</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxStudents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Students</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instructorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructor ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Instructor user ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                Configure the weekly content unlock schedule for your cohort
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {weekFields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <CardTitle>Week {field.weekNumber}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => removeWeek(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`weeklySchedule.${index}.title` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Week Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Introduction to Python" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`weeklySchedule.${index}.estimatedHours` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 8" 
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`weeklySchedule.${index}.description` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Week Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Overview of Python syntax and data structures" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`weeklySchedule.${index}.unlockDate` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unlock Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Card>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addWeek}>
                <Plus className="h-4 w-4 mr-2" />
                Add Week
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Live Sessions
              </CardTitle>
              <CardDescription>
                Schedule and manage live sessions for your cohort
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionFields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <CardTitle>{field.title}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => removeSession(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`liveSessionSchedule.${index}.title` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Q&A Session" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`liveSessionSchedule.${index}.duration` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 60" 
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`liveSessionSchedule.${index}.description` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Discuss course concepts and answer student questions" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`liveSessionSchedule.${index}.scheduledDate` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheduled Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`liveSessionSchedule.${index}.status` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`liveSessionSchedule.${index}.isRequired` as const}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-4 space-y-0">
                        <div className="space-y-0.5">
                          <FormLabel>Required Session</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Mark this session as required for all students.
                          </p>
                        </div>
                        <FormControl>
                          <Input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </Card>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addLiveSession}>
                <Plus className="h-4 w-4 mr-2" />
                Add Live Session
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Cohort
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/admin/cohort/${cohortId}`)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default EditCohortPage;

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Calendar, Users, Clock } from 'lucide-react';
import { cohortService } from '@/services/cohortService';
import { courseService } from '@/services/courseService';
import { Course } from '@/services/courseService';
import { WeeklyModule, LiveSession } from '@/types/cohort';

const cohortSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  name: z.string().min(1, 'Cohort name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or greater'),
  currency: z.enum(['USD', 'INR']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  enrollmentDeadline: z.string().min(1, 'Enrollment deadline is required'),
  maxStudents: z.number().min(1, 'Maximum students must be at least 1'),
  instructorId: z.string().min(1, 'Instructor is required'),
  weeklySchedule: z.array(z.object({
    weekNumber: z.number(),
    title: z.string().min(1, 'Week title is required'),
    description: z.string().optional(),
    unlockDate: z.string().min(1, 'Unlock date is required'),
    topicIds: z.array(z.string()),
    estimatedHours: z.number().min(1, 'Estimated hours required')
  })),
  liveSessionSchedule: z.array(z.object({
    title: z.string().min(1, 'Session title is required'),
    description: z.string().optional(),
    scheduledDate: z.string().min(1, 'Session date is required'),
    duration: z.number().min(15, 'Duration must be at least 15 minutes'),
    isRequired: z.boolean()
  }))
});

type CohortFormData = z.infer<typeof cohortSchema>;

export function CreateCohortPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const { toast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const form = useForm<CohortFormData>({
    resolver: zodResolver(cohortSchema),
    defaultValues: {
      courseId: courseId || '',
      name: '',
      description: '',
      price: 0,
      currency: 'USD' as const,
      startDate: '',
      endDate: '',
      enrollmentDeadline: '',
      maxStudents: 30,
      instructorId: '',
      weeklySchedule: [
        {
          weekNumber: 1,
          title: 'Week 1: Introduction',
          description: '',
          unlockDate: '',
          topicIds: [],
          estimatedHours: 8
        }
      ],
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
    loadCourses();
  }, []);

  useEffect(() => {
    if (courseId && courses.length > 0) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setSelectedCourse(course);
        form.setValue('courseId', courseId);
      }
    }
  }, [courseId, courses, form]);

  const loadCourses = async () => {
    try {
      const coursesList = await courseService.getAllCourses();
      setCourses(coursesList);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive'
      });
    }
  };

  const onSubmit = async (data: CohortFormData) => {
    setIsLoading(true);
    try {
      // Convert date strings to Date objects
      const cohortData = {
        courseId: data.courseId,
        name: data.name,
        description: data.description || '',
        price: data.price || 0,
        currency: data.currency || 'USD' as 'USD' | 'INR',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        enrollmentDeadline: new Date(data.enrollmentDeadline),
        maxStudents: data.maxStudents,
        status: 'open' as const,
        instructorId: data.instructorId,
        weeklySchedule: data.weeklySchedule.map(week => ({
          ...week,
          unlockDate: new Date(week.unlockDate),
          isRequired: true
        })) as WeeklyModule[],
        liveSessionSchedule: data.liveSessionSchedule.map(session => ({
          id: crypto.randomUUID(),
          ...session,
          scheduledDate: new Date(session.scheduledDate),
          status: 'scheduled' as const
        })) as LiveSession[]
      };

      await cohortService.createCohort(cohortData);
      
      toast({
        title: 'Success',
        description: 'Cohort created successfully'
      });
      
      navigate('/admin');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create cohort',
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
      title: 'Live Session',
      description: '',
      scheduledDate: '',
      duration: 60,
      isRequired: false
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Cohort</h1>
          <p className="text-muted-foreground">Set up a cohort-based learning experience</p>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {/* Price and Currency Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="99.99"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Set the cohort enrollment price (use 0 for free)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                Define the week-by-week content unlock schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weekFields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline">Week {index + 1}</Badge>
                      {weekFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWeek(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`weeklySchedule.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Week Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`weeklySchedule.${index}.unlockDate`}
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

                      <FormField
                        control={form.control}
                        name={`weeklySchedule.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`weeklySchedule.${index}.estimatedHours`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Hours</FormLabel>
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
                    </div>
                  </Card>
                ))}

                <Button type="button" variant="outline" onClick={addWeek}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Week
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Live Sessions
              </CardTitle>
              <CardDescription>
                Schedule live interactive sessions with students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessionFields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline">Session {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSession(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`liveSessionSchedule.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`liveSessionSchedule.${index}.scheduledDate`}
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
                        name={`liveSessionSchedule.${index}.duration`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (minutes)</FormLabel>
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
                        name={`liveSessionSchedule.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                ))}

                <Button type="button" variant="outline" onClick={addLiveSession}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Live Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/admin/dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Cohort'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
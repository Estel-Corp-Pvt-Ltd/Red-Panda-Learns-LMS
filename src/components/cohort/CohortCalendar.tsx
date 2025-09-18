import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, Calendar as CalendarIcon, Users, BookOpen, FileText } from 'lucide-react';
import { format, isSameDay, isAfter, isBefore } from 'date-fns';
import { Cohort, LiveSession, Assignment } from '@/types/cohort';
import { cohortService } from '@/services/cohortService';

interface CohortCalendarProps {
  cohort: Cohort;
  userId?: string;
}

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  type: 'content-unlock' | 'assignment-due' | 'live-session' | 'enrollment-deadline';
  description?: string;
  status?: 'upcoming' | 'active' | 'completed' | 'overdue';
  metadata?: any;
}

export const CohortCalendar: React.FC<CohortCalendarProps> = ({ cohort, userId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCohortData();
  }, [cohort.id]);

  const loadCohortData = async () => {
    try {
      setLoading(true);
      
      // Load live sessions
      const sessions = await cohortService.getUpcomingLiveSessions(cohort.id);
      setLiveSessions(sessions);

      // Load assignments for all weeks
      const allAssignments: Assignment[] = [];
      for (const module of cohort.weeklySchedule) {
        const weekAssignments = await cohortService.getAssignmentsByWeek(cohort.id, module.weekNumber);
        allAssignments.push(...weekAssignments);
      }
      setAssignments(allAssignments);

      // Generate calendar events
      generateCalendarEvents(sessions, allAssignments);
    } catch (error) {
      console.error('Error loading cohort data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarEvents = (sessions: LiveSession[], assignments: Assignment[]) => {
    const calendarEvents: CalendarEvent[] = [];
    const now = new Date();

    // Add content unlock events
    cohort.weeklySchedule.forEach(module => {
      const status = isBefore(module.unlockDate, now) ? 'completed' : 'upcoming';
      calendarEvents.push({
        id: `unlock-${module.weekNumber}`,
        date: module.unlockDate,
        title: `Week ${module.weekNumber}: ${module.title}`,
        type: 'content-unlock',
        description: module.description,
        status,
        metadata: { weekNumber: module.weekNumber, module }
      });
    });

    // Add live session events
    sessions.forEach(session => {
      let status: 'upcoming' | 'active' | 'completed' | 'overdue' = 'upcoming';
      if (session.status === 'completed') status = 'completed';
      else if (session.status === 'live') status = 'active';
      else if (isBefore(session.scheduledDate, now)) status = 'overdue';

      calendarEvents.push({
        id: `session-${session.id}`,
        date: session.scheduledDate,
        title: session.title,
        type: 'live-session',
        description: session.description,
        status,
        metadata: { session }
      });
    });

    // Add assignment due dates
    assignments.forEach(assignment => {
      let status: 'upcoming' | 'active' | 'completed' | 'overdue' = 'upcoming';
      if (isBefore(assignment.dueDate, now)) status = 'overdue';
      else if (isBefore(new Date(assignment.dueDate.getTime() - 24 * 60 * 60 * 1000), now)) status = 'active';

      calendarEvents.push({
        id: `assignment-${assignment.id}`,
        date: assignment.dueDate,
        title: `Due: ${assignment.title}`,
        type: 'assignment-due',
        description: assignment.description,
        status,
        metadata: { assignment }
      });
    });

    // Add enrollment deadline
    if (isAfter(cohort.enrollmentDeadline, now)) {
      calendarEvents.push({
        id: 'enrollment-deadline',
        date: cohort.enrollmentDeadline,
        title: 'Enrollment Deadline',
        type: 'enrollment-deadline',
        description: 'Last day to enroll in this cohort',
        status: 'upcoming'
      });
    }

    setEvents(calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime()));
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'content-unlock': return 'bg-blue-500';
      case 'assignment-due': return 'bg-red-500';
      case 'live-session': return 'bg-green-500';
      case 'enrollment-deadline': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeBadge = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'content-unlock': return 'default';
      case 'assignment-due': return 'destructive';
      case 'live-session': return 'secondary';
      case 'enrollment-deadline': return 'outline';
      default: return 'default';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'content-unlock': return <BookOpen className="h-4 w-4" />;
      case 'assignment-due': return <FileText className="h-4 w-4" />;
      case 'live-session': return <Users className="h-4 w-4" />;
      case 'enrollment-deadline': return <CalendarIcon className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const upcomingEvents = events.filter(event => 
    isAfter(event.date, new Date()) && event.status !== 'completed'
  ).slice(0, 5);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cohort Calendar</CardTitle>
          <CardDescription>Loading cohort schedule...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cohort Calendar</CardTitle>
          <CardDescription>
            View your cohort schedule, content unlock dates, and important deadlines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                    modifiers={{
                      hasEvents: (date) => getEventsForDate(date).length > 0
                    }}
                    modifiersStyles={{
                      hasEvents: { 
                        backgroundColor: 'hsl(var(--primary))', 
                        color: 'hsl(var(--primary-foreground))' 
                      }
                    }}
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">
                      {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>
                    {selectedDateEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events scheduled</p>
                    ) : (
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {selectedDateEvents.map(event => (
                            <div key={event.id} className="flex items-start gap-2 p-2 rounded-lg border">
                              {getEventIcon(event.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(event.date, 'h:mm a')}
                                </p>
                                <Badge variant={getEventTypeBadge(event.type)}>
                                  {event.type.replace('-', ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold mb-2">Upcoming Events</h3>
                    {upcomingEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upcoming events</p>
                    ) : (
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {upcomingEvents.map(event => (
                            <div key={event.id} className="flex items-start gap-2 p-2 rounded-lg border">
                              {getEventIcon(event.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(event.date, 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={event.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`} />
                        {index < events.length - 1 && <div className="w-px h-8 bg-border mt-2" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          {getEventIcon(event.type)}
                          <h4 className="font-medium">{event.title}</h4>
                        <Badge variant={getEventTypeBadge(event.type)}>
                          {event.type.replace('-', ' ')}
                        </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {format(event.date, 'EEEE, MMMM d, yyyy - h:mm a')}
                        </p>
                        {event.description && (
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
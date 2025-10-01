import { FieldValue, Timestamp } from "firebase-admin/firestore";

export interface Cohort {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  price: number;
  currency: 'INR' | 'USD';
  startDate: Timestamp | FieldValue;
  endDate: Timestamp | FieldValue ;
  enrollmentDeadline: Timestamp ;
  maxStudents: number;
  currentEnrollments: number;
  status: 'draft' | 'open' | 'in-progress' | 'completed' | 'cancelled';
  instructorId: string;
  weeklySchedule: WeeklyModule[];
  liveSessionSchedule: LiveSession[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface WeeklyModule {
  weekNumber: number;
  title: string;
  description?: string;
  unlockDate: Timestamp | FieldValue;
  topicIds: string[];
  assignmentIds?: string[];
  isRequired: boolean;
  estimatedHours: number;
}

export interface LiveSession {
  id: string;
  title: string;
  description?: string;
  scheduledDate:Timestamp | FieldValue;
  duration: number; // in minutes
  meetingLink?: string;
  recordingLink?: string;
  isRequired: boolean;
  maxAttendees?: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}

export interface CohortEnrollment {
  id: string;
  userId: string;
  cohortId: string;
  courseId: string;
  enrollmentDate: Timestamp | FieldValue;
  paymentId?: string;
  paymentProvider?: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  progress: CohortProgress;
  completedLessons: string[];
  completedAssignments: string[];
  attendedSessions: string[];
}

export interface CohortProgress {
  currentWeek: number;
  completionPercentage: number;
  weeklyProgress: {
    weekNumber: number;
    isUnlocked: boolean;
    isCompleted: boolean;
    completionDate?: Timestamp | FieldValue;
    lessonsCompleted: number;
    totalLessons: number;
  }[];
  lastActivityDate: Timestamp | FieldValue;
}

export interface Assignment {
  id: string;
  cohortId: string;
  weekNumber: number;
  title: string;
  description: string;
  instructions: string;
  dueDate: Timestamp | FieldValue;
  maxPoints: number;
  submissionType: 'text' | 'file' | 'link' | 'code';
  isRequired: boolean;
  allowLateSubmission: boolean;
  status: 'draft' | 'published' | 'closed';
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  cohortId: string;
  submissionDate: Date;
  content: string;
  fileUrls?: string[];
  status: 'submitted' | 'graded' | 'returned';
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedDate?: Date;
}

export interface CohortNotification {
  id: string;
  cohortId: string;
  userId?: string; // if null, send to all cohort members
  type: 'announcement' | 'reminder' | 'content-unlock' | 'assignment-due' | 'session-starting';
  title: string;
  message: string;
  scheduledDate: Timestamp | FieldValue;
  sentDate?: Timestamp | FieldValue;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

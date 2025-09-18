import { 
  Cohort, 
  CohortEnrollment, 
  WeeklyModule, 
  LiveSession, 
  Assignment, 
  AssignmentSubmission,
  CohortProgress,
  CohortNotification 
} from '../types/cohort';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

class CohortService {
  // Cohort CRUD Operations
  async createCohort(cohortData: Omit<Cohort, 'id' | 'createdAt' | 'updatedAt' | 'currentEnrollments'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'cohorts'), {
      ...cohortData,
      currentEnrollments: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  }

  async updateCohort(cohortId: string, updates: Partial<Cohort>): Promise<void> {
    const cohortRef = doc(db, 'cohorts', cohortId);
    await setDoc(cohortRef, {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async getCohortById(cohortId: string): Promise<Cohort | null> {
    const docRef = doc(db, 'cohorts', cohortId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        enrollmentDeadline: data.enrollmentDeadline?.toDate() || new Date()
      } as Cohort;
    }
    return null;
  }

  async getAllCohorts(): Promise<Cohort[]> {
    const querySnapshot = await getDocs(collection(db, 'cohorts'));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        enrollmentDeadline: data.enrollmentDeadline?.toDate() || new Date()
      } as Cohort;
    });
  }

  async getCohortsByCourse(courseId: string): Promise<Cohort[]> {
    const q = query(
      collection(db, 'cohorts'),
      where('courseId', '==', courseId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        enrollmentDeadline: data.enrollmentDeadline?.toDate() || new Date()
      } as Cohort;
    });
  }

  async getActiveCohorts(): Promise<Cohort[]> {
    const q = query(
      collection(db, 'cohorts'),
      where('status', 'in', ['open', 'in-progress'])
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        enrollmentDeadline: data.enrollmentDeadline?.toDate() || new Date()
      } as Cohort;
    });
  }

  async deleteCohort(cohortId: string): Promise<void> {
    await deleteDoc(doc(db, 'cohorts', cohortId));
  }

  // Cohort Enrollment Management
  async enrollUserInCohort(
    userId: string, 
    cohortId: string, 
    paymentId?: string, 
    paymentProvider?: string
  ): Promise<void> {
    const cohort = await this.getCohortById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Check enrollment limits
    if (cohort.currentEnrollments >= cohort.maxStudents) {
      throw new Error('Cohort is full');
    }

    // Check enrollment deadline
    if (new Date() > cohort.enrollmentDeadline) {
      throw new Error('Enrollment deadline has passed');
    }

    const enrollmentData: Omit<CohortEnrollment, 'id'> = {
      userId,
      cohortId,
      courseId: cohort.courseId,
      enrollmentDate: new Date(),
      paymentId: paymentId || null,
      paymentProvider: paymentProvider || null,
      status: 'active',
      progress: this.initializeCohortProgress(cohort.weeklySchedule),
      completedLessons: [],
      completedAssignments: [],
      attendedSessions: []
    };

    await addDoc(collection(db, 'cohort_enrollments'), enrollmentData);

    // Update cohort enrollment count
    await this.updateCohort(cohortId, {
      currentEnrollments: cohort.currentEnrollments + 1
    });
  }

  async checkCohortEnrollment(userId: string, cohortId: string): Promise<boolean> {
    const q = query(
      collection(db, 'cohort_enrollments'),
      where('userId', '==', userId),
      where('cohortId', '==', cohortId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0;
  }

  async getUserCohortEnrollments(userId: string): Promise<CohortEnrollment[]> {
    const q = query(
      collection(db, 'cohort_enrollments'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CohortEnrollment[];
  }

  async getCohortEnrollments(cohortId: string): Promise<CohortEnrollment[]> {
    const q = query(
      collection(db, 'cohort_enrollments'),
      where('cohortId', '==', cohortId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CohortEnrollment[];
  }

  // Content Access Control
  async isContentUnlocked(userId: string, cohortId: string, weekNumber: number): Promise<boolean> {
    const cohort = await this.getCohortById(cohortId);
    if (!cohort) return false;

    const enrollment = await this.getUserCohortEnrollment(userId, cohortId);
    if (!enrollment) return false;

    const weekModule = cohort.weeklySchedule.find(w => w.weekNumber === weekNumber);
    if (!weekModule) return false;

    return new Date() >= weekModule.unlockDate;
  }

  async updateProgress(userId: string, cohortId: string, lessonId: string): Promise<void> {
    const enrollment = await this.getUserCohortEnrollment(userId, cohortId);
    if (!enrollment) return;

    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
      
      // Update progress
      enrollment.progress = await this.calculateProgress(enrollment, cohortId);
      enrollment.progress.lastActivityDate = new Date();

      const enrollmentRef = doc(db, 'cohort_enrollments', enrollment.id);
      await setDoc(enrollmentRef, enrollment, { merge: true });
    }
  }

  // Weekly Module Management
  async addWeeklyModule(cohortId: string, moduleData: WeeklyModule): Promise<void> {
    const cohort = await this.getCohortById(cohortId);
    if (!cohort) throw new Error('Cohort not found');

    cohort.weeklySchedule.push(moduleData);
    await this.updateCohort(cohortId, { weeklySchedule: cohort.weeklySchedule });
  }

  async updateWeeklyModule(cohortId: string, weekNumber: number, updates: Partial<WeeklyModule>): Promise<void> {
    const cohort = await this.getCohortById(cohortId);
    if (!cohort) throw new Error('Cohort not found');

    const moduleIndex = cohort.weeklySchedule.findIndex(m => m.weekNumber === weekNumber);
    if (moduleIndex === -1) throw new Error('Weekly module not found');

    cohort.weeklySchedule[moduleIndex] = { ...cohort.weeklySchedule[moduleIndex], ...updates };
    await this.updateCohort(cohortId, { weeklySchedule: cohort.weeklySchedule });
  }

  // Live Session Management
  async addLiveSession(cohortId: string, sessionData: Omit<LiveSession, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'live_sessions'), {
      ...sessionData,
      cohortId
    });

    const cohort = await this.getCohortById(cohortId);
    if (cohort) {
      cohort.liveSessionSchedule.push({ ...sessionData, id: docRef.id });
      await this.updateCohort(cohortId, { liveSessionSchedule: cohort.liveSessionSchedule });
    }

    return docRef.id;
  }

  async updateLiveSession(sessionId: string, updates: Partial<LiveSession>): Promise<void> {
    const sessionRef = doc(db, 'live_sessions', sessionId);
    await setDoc(sessionRef, updates, { merge: true });
  }

  async getLiveSession(sessionId: string): Promise<LiveSession | null> {
    const docRef = doc(db, 'live_sessions', sessionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as LiveSession;
    }
    return null;
  }

  async getUpcomingLiveSessions(cohortId: string): Promise<LiveSession[]> {
    const now = new Date();
    const q = query(
      collection(db, 'live_sessions'),
      where('cohortId', '==', cohortId),
      where('scheduledDate', '>=', now),
      where('status', '==', 'scheduled')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LiveSession[];
  }

  // Assignment Management
  async createAssignment(assignmentData: Omit<Assignment, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'assignments'), assignmentData);
    return docRef.id;
  }

  async getAssignmentsByWeek(cohortId: string, weekNumber: number): Promise<Assignment[]> {
    const q = query(
      collection(db, 'assignments'),
      where('cohortId', '==', cohortId),
      where('weekNumber', '==', weekNumber)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Assignment[];
  }

  async submitAssignment(submissionData: Omit<AssignmentSubmission, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'assignment_submissions'), submissionData);
    return docRef.id;
  }

  // Notification Management
  async createNotification(notificationData: Omit<CohortNotification, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'cohort_notifications'), notificationData);
    return docRef.id;
  }

  async getUserNotifications(userId: string, cohortId: string): Promise<CohortNotification[]> {
    const q = query(
      collection(db, 'cohort_notifications'),
      where('cohortId', '==', cohortId),
      where('userId', 'in', [userId, null])
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CohortNotification[];
  }

  // Helper Methods
  private async getUserCohortEnrollment(userId: string, cohortId: string): Promise<CohortEnrollment | null> {
    const q = query(
      collection(db, 'cohort_enrollments'),
      where('userId', '==', userId),
      where('cohortId', '==', cohortId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0 ? {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as CohortEnrollment : null;
  }

  private initializeCohortProgress(weeklySchedule: WeeklyModule[]): CohortProgress {
    return {
      currentWeek: 1,
      completionPercentage: 0,
      weeklyProgress: weeklySchedule.map(week => ({
        weekNumber: week.weekNumber,
        isUnlocked: week.weekNumber === 1,
        isCompleted: false,
        lessonsCompleted: 0,
        totalLessons: week.topicIds.length
      })),
      lastActivityDate: new Date()
    };
  }

  private async calculateProgress(enrollment: CohortEnrollment, cohortId: string): Promise<CohortProgress> {
    const cohort = await this.getCohortById(cohortId);
    if (!cohort) return enrollment.progress;

    const totalLessons = cohort.weeklySchedule.reduce((sum, week) => sum + week.topicIds.length, 0);
    const completedLessons = enrollment.completedLessons.length;
    const completionPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const weeklyProgress = cohort.weeklySchedule.map(week => {
      const weekLessonsCompleted = enrollment.completedLessons.filter(lessonId => 
        week.topicIds.includes(lessonId)
      ).length;
      
      return {
        weekNumber: week.weekNumber,
        isUnlocked: new Date() >= week.unlockDate,
        isCompleted: weekLessonsCompleted === week.topicIds.length,
        completionDate: weekLessonsCompleted === week.topicIds.length ? new Date() : undefined,
        lessonsCompleted: weekLessonsCompleted,
        totalLessons: week.topicIds.length
      };
    });

    const currentWeek = weeklyProgress.findIndex(w => w.isUnlocked && !w.isCompleted) + 1 || 1;

    return {
      currentWeek,
      completionPercentage,
      weeklyProgress,
      lastActivityDate: new Date()
    };
  }
}

export const cohortService = new CohortService();
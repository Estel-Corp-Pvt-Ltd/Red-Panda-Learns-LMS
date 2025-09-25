import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Cohort } from '@/types/course';
export const cohortsApi = {
  // Get all cohorts with optional ordering and pagination params
  getCohorts: async (params?: {
    order?: 'asc' | 'desc';
    orderby?: keyof Omit<Cohort, 'description' | 'topicIds' | 'createdAt' | 'updatedAt'>; // fields allowed for ordering
    per_page?: number; // pagination can be implemented if needed later
    page?: number;
  }) => {
    const orderField = params?.orderby || 'id';
    const orderDirection = params?.order || 'desc';

    const q = query(collection(db, 'Cohorts'), orderBy(orderField, orderDirection));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title,
        description: data.description || '',
        topicIds: data.topicIds || [],
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        enrollmentOpen: data.enrollmentOpen ?? false,
        maxStudents: data.maxStudents ?? null,
        requireEnrollment: data.requireEnrollment ?? false,
        requireCohortAccess: data.requireCohortAccess ?? false,
        cohortEnrollments: data.cohortEnrollments ?? 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        courseId: data.courseId || null, // if you add courseId to schema
      };
    });
  },

  // Get single cohort by ID
  getCohort: async (cohortId: string) => {
    const cohortRef = doc(db, 'Cohorts', cohortId);
    const cohortSnap = await getDoc(cohortRef);

    if (!cohortSnap.exists()) throw new Error('Cohort not found');

    const data = cohortSnap.data();

    return {
      id: cohortSnap.id,
      title: data.title,
      description: data.description || '',
      topicIds: data.topicIds || [],
      startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
      endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
      enrollmentOpen: data.enrollmentOpen ?? false,
      maxStudents: data.maxStudents ?? null,
      requireEnrollment: data.requireEnrollment ?? false,
      requireCohortAccess: data.requireCohortAccess ?? false,
      cohortEnrollments: data.cohortEnrollments ?? 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      courseId: data.courseId || null,
    };
  },

  // Get cohorts by course ID (requires courseId field in Cohort documents)
  getCohortsByCourse: async (courseId: string) => {
    const q = query(collection(db, 'Cohorts'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title,
        description: data.description || '',
        topicIds: data.topicIds || [],
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        enrollmentOpen: data.enrollmentOpen ?? false,
        maxStudents: data.maxStudents ?? null,
        requireEnrollment: data.requireEnrollment ?? false,
        requireCohortAccess: data.requireCohortAccess ?? false,
        cohortEnrollments: data.cohortEnrollments ?? 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        courseId: data.courseId || null,
      };
    });
  },
};

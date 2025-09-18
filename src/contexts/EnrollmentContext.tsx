import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enrollmentService } from '@/services/dummyEnrollmentService';
import { Enrollment } from '@/types/enrollment';
import { ENROLLED_PROGRAM_TYPE, ENROLLMENT_STATUS } from '@/constants';

interface EnrollmentContextType {
  enrollments: Enrollment[];
  isEnrolled: (courseId: string) => boolean;
  enrollInCourse: (courseId: string, paymentId?: string, paymentProvider?: string) => Promise<void>;
  refreshEnrollments: () => Promise<void>;
  loading: boolean;
};

const EnrollmentContext = createContext<EnrollmentContextType | undefined>(undefined);

export const useEnrollment = () => {
  const context = useContext(EnrollmentContext);
  if (context === undefined) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider');
  }
  return context;
};

interface EnrollmentProviderProps {
  children: React.ReactNode;
};

export const EnrollmentProvider: React.FC<EnrollmentProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshEnrollments = useCallback(async () => {
    if (!user) {
      setEnrollments([]);
      return;
    }

    setLoading(true);

    try {
      const userEnrollments = await enrollmentService.getUserEnrollments(user.id);
      setEnrollments(userEnrollments);
    } catch (err: any) {
      console.error('Error fetching enrollments:', err);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isEnrolled = useCallback(
    (courseId: string): boolean => {
      return enrollments.some(
        (enrollment) => String(enrollment.targetId) === String(courseId) && enrollment.status === ENROLLMENT_STATUS.ACTIVE
      );
    },
    [enrollments]
  );

  const enrollInCourse = useCallback(
    async (courseId: string, paymentId?: string, paymentProvider?: string) => {
      if (!user) throw new Error('User not authenticated');
      setLoading(true);

      try {
        // Trigger enrollment via service
        await enrollmentService.enrollUser(user.id, courseId, ENROLLED_PROGRAM_TYPE.COURSE, '1');
      } catch (err: any) {
        console.error('Enrollment failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Initial load
  useEffect(() => {
    refreshEnrollments();
  }, [user]);

  const value = {
    enrollments,
    isEnrolled,
    enrollInCourse,
    refreshEnrollments,
    loading,
  };

  return <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>;
};

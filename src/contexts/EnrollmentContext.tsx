import { ENROLLED_PROGRAM_TYPE, ENROLLMENT_STATUS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { enrollmentService } from '@/services/enrollmentService';
import { Enrollment } from '@/types/enrollment';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
      console.log("Checking enrollment for courseId:", courseId);
      console.log("Current enrollments:", enrollments);

      const result = enrollments.some(
        (enrollment) => {
          const match = String(enrollment.targetId) === String(courseId);
          const statusOk = enrollment.status === ENROLLMENT_STATUS.ACTIVE;

          console.log("Checking enrollment:", {
            targetId: enrollment.targetId,
            courseId,
            match,
            status: enrollment.status,
            statusOk,
          });

          return match && statusOk;
        }
      );

      console.log("Final result for", courseId, "=>", result);
      return result;
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

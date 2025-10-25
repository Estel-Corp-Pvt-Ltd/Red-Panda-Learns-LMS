import { ENROLLED_PROGRAM_TYPE, ENROLLMENT_STATUS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { enrollmentService } from '@/services/enrollmentService';
import { Enrollment } from '@/types/enrollment';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';

interface EnrollmentContextType {
  enrollments: Enrollment[];
  isEnrolled: (courseId: string) => boolean;
  isEnrolledInBundle:(bundleId : string) => boolean;
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

    const result = await enrollmentService.getUserEnrollments(user.id);

    if (result.success) {
      setEnrollments(result.data);
    } else {
      setEnrollments([]);
    }

    setLoading(false);
  }, [user]);

 const isEnrolled = useCallback(
  (courseId: string): boolean => {
    const direct = enrollments.some(
      e => e.targetId === courseId && e.status === ENROLLMENT_STATUS.ACTIVE
    );

    if (direct) return true;

    // check if part of an active bundle
    return enrollments.some(
      e =>
        e.targetType === ENROLLED_PROGRAM_TYPE.BUNDLE  &&
        e.status === ENROLLMENT_STATUS.ACTIVE &&
        e.bundleProgress?.some(bp => bp.courseId === courseId)
    );
  },
  [enrollments]
);

   const isEnrolledInBundle = useCallback(
    (bundleId: string): boolean => {
      const result = enrollments.some(
        (enrollment) => {
          const match = String(enrollment.targetId) === String(bundleId);
          const statusOk = enrollment.status === ENROLLMENT_STATUS.ACTIVE;

          return match && statusOk;
        }
      );

      return result;
    },
    [enrollments]
  );
  useEffect(() => {
    refreshEnrollments();
  }, [user]);

  const value = {
    enrollments,
    isEnrolled,
    isEnrolledInBundle,
    refreshEnrollments,
    loading,
  };

  return <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>;
};

import { ENROLLMENT_STATUS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { enrollmentService } from '@/services/enrollmentService';
import { Enrollment } from '@/types/enrollment';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

interface EnrollmentContextType {
  enrollments: Enrollment[];
  isEnrolled: (courseId: string) => boolean;
  isEnrolledInBundle: (bundleId: string) => boolean;
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
      return enrollments.some(
        e => e.courseId === courseId && e.status === ENROLLMENT_STATUS.ACTIVE
      );
    },
    [enrollments]
  );

  const isEnrolledInBundle = useCallback(
    (bundleId: string): boolean => {
      return enrollments.some(
        (enrollment) =>
          String(enrollment.bundleId) === String(bundleId) &&
          enrollment.status === ENROLLMENT_STATUS.ACTIVE
      );
    },
    [enrollments]
  );

  useEffect(() => {
    refreshEnrollments();
  }, [user]);

  const value = useMemo<EnrollmentContextType>(() => ({
    enrollments,
    isEnrolled,
    isEnrolledInBundle,
    refreshEnrollments,
    loading,
  }), [enrollments, isEnrolled, isEnrolledInBundle, refreshEnrollments, loading]);

  return <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>;
};

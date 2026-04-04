import { useAuth } from '@/contexts/AuthContext';
import { cohortService } from '@/services/cohortService';
import { Enrollment } from '@/types/course'; // Contains Enrollment interface
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface CohortContextType {
  cohortEnrollments: Enrollment[];
  isEnrolledInCohort: (cohortId: string) => boolean;
  refreshCohortEnrollments: () => Promise<void>;
  loading: boolean;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

export const useCohort = (): CohortContextType => {
  const context = useContext(CohortContext);
  if (!context) {
    throw new Error('useCohort must be used within a CohortProvider');
  }
  return context;
};

interface CohortProviderProps {
  children: ReactNode;
}

export const CohortProvider: React.FC<CohortProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [cohortEnrollments, setCohortEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshCohortEnrollments = useCallback(async () => {
    if (!user) {
      setCohortEnrollments([]);
      return;
    }

    setLoading(true);
    try {
      const enrollments = await cohortService.getUserCohortEnrollments(user.id);
      setCohortEnrollments(enrollments);
    } catch (error) {
      console.error('CohortContext - Error fetching cohort enrollments:', error);
      setCohortEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isEnrolledInCohort = useCallback(
    (cohortId: string): boolean => {
      return cohortEnrollments.some(
        (enrollment) =>
          enrollment.cohortId === cohortId && enrollment.status === 'active'
      );
    },
    [cohortEnrollments]
  );

  useEffect(() => {
    refreshCohortEnrollments();
  }, [user]);

  const value = useMemo<CohortContextType>(() => ({
    cohortEnrollments,
    isEnrolledInCohort,
    refreshCohortEnrollments,
    loading,
  }), [cohortEnrollments, isEnrolledInCohort, refreshCohortEnrollments, loading]);

  return (
    <CohortContext.Provider value={value}>
      {children}
    </CohortContext.Provider>
  );
};

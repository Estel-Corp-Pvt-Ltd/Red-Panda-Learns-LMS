import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cohortService } from '@/services/cohortService';
import { CohortEnrollment } from '@/types/cohort';

interface CohortContextType {
  cohortEnrollments: CohortEnrollment[];
  isEnrolledInCohort: (cohortId: string) => boolean;
  isCohortContentUnlocked: (cohortId: string, weekNumber: number) => Promise<boolean>;
  refreshCohortEnrollments: () => Promise<void>;
  loading: boolean;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

export const useCohort = () => {
  const context = useContext(CohortContext);
  if (context === undefined) {
    throw new Error('useCohort must be used within a CohortProvider');
  }
  return context;
};

interface CohortProviderProps {
  children: React.ReactNode;
}

export const CohortProvider: React.FC<CohortProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [cohortEnrollments, setCohortEnrollments] = useState<CohortEnrollment[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCohortEnrollments = async () => {
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
  };

  const isEnrolledInCohort = (cohortId: string): boolean => {
    return cohortEnrollments.some(enrollment =>
      enrollment.cohortId === cohortId && enrollment.status === 'active'
    );
  };

  const isCohortContentUnlocked = async (cohortId: string, weekNumber: number): Promise<boolean> => {
    if (!user) return false;

    try {
      return await cohortService.isContentUnlocked(user.id, cohortId, weekNumber);
    } catch (error) {
      console.error('CohortContext - Error checking content unlock:', error);
      return false;
    }
  };

  useEffect(() => {
    refreshCohortEnrollments();
  }, [user]);

  const value = {
    cohortEnrollments,
    isEnrolledInCohort,
    isCohortContentUnlocked,
    refreshCohortEnrollments,
    loading,
  };

  return <CohortContext.Provider value={value}>{children}</CohortContext.Provider>;
};
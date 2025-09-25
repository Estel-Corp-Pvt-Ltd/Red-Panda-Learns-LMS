import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollment } from '@/contexts/EnrollmentContext';
import { db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Clock } from 'lucide-react';
import { USER_ROLE } from '@/constants';
import { Enrollment } from '@/types/course';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireEnrollment?: boolean;
  requireCohortAccess?: boolean;
  requireAdmin?: boolean;
  weekNumber?: number;
  message?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireEnrollment = false,
  requireCohortAccess = false,
  requireAdmin = false,
  weekNumber,
  message = 'Please login to access this lesson.',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isEnrolled, loading: enrollmentLoading, refreshEnrollments, enrollments } = useEnrollment();
  const location = useLocation();
  const params = useParams();

  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const courseId = params.courseId;
  const cohortId = params.cohortId;

  // Check admin role if required
  useEffect(() => {
    const checkAdminRole = async () => {
      if (requireAdmin && user) {
        try {
          const docSnap = await getDoc(doc(db, 'Users', user.id));
          const data = docSnap.data();
          setIsAdmin(data?.role === USER_ROLE.ADMIN);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(true); // No admin check needed
      }
    };

    checkAdminRole();
  }, [requireAdmin, user]);

  // Refresh enrollments if needed
  useEffect(() => {
    if (requireEnrollment && user && courseId && !enrollmentChecked) {
      refreshEnrollments().finally(() => setEnrollmentChecked(true));
    }
  }, [requireEnrollment, user, courseId, enrollmentChecked, refreshEnrollments]);

  // Find user's enrollment in the cohort
  const userCohortEnrollment: Enrollment | undefined = cohortId
  ? enrollments.find((enr: Enrollment) => enr.cohortId === cohortId && enr.status === 'active')
  : undefined;

  const userIsEnrolled = user && courseId ? isEnrolled(courseId) : false;

  // Loading states
  if (
    authLoading ||
    (requireEnrollment && enrollmentLoading) ||
    (requireEnrollment && user && courseId && !enrollmentChecked) ||
    (requireAdmin && isAdmin === null)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSkeleton className="w-full max-w-4xl h-96" />
      </div>
    );
  }

  // Require login
  if (requireAuth && !user) {
    return (
      <Navigate
        to="/auth/login"
        state={{ from: location, message }}
        replace
      />
    );
  }

  // Require admin
  if (requireAdmin && !isAdmin) {
    return (
      <Navigate
        to="/dashboard"
        state={{ from: location, message: 'You must be an admin to access this page.' }}
        replace
      />
    );
  }

  // Require enrollment
  if (requireEnrollment && courseId && user && !userIsEnrolled) {
    return (
      <Navigate
        to={`/checkout/${courseId}`}
        state={{ from: location, message: 'You need to enroll in this course to access its content.' }}
        replace
      />
    );
  }

  // Require cohort access
  if (requireCohortAccess && cohortId && user) {
    if (!userCohortEnrollment) {
      return (
        <Navigate
          to={`/courses/${courseId}`}
          state={{ from: location, message: 'You need to be enrolled in this cohort to access its content.' }}
          replace
        />
      );
    }
  }

  // If you want to handle locked content per week later, you can add it here

  return <>{children}</>;
};

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollment } from '@/contexts/EnrollmentContext';
import { useCohort } from '@/contexts/CohortContext';
import { db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Lock } from 'lucide-react';
import { USER_ROLE } from '@/constants';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireEnrollment?: boolean;
  requireCohortAccess?: boolean;
  requireAdmin?: boolean; // ✅ New
  weekNumber?: number;
  message?: string;
};

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireEnrollment = false,
  requireCohortAccess = false,
  requireAdmin = false, // ✅ New
  weekNumber,
  message = 'Please login to access this lesson.',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isEnrolled, loading: enrollmentLoading, refreshEnrollments } = useEnrollment();
  const { cohortEnrollments, isCohortContentUnlocked, loading: cohortLoading } = useCohort();
  const location = useLocation();
  const params = useParams();
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [contentUnlocked, setContentUnlocked] = useState<boolean | null>(null);
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
      refreshEnrollments().finally(() => {
        setEnrollmentChecked(true);
      });
    }
  }, [requireEnrollment, user, courseId, enrollmentChecked, refreshEnrollments]);

  // Check cohort access
  useEffect(() => {
    if (requireCohortAccess && user && cohortId && weekNumber !== undefined) {
      isCohortContentUnlocked(cohortId, weekNumber).then(setContentUnlocked);
    }
  }, [requireCohortAccess, user, cohortId, weekNumber, isCohortContentUnlocked]);

  const userIsEnrolled = user && courseId ? isEnrolled(courseId) : false;

  const userCohortEnrollment = cohortId
    ? cohortEnrollments.find((enrollment) => enrollment.cohortId === cohortId)
    : null;

  // Handle loading
  if (
    authLoading ||
    (requireEnrollment && enrollmentLoading) ||
    (requireCohortAccess && cohortLoading) ||
    (requireEnrollment && user && courseId && !enrollmentChecked) ||
    (requireCohortAccess && contentUnlocked === null) ||
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
        state={{
          from: location,
          message: message,
        }}
        replace
      />
    );
  }

  // Require admin
  if (requireAdmin && !isAdmin) {
    return (
      <Navigate
        to="/dashboard"
        state={{
          from: location,
          message: 'You must be an admin to access this page.',
        }}
        replace
      />
    );
  }

  // Require enrollment
  if (requireEnrollment && courseId && user && !userIsEnrolled) {
    return (
      <Navigate
        to={`/checkout/${courseId}`}
        state={{
          from: location,
          message: 'You need to enroll in this course to access its content.',
        }}
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
          state={{
            from: location,
            message: 'You need to be enrolled in this cohort to access its content.',
          }}
          replace
        />
      );
    }

    if (weekNumber !== undefined && contentUnlocked === false) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Lock className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Content Locked</CardTitle>
              <CardDescription>
                This week's content hasn't been unlocked yet
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Week {weekNumber} Content</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Content will be unlocked according to your cohort schedule.
              </p>
              <Button variant="outline" onClick={() => window.history.back()} className="w-full">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};

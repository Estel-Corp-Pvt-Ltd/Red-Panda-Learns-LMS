import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { COLLECTION, USER_ROLE } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollment } from '@/contexts/EnrollmentContext';
import { db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireStudent?: boolean;
  requireEnrollment?: boolean;
  requireAdmin?: boolean;
  requireInstructor?:boolean;
  requireAccountant?:boolean;
  requireTeacher?:boolean;
  requireEnrollmentOrAdmin?: boolean;
  message?: string;
};

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireStudent = false,
  requireEnrollment = false,
  requireAdmin = false,
  requireInstructor = false,
  requireAccountant =false,
  requireTeacher = false,
  requireEnrollmentOrAdmin = false,
  message = 'Please login to access this page',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isEnrolled, loading: enrollmentLoading, refreshEnrollments } = useEnrollment();
  const location = useLocation();
  const params = useParams();

  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isInstructor,setIsInstructor] = useState<boolean | null>(null);
  const [isAccountant, setIsAccountant] = useState<boolean | null>(null);
  const [isTeacher, setIsTeacher] = useState<boolean | null>(null);
  const courseId = params.courseId;

  // Check admin role if required
  useEffect(() => {
    const checkAdminRole = async () => {
      if (requireAdmin && user) {
        try {
          const docSnap = await getDoc(doc(db, COLLECTION.USERS, user.id));
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

useEffect(()=>{
  const checkInstructorRole = async () =>{
    if (requireInstructor && user){
      try{
         const docSnap = await getDoc(doc(db, COLLECTION.USERS, user.id));
          const data = docSnap.data();
          setIsInstructor(data.role === USER_ROLE.INSTRUCTOR)
      }
      catch{
        setIsInstructor(false)
      }
    }
    else if (!requireInstructor) {
      setIsInstructor(true); // No instructor check needed
    }
    // When requireInstructor is true but user is null (still loading), keep as null
  }
  checkInstructorRole();
},[requireInstructor,user]);


useEffect(() => {
  const checkAccountantRole = async () => {
    if (requireAccountant && user) {
      try {
        const docSnap = await getDoc(doc(db, COLLECTION.USERS, user.id));
        const data = docSnap.data();
        setIsAccountant(data.role === USER_ROLE.ACCOUNTANT);
      } catch {
        setIsAccountant(false);
      }
    } else if (!requireAccountant) {
      setIsAccountant(true); // No accountant check needed
    }
    // When requireAccountant is true but user is null (still loading), keep as null
  };

  checkAccountantRole();
}, [requireAccountant, user]);

useEffect(() => {
  const checkTeacherRole = async () => {
    if (requireTeacher && user) {
      try {
        const docSnap = await getDoc(doc(db, COLLECTION.USERS, user.id));
        const data = docSnap.data();
        setIsTeacher(data?.role === USER_ROLE.TEACHER);
      } catch {
        setIsTeacher(false);
      }
    } else if (!requireTeacher) {
      setIsTeacher(true); // No teacher check needed
    }
    // When requireTeacher is true but user is null (still loading), keep as null
  };

  checkTeacherRole();
}, [requireTeacher, user]);

  // Refresh enrollments if needed
  useEffect(() => {
    if (requireEnrollment && user && courseId && !enrollmentChecked) {
      refreshEnrollments().finally(() => setEnrollmentChecked(true));
    }
  }, [requireEnrollment, user, courseId, enrollmentChecked, refreshEnrollments]);

  // // Find user's enrollment in the cohort
  // const userCohortEnrollment: Enrollment | undefined = cohortId
  // ? enrollments.find((enr: Enrollment) => enr.cohortId === cohortId && enr.status === 'active')
  // : undefined;

  const userIsEnrolled = user && courseId ? isEnrolled(courseId) : false;

  // Loading states
  if (
    authLoading ||
    (requireEnrollment && enrollmentLoading) ||
    (requireEnrollment && user && courseId && !enrollmentChecked) ||
    (requireAdmin && isAdmin === null) ||
    (requireInstructor && isInstructor === null) ||
    (requireAccountant && isAccountant === null) ||
    (requireTeacher && isTeacher === null)
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

  if (requireStudent && user && user.role !== USER_ROLE.STUDENT) {
    return (
      <Navigate
        to="/auth/login"
        state={{ from: location, message: 'You must be a registered user to access this page.' }}
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
  // Require Instructor
  if (requireInstructor && !isInstructor) {
    return (
      <Navigate
        to="/dashboard"
        state={{ from: location, message: 'You must be an Instructor to access this page.' }}
        replace
      />
    );
  }


  // Require Accountant
if (requireAccountant && !isAccountant) {
  return (
    <Navigate
      to="/dashboard"
      state={{ from: location, message: 'You must be an Accountant to access this page.' }}
      replace
    />
  );
}

  // Require Teacher
  if (requireTeacher && !isTeacher) {
    return (
      <Navigate
        to="/dashboard"
        state={{ from: location, message: 'You must be a Teacher to access this page.' }}
        replace
      />
    );
  }

  // Require enrollment or admin
  if (requireEnrollmentOrAdmin && courseId && user && !userIsEnrolled && !isAdmin) {
    return (
      <Navigate
        to={`/checkout/${courseId}`}
        state={{ from: location, message: 'You need to enroll in this course to access its content.' }}
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
  // if (requireCohortAccess && cohortId && user) {
  //   if (!userCohortEnrollment) {
  //     return (
  //       <Navigate
  //         to={`/courses/${courseId}`}
  //         state={{ from: location, message: 'You need to be enrolled in this cohort to access its content.' }}
  //         replace
  //       />
  //     );
  //   }
  // }

  // If you want to handle locked content per week later, you can add it here

  return <>{children}</>;
};

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BundleCard } from "@/components/bundle/BundleCard";
import { logError } from "@/utils/logger";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import type { Enrollment } from "@/types/enrollment";
import type { Bundle } from "@/types/bundle";
import type { User } from "@/types/user";

interface BundleProps {
  bundle: Bundle;
  index: number;
  user: User;
  isEnrolledInBundle: (id: string) => Promise<boolean>;
  viewMode: "grid" | "list";
  handleBundlePurchase: (bundleId: string) => void;
}

export const BundleWrapper = ({
  bundle,
  index,
  user,
  isEnrolledInBundle,
  viewMode,
  handleBundlePurchase,
}: BundleProps) => {
  const [isEnrolledInThisBundle, setIsEnrolledInThisBundle] = useState(false);
  const [ownedCoursesCount, setOwnedCoursesCount] = useState(0);

  const navigate = useNavigate();
  const { enrollments } = useEnrollment();

  useEffect(() => {
    let cancelled = false;

    const checkEnrollment = async () => {
      try {
        if (!user?.id || !bundle?.id) return;

        const enrolledInBundle = await isEnrolledInBundle(bundle.id).catch(() => false);
        if (cancelled) return;

        const userEnrollments: Enrollment[] = (enrollments ?? []).filter(
          (e) => e.userId === user.id
        );
        const ownedCourseIds = new Set(userEnrollments.map((e) => e.courseId));
        const ownedCourses = bundle.courses?.filter((c) => ownedCourseIds.has(c.id)) ?? [];

        setOwnedCoursesCount(ownedCourses.length);
        setIsEnrolledInThisBundle(enrolledInBundle);
      } catch (err) {
        logError("BundleWrapper.checkEnrollment", err);
      }
    };

    checkEnrollment();
    return () => {
      cancelled = true;
    };
  }, [user?.id, bundle?.id, enrollments, isEnrolledInBundle]);

  const handleAccessBundle = () => {
    try {
      navigate(`/bundle/${bundle.id}/dashboard`);
    } catch (err) {
      logError("BundleWrapper.handleAccessBundle", err);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
      <BundleCard
        bundle={bundle}
        variant={viewMode === "list" ? "compact" : "default"}
        onPurchase={handleBundlePurchase}
        isEnrolled={isEnrolledInThisBundle}
        ownedCoursesCount={ownedCoursesCount}
        onAccess={handleAccessBundle}
      />
    </div>
  );
};

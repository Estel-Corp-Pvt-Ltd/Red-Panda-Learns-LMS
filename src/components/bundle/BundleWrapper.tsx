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
  isEnrolledInBundle: (id: string) => Promise<boolean>; // keep if you track bundle purchase explicitly
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
  const [ownsAllBundleCourses, setOwnsAllBundleCourses] = useState(false);
  const [ownedCoursesCount, setOwnedCoursesCount] = useState(0);

  const navigate = useNavigate();
  const { enrollments } = useEnrollment(); // user enrollments (course-based now)

  useEffect(() => {
    let cancelled = false;

    const checkEnrollment = async () => {
      try {
        if (!user?.id || !bundle?.id) return;

        // 1) If you still track bundle purchases, keep this call.
        const enrolledInBundle = await isEnrolledInBundle(bundle.id).catch(
          () => false
        );
        if (cancelled) return;

        // 2) Build owned courseId set from new Enrollment schema
        // Optional: filter by "active" statuses only if you have them
        const userEnrollments: Enrollment[] = (enrollments ?? []).filter(
          (e) => e.userId === user.id
        );
        // .filter((e) => ["ACTIVE", "COMPLETED"].includes(e.status as unknown as string));

        const ownedCourseIds = new Set(userEnrollments.map((e) => e.courseId));

        // 3) Compare to bundle courses
        const totalCourses = bundle.courses?.length ?? 0;
        const ownedCourses =
          bundle.courses?.filter((c) => ownedCourseIds.has(c.id)) ?? [];

        setOwnedCoursesCount(ownedCourses.length);

        const ownsAll =
          totalCourses > 0 && ownedCourses.length === totalCourses;
        setOwnsAllBundleCourses(ownsAll);
        setIsEnrolledInThisBundle(enrolledInBundle);
      } catch (err) {
        logError("BundleWrapper.checkEnrollment", err);
        console.warn("BundleWrapper - Enrollment check failed:", {
          bundleId: bundle.id,
          error: err instanceof Error ? err.message : String(err),
        });
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

  const handlePurchaseClick = () => {
    // Hard block purchase if user owns every course in the bundle
    if (ownsAllBundleCourses) {
      // Optional: show a toast/snackbar here
      // toast.info("You already own all courses in this bundle.");
      return;
    }
    handleBundlePurchase(bundle.id);
  };
  if (ownsAllBundleCourses) {
    return <></>;
  }
  return (
    <div
      onClick={() => navigate(`/course-bundle/${bundle.slug}`)}
      className="cursor-pointer hover:shadow-lg transition-all animate-fade-in-up"
      style={{ animationDelay: `${index * 0.1}s` }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/bundle/${bundle.id}`);
        }
      }}
    >
      <BundleCard
        bundle={bundle}
        variant={viewMode === "list" ? "compact" : "default"}
        onPurchase={handlePurchaseClick}
        // Keep "isEnrolled" meaning "owns the bundle license" (not just all courses)
        isEnrolled={isEnrolledInThisBundle}
        ownedCoursesCount={ownedCoursesCount}
        onAccess={handleAccessBundle}
        // If your BundleCard supports disabling buy, pass this:
        // disablePurchase={isEnrolledInThisBundle || ownsAllBundleCourses}
        // purchaseDisabledReason={
        //   ownsAllBundleCourses ? "You already own all courses in this bundle" : undefined
        // }
      />
    </div>
  );
};

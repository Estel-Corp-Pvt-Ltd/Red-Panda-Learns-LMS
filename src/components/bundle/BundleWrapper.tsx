// BundleWrapper.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BundleCard } from "@/components/bundle/BundleCard";
import { logError } from "@/utils/logger";
import { ok, fail, type Result } from "@/utils/response";
import { ENROLLED_PROGRAM_TYPE, PRICING_MODEL } from "@/constants";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import type { Enrollment } from "@/types/enrollment";

export const BundleWrapper = ({
  bundle,
  index,
  user,
  isEnrolledInBundle,
  viewMode,
  handleBundlePurchase,
}: {
  bundle: any;
  index: number;
  user: any;
  isEnrolledInBundle: (id: string) => Promise<boolean>;
  viewMode: "grid" | "list";
  handleBundlePurchase: (bundleId: string) => void;
}) => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [ownedCoursesCount, setOwnedCoursesCount] = useState(0);
  const navigate = useNavigate();
  const { enrollments } = useEnrollment(); // global user enrollments

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        if (!user || !bundle) return;

        // --- 1️⃣ Check if user directly enrolled in the bundle ---
        const enrolledInBundle = await isEnrolledInBundle(bundle.id);

        // --- 2️⃣ Compute all courses owned (direct + virtual from bundles) ---
        const directCourses = enrollments?.filter(
          (e) => e.targetType === ENROLLED_PROGRAM_TYPE.COURSE
        ) || [];

        const bundleCourses: Enrollment[] = enrollments
          ?.filter((e) => e.targetType === ENROLLED_PROGRAM_TYPE.BUNDLE)
          .flatMap((bundleEnrollment) => {
            if (!bundleEnrollment.bundleProgress) return [];
            return bundleEnrollment.bundleProgress.map((bp) => ({
              id: `${bundleEnrollment.id}_${bp.courseId}_virtual`,
              userId: bundleEnrollment.userId,
              targetId: bp.courseId,
              targetType: ENROLLED_PROGRAM_TYPE.COURSE,
              status: bundleEnrollment.status,
              role: bundleEnrollment.role,
              sourceBundleId: bundleEnrollment.targetId,
              pricingModel: bundleEnrollment.pricingModel || PRICING_MODEL.PAID,
              enrollmentDate: bundleEnrollment.enrollmentDate,
              createdAt: bundleEnrollment.createdAt,
              updatedAt: bundleEnrollment.updatedAt,
              progressSummary: {
                percent: 0,
                completedCourses: 0,
                totalCourses: 1,
              },
            }));
          }) || [];

        const allOwnedCourses = [...directCourses, ...bundleCourses];
        const userCourseIds = allOwnedCourses.map((e) => e.targetId);

        // --- 3️⃣ Compare with current bundle courses ---
        const totalCourses = bundle.courses?.length || 0;
        const ownedCourses = bundle.courses?.filter((c) =>
          userCourseIds.includes(c.id)
        ) || [];

        const ownsAllCourses = ownedCourses.length === totalCourses;
        console.log("Owned courses length",ownedCourses.length)
        console.log("Does he own all courses",ownsAllCourses)
        // --- 4️⃣ Set state ---
        setOwnedCoursesCount(ownedCourses.length);
        setIsEnrolled(enrolledInBundle );

        const result: Result<boolean> = ok(enrolledInBundle );
      } catch (err) {
        logError("BundleWrapper.checkEnrollment", err);
        const failResult = fail(
          err instanceof Error ? err.message : "Unknown enrollment error"
        );
        console.warn("BundleWrapper - Enrollment failed:", {
          bundleId: bundle.id,
          failResult,
        });
      }
    };

    checkEnrollment();
  }, [user, bundle, isEnrolledInBundle, enrollments]);

  const handleAccessBundle = () => {
    try {
      navigate(`/bundle/${bundle.id}/dashboard`);
    } catch (err) {
      logError("BundleWrapper.handleAccessBundle", err);
    }
  };

  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <BundleCard
        bundle={bundle}
        variant={viewMode === "list" ? "compact" : "default"}
        onPurchase={() => handleBundlePurchase(bundle.id)}
        isEnrolled={isEnrolled}
        ownedCoursesCount={ownedCoursesCount} // optional: show partial ownership
        onAccess={handleAccessBundle}
      />
    </div>
  );
};

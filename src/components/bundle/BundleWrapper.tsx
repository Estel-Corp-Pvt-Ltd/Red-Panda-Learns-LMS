// BundleWrapper.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BundleCard } from "@/components/bundle/BundleCard";
import { logError } from "@/utils/logger";
import { ok, fail, type Result } from "@/utils/response";

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
  const navigate = useNavigate();
    console.log("chekcking enrollments in bundle",isEnrolled)
  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        if (!user || !bundle) return;

        const enrolled = await isEnrolledInBundle(bundle.id);
        setIsEnrolled(enrolled);

        const result: Result<boolean> = ok(enrolled);
        console.log("BundleWrapper - Enrollment check:", {
          bundleId: bundle.id,
          result,
        });
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
  }, [user, bundle, isEnrolledInBundle]);

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
        onAccess={handleAccessBundle}
      />
    </div>
  );
};
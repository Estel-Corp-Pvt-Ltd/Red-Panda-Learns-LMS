import { useEffect, useMemo, useState } from "react";
import { useActivePopUpsQuery } from "@/hooks/use-pop-ups";
import PopUpElement from "./PopUpElement";
import RecentPurchasesToasts, {
  Purchase,
} from "../pages/RecentPurchasesToasts";
import { useRecentEnrollments } from "./useRecentEnrollments";
import { useLocation } from "react-router-dom";

// Optional: dev-only demo items so you can see the toasts UI even if Firestore blocks reads
const demoItems: Purchase[] = [
  {
    id: "d1",
    course: "Master ML, DL & Generative AI",
    buyer: "Anita",
    location: "Bengaluru",
    timeAgo: "2m ago",
  },
  {
    id: "d2",
    course: "Data Structures in Python",
    buyer: "Rahul",
    location: "Mumbai",
    timeAgo: "6m ago",
  },
  {
    id: "d3",
    course: "LLMs & Prompt Engineering",
    buyer: "Omkar",
    location: "Pune",
    timeAgo: "12m ago",
  },
];

type Phase = "idle" | "popups" | "toasts";

const PopUpContainer = () => {
  const location = useLocation();
  const { data: popUps, isLoading } = useActivePopUpsQuery();
  const {
    items: enrollments,
    loading: enrollmentsLoading,
    error: enrollmentsError,
  } = useRecentEnrollments();

  const popupList = popUps?.data ?? [];
  const popupsLoaded = !isLoading;
  const hasPopups = popupList.length > 0;

  // One-way state machine to prevent overlap
  const [phase, setPhase] = useState<Phase>("idle");
  // Track the current popup index for sequential display
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shouldShowPopup, setShouldShowPopup] = useState(() => {
    const saved = localStorage.getItem("popupHideTime");
    if (saved) {
      const savedTime = Number(saved);
      const now = Date.now();

      const twentyFourHours = 60 * 1000; // ms in 24h

      if (now - savedTime > twentyFourHours) {
        return true;
      } else {
        return false;
      }
    }
    return true;
  });

  // Track which popups are still on screen
  const [remainingIds, setRemainingIds] = useState<Set<string | number>>(
    new Set()
  );

  useEffect(() => {
    if (!["/", "/dashboard"].includes(location.pathname)) {
      setShouldShowPopup(false);
    }
  }, [location]);

  // Decide initial phase when popup query resolves
  useEffect(() => {
    if (!popupsLoaded || phase !== "idle") return;

    if (hasPopups) {
      // Enter "popups" phase and initialize remaining IDs
      setRemainingIds(new Set(popupList.map((p: any) => p.id)));
      setPhase("popups");
    } else {
      // No popups at all -> go straight to toasts
      setPhase("toasts");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupsLoaded, hasPopups, phase]);

  // When in popups phase, switch to toasts only after all popups finish
  useEffect(() => {
    if (phase !== "popups") return;
    if (remainingIds.size === 0) {
      setPhase("toasts");
    }
  }, [phase, remainingIds.size]);

  const handlePopUpDone = (id: string | number) => {
    setRemainingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Move to next popup in list
    setCurrentIndex((prev) => prev + 1);
  };

  // Map Firestore items to toast items
  const toastItems: Purchase[] = useMemo(
    () =>
      (enrollments ?? []).map((e) => ({
        id: e.id,
        course: e.course,
        buyer: e.buyer,
        location: e.location,
        timeAgo: e.timeAgo,
        href: e.href,
        // If your hook provides these, they make the map instant in the toast:
        mapUrl: (e as any).mapUrl ?? undefined,
        lat: (e as any).coords?.lat ?? undefined,
        lon: (e as any).coords?.lon ?? undefined,
      })),
    [enrollments]
  );

  // Dev fallback so you can still see the toasts if Firestore blocks reads
  const itemsForToasts: Purchase[] =
    toastItems.length > 0
      ? toastItems
      : import.meta.env.MODE === "development"
        ? demoItems
        : [];

  // Compute the current popup being shown
  const currentPopUp = popupList[currentIndex] ?? null;

  const canShowToasts =
    phase === "toasts" && !enrollmentsLoading && itemsForToasts.length > 0;

  return (
    <>
      {/* Bottom-right: popups (only in "popups" phase) */}
      {phase === "popups" && shouldShowPopup && ["/", "/dashboard"].includes(location.pathname) && currentPopUp && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
          <PopUpElement
            key={currentPopUp.id}
            title={currentPopUp.title}
            description={currentPopUp.description}
            type={currentPopUp.type}
            ctaLink={currentPopUp.ctaLink}
            ctaText={currentPopUp.ctaText}
            autoClose={currentPopUp.autoClose}
            duration={currentPopUp.duration}
            // IMPORTANT: PopUpElement must call onDone after its exit animation
            onDone={() => handlePopUpDone(currentPopUp.id)}
          />
        </div>
      )}

      {/* Bottom-left: recent purchases queue (only in "toasts" phase) */}
      {shouldShowPopup && canShowToasts && (
        <RecentPurchasesToasts
          items={itemsForToasts}
          start={true}
          showMs={5000}
          gapMs={5000}
          outMs={220}
          loop={true}
        />
      )}
    </>
  );
};

export default PopUpContainer;

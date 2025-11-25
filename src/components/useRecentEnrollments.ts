"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  documentId,
  Timestamp,
} from "firebase/firestore";
import { courseService } from "@/services/courseService";
import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";

// Types
type Coords = {
  lat: number;
  lon: number;
};

export type EnrollmentToast = {
  id: string;
  course: string;
  buyer?: string; // First name
  location?: string; // City
  timeAgo?: string;
  href?: string;
  coords?: Coords | null;
  mapUrl?: string | null;
  lat?: number; // Convenience for consumers
  lon?: number;
};

interface OrderData {
  fullName?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Constants
const GEOAPIFY_KEY = (import.meta as any).env?.VITE_GEOAPIFY_KEY as
  | string
  | undefined;
const MAX_ENROLLMENTS = 10;
const FIRESTORE_BATCH_LIMIT = 10;

// Utility Functions
const getDevicePixelRatio = (): number => {
  return Math.max(
    1,
    Math.min(
      3,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    )
  );
};

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const fetchOrderDataByIds = async (
  orderIds: string[]
): Promise<Record<string, OrderData>> => {
  const orderData: Record<string, OrderData> = {};

  const validIds = orderIds.filter((id) => id && typeof id === "string");
  if (validIds.length === 0) return orderData;

  const batches = chunkArray(validIds, FIRESTORE_BATCH_LIMIT);

  for (const batch of batches) {
    try {
      const ordersQuery = query(
        collection(db, COLLECTION.ORDERS),
        where(documentId(), "in", batch)
      );

      const snapshot = await getDocs(ordersQuery);
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        const billingAddress = data?.billingAddress;

        if (billingAddress) {
          orderData[doc.id] = {
            fullName: billingAddress.fullName,
            city: billingAddress.city,
            state: billingAddress.state,
            country: billingAddress.country,
          };
        }
      });
    } catch (error) {
      console.error(`Error fetching orders batch:`, error);
    }
  }

  return orderData;
};

// Normalize slug/url to href
const toCourseHref = (slugOrUrl?: string | null): string | undefined => {
  if (!slugOrUrl) return undefined;
  const s = String(slugOrUrl).trim();
  if (!s) return undefined;
  if (s.startsWith("http")) return s; // full URL returned
  if (s.startsWith("/")) return s; // already a path
  // treat as slug
  return `/courses/${s}`;
};

export function useRecentEnrollments() {
  const [items, setItems] = useState<EnrollmentToast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchEnrollments = async () => {
      try {
        setLoading(true);

        // Fetch recent enrollments (server-side filter)
        const enrollmentsQuery = query(
          collection(db, COLLECTION.ENROLLMENTS),
          where("orderId", "not-in", [
            "Admin Enrollment",
            "Free Course Enrollment",
          ]),
          orderBy("createdAt", "desc"),
          limit(MAX_ENROLLMENTS)
        );

        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        if (isCancelled) return;

        // Base items
        const allEnrollments = enrollmentsSnapshot.docs.map((doc) => {
          const data = doc.data() as any;

          const timestamp =
            data?.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : data?.enrollmentDate instanceof Timestamp
              ? data.enrollmentDate.toDate()
              : new Date();

          const courseName =
            data?.courseName ||
            data?.courseTitle ||
            data?.courseId ||
            "New course";

          // We’ll resolve href via slug later; keep any provided href as fallback
          const providedHref =
            data?.href ||
            (data?.courseId ? `/courses/${data.courseId}` : undefined);

          return {
            id: doc.id,
            course: courseName,
            timeAgo: formatTimeAgo(timestamp),
            href: providedHref,
            orderId: data?.orderId as string | undefined,
            courseId: data?.courseId as string | undefined, // keep for slug lookup
            buyer: undefined,
            location: undefined,
            coords: null,
            mapUrl: null,
            lat: undefined,
            lon: undefined,
          } as EnrollmentToast & { orderId?: string; courseId?: string };
        });

        // If nothing returned, clear and exit
        if (allEnrollments.length === 0) {
          if (!isCancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }

        // Prepare lookups
        const orderIds = allEnrollments
          .map((i) => (i as any).orderId)
          .filter((id): id is string => Boolean(id));

        const courseIds = Array.from(
          new Set(
            allEnrollments
              .map((i) => (i as any).courseId)
              .filter((id): id is string => Boolean(id))
          )
        );

        // Fetch order data and course slugs in parallel
        const [orderData, slugEntries] = await Promise.all([
          orderIds.length ? fetchOrderDataByIds(orderIds) : Promise.resolve({}),
          courseIds.length
            ? Promise.all(
                courseIds.map(async (cid) => {
                  try {
                    const slugOrUrl = await courseService.getCourseSlugById(cid);
                    return [cid, slugOrUrl] as const;
                  } catch {
                    return [cid, null] as const;
                  }
                })
              )
            : Promise.resolve([] as readonly (readonly [string, string | null])[])
        ]);

        if (isCancelled) return;

        const slugMap: Record<string, string | null> = Object.fromEntries(
          slugEntries
        );

        // Enrich items (buyer/location + href from slug)
        const enriched = allEnrollments.map((item) => {
          const orderId = (item as any).orderId as string | undefined;
          const courseId = (item as any).courseId as string | undefined;

          // Build href from slug/url if available
          const slugOrUrl =
            (courseId && slugMap[courseId]) ? slugMap[courseId] : null;
          const hrefFromSlug = toCourseHref(slugOrUrl);
          const finalHref = hrefFromSlug || item.href;

          // Buyer/location
          let buyer = item.buyer;
          let location = item.location;

          if (orderId && orderData[orderId]) {
            const order = orderData[orderId];
            const firstName = order.fullName?.trim().split(" ")[0];
            buyer = firstName || buyer;
            location = order.city || location;
          }

          return {
            ...item,
            href: finalHref,
            buyer,
            location,
          };
        });

        setItems(enriched);
        setLoading(false);
      } catch (err) {
        if (!isCancelled) {
          const errorMessage =
            err instanceof Error
              ? err
              : new Error("Failed to fetch enrollments");
          setError(errorMessage);
          setLoading(false);
          console.error("[useRecentEnrollments] Error:", err);
        }
      }
    };

    fetchEnrollments();

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    items,
    loading,
    error,
    refetch: () => {
      // You could implement refetch logic here if needed
    },
  };
}
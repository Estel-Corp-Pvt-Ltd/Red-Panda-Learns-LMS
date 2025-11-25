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

// const generateStaticMapUrl = (coords: Coords, size = 48, zoom = 13): string => {
//   const pixelSize = Math.min(512, Math.round(size * getDevicePixelRatio() * 3));

//   if (GEOAPIFY_KEY) {
//     return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${pixelSize}&height=${pixelSize}&center=lonlat:${coords.lon},${coords.lat}&zoom=${zoom}&marker=lonlat:${coords.lon},${coords.lat};type:awesome;color:%23ffffff;size:small&scaleFactor=2&apiKey=${GEOAPIFY_KEY}`;
//   }

//   return `https://staticmap.openstreetmap.de/staticmap.php?center=${coords.lat},${coords.lon}&zoom=${zoom}&size=${pixelSize}x${pixelSize}&maptype=mapnik&markers=${coords.lat},${coords.lon},lightblue1`;
// };

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

const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Firebase Functions
export const fetchOrderDataByIds = async (
  orderIds: string[]
): Promise<Record<string, OrderData>> => {
  const orderData: Record<string, OrderData> = {};

  // Filter out invalid IDs
  const validIds = orderIds.filter((id) => id && typeof id === "string");
  if (validIds.length === 0) return orderData;

  // Process in batches due to Firestore limitations
  const batches = chunkArray(validIds, FIRESTORE_BATCH_LIMIT);

  for (const batch of batches) {
    try {
      const ordersQuery = query(
        collection(db, COLLECTION.ORDERS),
        where(
          documentId(),
          "in",
          batch 
        )
      );

      const snapshot = await getDocs(ordersQuery);
      // console.log(snapshot)
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
      // Continue processing other batches even if one fails
    }
  }

  return orderData;
};

// Main Hook
export function useRecentEnrollments() {
  const [items, setItems] = useState<EnrollmentToast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // In useRecentEnrollments hook, modify the base enrollments processing:

    const fetchEnrollments = async () => {
      try {
        // Fetch recent enrollments
        const enrollmentsQuery = query(
          collection(db, COLLECTION.ENROLLMENTS),
          where("orderId", "not-in", ["Admin Enrollment", "Free Course Enrollment"]),
          orderBy("createdAt", "desc"),
          
          limit(MAX_ENROLLMENTS)
        );

        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

        if (isCancelled) return;

        // Process enrollments into base items
        const allEnrollments = enrollmentsSnapshot.docs.map((doc) => {
          const data = doc.data() as any;

          // Extract timestamp
          const timestamp =
            data?.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : data?.enrollmentDate instanceof Timestamp
              ? data.enrollmentDate.toDate()
              : new Date();

          // Extract course name
          const courseName =
            data?.courseName ||
            data?.courseTitle ||
            data?.courseId ||
            "New course";

          // Generate course URL
          const courseHref =
            data?.href ||
            (data?.courseId ? `/courses/${data.courseId}` : undefined);

          return {
            id: doc.id,
            course: courseName,
            timeAgo: formatTimeAgo(timestamp),
            href: courseHref,
            orderId: data?.orderId as string | undefined,
            buyer: undefined,
            location: undefined,
            coords: null,
            mapUrl: null,
            lat: undefined,
            lon: undefined,
          } as EnrollmentToast & { orderId?: string };
        });
        // // FILTER OUT Admin Enrollments
        // const baseEnrollments = allEnrollments.filter((enrollment) => {
        //   const orderId = (enrollment as any).orderId;
        //   // Exclude if orderId is "Admin Enrollment" or undefined/null
        //   return orderId && orderId !== "Admin Enrollment" && orderId !== "Free Course Enrollment";
        // });

   

        // If no valid enrollments after filtering, just return empty
        // if (baseEnrollments.length === 0) {
        //   // console.log("No valid enrollments found (all were admin or invalid)");
        //   setItems([]);
        //   setLoading(false);
        //   return; // This will trigger the demo fallback in PopUpContainer
        // }

        // Set initial items
        setItems(allEnrollments);
        setLoading(false);

        // Extract order IDs for enrichment (now guaranteed no "Admin Enrollment")
        const orderIds = allEnrollments
          .map((item) => (item as any).orderId)
          .filter((id): id is string => Boolean(id));

        if (orderIds.length === 0) {
          // console.log("No order IDs to fetch");
          return;
        }

        // Fetch order data for location and buyer info
        const orderData = await fetchOrderDataByIds(orderIds);

        if (isCancelled) return;

        // Enrich items with order data
        setItems((prevItems) =>
          prevItems.map((item) => {
            const orderId = (item as any).orderId;

            if (orderId && orderData[orderId]) {
              const order = orderData[orderId];
              const firstName = order.fullName?.trim().split(" ")[0];

              return {
                ...item,
                buyer: firstName || item.buyer,
                location: order.city || item.location,
              };
            }

            // Return unchanged if no order data found
            return item;
          })
        );
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

    // Cleanup function
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
import { collection, query, where, getDocs, orderBy, Timestamp, limit } from "firebase/firestore";

import { COLLECTION, ANNOUNCEMENT_STATUS, ANNOUNCEMENT_SCOPE } from "@/constants";
import { Announcement } from "@/types/announcements";
import { Result, ok, fail } from "@/utils/response";
import { logError } from "@/utils/logger";
import { enrollmentService } from "./enrollmentService";
import { db } from "@/firebaseConfig";

class AnnouncementService {


    /**
 * Fetches all announcements for admin (no user filtering)
 */
async getAllAnnouncements(maxLimit: number = 50): Promise<Result<Announcement[]>> {
    try {
        const announcementsRef = collection(db, COLLECTION.ANNOUNCEMENTS);
        
        const q = query(
            announcementsRef,
            where("status", "==", ANNOUNCEMENT_STATUS.PUBLISHED),
            orderBy("updatedAt", "desc"),
            limit(maxLimit)
        );

        const querySnapshot = await getDocs(q);
        
        const announcements = querySnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        })) as Announcement[];

        return ok(announcements);
    } catch (error) {
        console.error("❌ Error fetching all announcements:", error);
        logError("AnnouncementService.getAllAnnouncements", error);
        return fail("Failed to fetch announcements");
    }
}


    /**
     * Fetches the last 10 published announcements for a user:
     * 1. Global announcements (scope = "global")
     * 2. Course-specific announcements for enrolled courses
     */
    async getAnnouncementsForUser(userId: string, maxLimit: number = 10): Promise<Result<Announcement[]>> {
        try {
  

            // Get user's enrolled course IDs
            const enrollmentResult = await enrollmentService.getUserEnrollments(userId);
           
            let enrolledCourseIds: string[] = [];
            if (enrollmentResult.success && enrollmentResult.data) {
                enrolledCourseIds = enrollmentResult.data.map((enrollment) => enrollment.courseId);
            }

            const announcementsRef = collection(db, COLLECTION.ANNOUNCEMENTS);

            // Fetch both in parallel
            const [globalAnnouncements, courseAnnouncements] = await Promise.all([
                this.fetchGlobalAnnouncements(announcementsRef, maxLimit),
                this.fetchCourseAnnouncements(announcementsRef, enrolledCourseIds, maxLimit),
            ]);

   

            // Merge and sort by updatedAt descending (newest first)
            const allAnnouncements = [...globalAnnouncements, ...courseAnnouncements];

            allAnnouncements.sort((a, b) => {
                const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : 0;
                const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : 0;
                return dateB - dateA;
            });

            // Limit to maxLimit
            const limitedAnnouncements = allAnnouncements.slice(0, maxLimit);

        

            return ok(limitedAnnouncements);
        } catch (error) {
            console.error("❌ Error fetching announcements:", error);
            logError("AnnouncementService.getAnnouncementsForUser", error);
            return fail("Failed to fetch announcements");
        }
    }

    /**
     * Fetches global announcements using scope field instead of courseId == null
     */
    private async fetchGlobalAnnouncements(
        announcementsRef: ReturnType<typeof collection>,
        maxLimit: number = 10
    ): Promise<Announcement[]> {
        try {
            // ⭐ Use scope field instead of courseId == null
            const q = query(
                announcementsRef,
                where("scope", "==", ANNOUNCEMENT_SCOPE.GLOBAL),
                where("status", "==", ANNOUNCEMENT_STATUS.PUBLISHED),
                orderBy("updatedAt", "desc"),
                limit(maxLimit)
            );


            const querySnapshot = await getDocs(q);
     

            return querySnapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Announcement[];
        } catch (error) {
            console.error("❌ Error in fetchGlobalAnnouncements:", error);
            logError("AnnouncementService.fetchGlobalAnnouncements", error);
            return [];
        }
    }

    /**
     * Fetches course-specific announcements for enrolled courses
     */
    private async fetchCourseAnnouncements(
        announcementsRef: ReturnType<typeof collection>,
        courseIds: string[],
        maxLimit: number = 10
    ): Promise<Announcement[]> {
        if (courseIds.length === 0) {
         
            return [];
        }

        try {
            const BATCH_SIZE = 30;
            const batches: string[][] = [];

            for (let i = 0; i < courseIds.length; i += BATCH_SIZE) {
                batches.push(courseIds.slice(i, i + BATCH_SIZE));
            }

            const results = await Promise.all(
                batches.map(async (batchCourseIds) => {
                    const q = query(
                        announcementsRef,
                        where("scope", "==", ANNOUNCEMENT_SCOPE.COURSE),
                        where("courseId", "in", batchCourseIds),
                        where("status", "==", ANNOUNCEMENT_STATUS.PUBLISHED),
                        orderBy("updatedAt", "desc"),
                        limit(maxLimit)
                    );

                    const querySnapshot = await getDocs(q);
             

                    return querySnapshot.docs.map((doc) => ({
                        ...doc.data(),
                        id: doc.id,
                    })) as Announcement[];
                })
            );

            return results.flat();
        } catch (error) {
            console.error("❌ Error in fetchCourseAnnouncements:", error);
            logError("AnnouncementService.fetchCourseAnnouncements", error);
            return [];
        }
    }
}

export const announcementService = new AnnouncementService();
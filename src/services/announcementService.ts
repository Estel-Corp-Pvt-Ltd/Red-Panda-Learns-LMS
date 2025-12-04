import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";

import { COLLECTION, ANNOUNCEMENT_STATUS } from "@/constants";
import { Announcement } from "@/types/announcements";
import { Result, ok, fail } from "@/utils/response";
import { logError } from "@/utils/logger";
import { enrollmentService } from "./enrollmentService";
import { db } from "@/firebaseConfig";

class AnnouncementService {
    /**
     * Fetches all published announcements for a user:
     * 1. Global announcements (courseId is null)
     * 2. Course-specific announcements for enrolled courses
     */
    async getAnnouncementsForUser(userId: string): Promise<Result<Announcement[]>> {
        try {
            // Get user's enrolled course IDs
            const enrollmentResult = await enrollmentService.getUserEnrollments(userId);
           
            let enrolledCourseIds: string[] = [];
            if (enrollmentResult.success && enrollmentResult.data) {
                enrolledCourseIds = enrollmentResult.data.map((enrollment) => enrollment.courseId);
            }
            
            const announcementsRef = collection(db, COLLECTION.ANNOUNCEMENT);

            // Fetch both in parallel
            const [globalAnnouncements, courseAnnouncements] = await Promise.all([
                this.fetchGlobalAnnouncements(announcementsRef),
                this.fetchCourseAnnouncements(announcementsRef, enrolledCourseIds),
            ]);

            // Merge and sort by updatedAt descending (newest first)
            const allAnnouncements = [...globalAnnouncements, ...courseAnnouncements];

            allAnnouncements.sort((a, b) => {
                const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : 0;
                const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : 0;
                return dateB - dateA;
            });

            return ok(allAnnouncements);
        } catch (error) {
            logError("AnnouncementService.getAnnouncementsForUser", error);
            return fail("Failed to fetch announcements");
        }
    }

    /**
     * Fetches global announcements (courseId is null)
     */
    private async fetchGlobalAnnouncements(
        announcementsRef: ReturnType<typeof collection>
    ): Promise<Announcement[]> {
        try {
            const q = query(
                announcementsRef,
                where("courseId", "==", null),
                where("status", "==", ANNOUNCEMENT_STATUS.PUBLISHED),
                orderBy("updatedAt", "desc")
            );

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Announcement[];
        } catch (error) {
            logError("AnnouncementService.fetchGlobalAnnouncements", error);
            return [];
        }
    }

    /**
     * Fetches course-specific announcements for enrolled courses
     * Batches in groups of 30 due to Firestore 'in' query limit
     */
    private async fetchCourseAnnouncements(
        announcementsRef: ReturnType<typeof collection>,
        courseIds: string[]
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
                        where("courseId", "in", batchCourseIds),
                        where("status", "==", ANNOUNCEMENT_STATUS.PUBLISHED),
                        orderBy("updatedAt", "desc")
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
            logError("AnnouncementService.fetchCourseAnnouncements", error);
            return [];
        }
    }
}

export const announcementService = new AnnouncementService();
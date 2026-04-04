import { collection, query, where, getDocs, orderBy, Timestamp, limit, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";

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
    async getAnnouncementsForUser(userId: string, maxLimit: number = 10, organizationId?: string): Promise<Result<Announcement[]>> {
        try {


            // Get user's enrolled course IDs
            const enrollmentResult = await enrollmentService.getUserEnrollments(userId);

            let enrolledCourseIds: string[] = [];
            if (enrollmentResult.success && enrollmentResult.data) {
                enrolledCourseIds = enrollmentResult.data.map((enrollment) => enrollment.courseId);
            }

            const announcementsRef = collection(db, COLLECTION.ANNOUNCEMENTS);

            // Fetch global, course, and organization announcements in parallel
            const fetchPromises: Promise<Announcement[]>[] = [
                this.fetchGlobalAnnouncements(announcementsRef, maxLimit),
                this.fetchCourseAnnouncements(announcementsRef, enrolledCourseIds, maxLimit),
            ];

            // Also fetch organization-scoped announcements if user belongs to an org
            if (organizationId) {
                fetchPromises.push(
                    this.fetchOrganizationAnnouncements(announcementsRef, organizationId, maxLimit)
                );
            }

            const results = await Promise.all(fetchPromises);
            const [globalAnnouncements, courseAnnouncements, orgAnnouncements = []] = results;

            // Merge and sort by updatedAt descending (newest first)
            const allAnnouncements = [...globalAnnouncements, ...courseAnnouncements, ...orgAnnouncements];

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
     * Fetches announcements scoped to a specific organization.
     */
    async getOrganizationAnnouncements(organizationId: string, maxLimit: number = 50): Promise<Result<Announcement[]>> {
        try {
            const announcementsRef = collection(db, COLLECTION.ANNOUNCEMENTS);
            const q = query(
                announcementsRef,
                where("scope", "==", ANNOUNCEMENT_SCOPE.ORGANIZATION),
                where("organizationId", "==", organizationId),
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
            console.error("Error fetching organization announcements:", error);
            logError("AnnouncementService.getOrganizationAnnouncements", error);
            return fail("Failed to fetch organization announcements");
        }
    }

    /**
     * Creates an organization-scoped announcement directly in Firestore.
     */
    async createOrganizationAnnouncement(data: {
        title: string;
        body: string;
        organizationId: string;
        createdBy: string;
        targetClass?: string;
        targetDivision?: string;
    }): Promise<Result<string>> {
        try {
            const announcementsRef = collection(db, COLLECTION.ANNOUNCEMENTS);
            const docData: Record<string, any> = {
                scope: ANNOUNCEMENT_SCOPE.ORGANIZATION,
                organizationId: data.organizationId,
                title: data.title,
                body: data.body,
                status: ANNOUNCEMENT_STATUS.PUBLISHED,
                createdBy: data.createdBy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            if (data.targetClass) docData.targetClass = data.targetClass;
            if (data.targetDivision) docData.targetDivision = data.targetDivision;
            const docRef = await addDoc(announcementsRef, docData);

            return ok(docRef.id);
        } catch (error) {
            console.error("Error creating organization announcement:", error);
            logError("AnnouncementService.createOrganizationAnnouncement", error);
            return fail("Failed to create organization announcement");
        }
    }

    /**
     * Updates an existing announcement in Firestore.
     */
    async updateOrganizationAnnouncement(
        announcementId: string,
        data: { title?: string; body?: string }
    ): Promise<Result<void>> {
        try {
            const announcementRef = doc(db, COLLECTION.ANNOUNCEMENTS, announcementId);
            await updateDoc(announcementRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
            return ok(null);
        } catch (error) {
            console.error("Error updating organization announcement:", error);
            logError("AnnouncementService.updateOrganizationAnnouncement", error);
            return fail("Failed to update organization announcement");
        }
    }

    /**
     * Deletes an announcement from Firestore.
     */
    async deleteOrganizationAnnouncement(announcementId: string): Promise<Result<void>> {
        try {
            const announcementRef = doc(db, COLLECTION.ANNOUNCEMENTS, announcementId);
            await deleteDoc(announcementRef);
            return ok(null);
        } catch (error) {
            console.error("Error deleting organization announcement:", error);
            logError("AnnouncementService.deleteOrganizationAnnouncement", error);
            return fail("Failed to delete organization announcement");
        }
    }

    /**
     * Fetches organization-scoped announcements for a user's org (private helper).
     */
    private async fetchOrganizationAnnouncements(
        announcementsRef: ReturnType<typeof collection>,
        organizationId: string,
        maxLimit: number = 10
    ): Promise<Announcement[]> {
        try {
            const q = query(
                announcementsRef,
                where("scope", "==", ANNOUNCEMENT_SCOPE.ORGANIZATION),
                where("organizationId", "==", organizationId),
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
            console.error("Error in fetchOrganizationAnnouncements:", error);
            logError("AnnouncementService.fetchOrganizationAnnouncements", error);
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
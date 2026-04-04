import { BANNER_STATUS, COLLECTION } from "@/constants";
import { db } from "@/firebaseConfig";
import { Banner, BannerFormData } from "@/types/banner";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

class BannerService {
  /**
   * Create a new banner
   */
  async createBanner(
    data: BannerFormData,
    createdBy: string
  ): Promise<Result<string>> {
    try {
      const bannerRef = doc(collection(db, COLLECTION.BANNERS));
      const bannerId = bannerRef.id;

      const bannerData: Omit<Banner, "id"> = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy,
      };

      await setDoc(bannerRef, bannerData);

      return ok(bannerId);
    } catch (error) {
      logError("BannerService.createBanner", error);
      return fail("Failed to create banner");
    }
  }

  /**
   * Update an existing banner
   */
  async updateBanner(
    bannerId: string,
    updates: Partial<BannerFormData>
  ): Promise<Result<void>> {
    try {
      const bannerRef = doc(db, COLLECTION.BANNERS, bannerId);

      await updateDoc(bannerRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      logError("BannerService.updateBanner", error);
      return fail("Failed to update banner");
    }
  }

  /**
   * Delete a banner
   */
  async deleteBanner(bannerId: string): Promise<Result<void>> {
    try {
      const bannerRef = doc(db, COLLECTION.BANNERS, bannerId);
      await deleteDoc(bannerRef);

      return ok(undefined);
    } catch (error) {
      logError("BannerService.deleteBanner", error);
      return fail("Failed to delete banner");
    }
  }

  /**
   * Get a single banner by ID
   */
  async getBannerById(bannerId: string): Promise<Result<Banner | null>> {
    try {
      const bannerRef = doc(db, COLLECTION.BANNERS, bannerId);
      const bannerSnap = await getDoc(bannerRef);

      if (!bannerSnap.exists()) {
        return ok(null);
      }

      const banner = {
        id: bannerSnap.id,
        ...bannerSnap.data(),
      } as Banner;

      return ok(banner);
    } catch (error) {
      logError("BannerService.getBannerById", error);
      return fail("Failed to fetch banner");
    }
  }

  /**
   * Get all banners (for admin)
   */
  async getAllBanners(): Promise<Result<Banner[]>> {
    try {
      const bannersRef = collection(db, COLLECTION.BANNERS);
      const q = query(bannersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const banners = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Banner[];

      return ok(banners);
    } catch (error) {
      logError("BannerService.getAllBanners", error);
      return fail("Failed to fetch banners");
    }
  }

  /**
 * Get active banners visible to all users
 * Only returns banners where:
 * 1. Status is ACTIVE
 * 2. showToAllUsers is true
 */
  async getActiveGlobalBanners(): Promise<Result<Banner[]>> {
    try {
      const bannersRef = collection(db, COLLECTION.BANNERS);

      const q = query(
        bannersRef,
        where("status", "==", BANNER_STATUS.ACTIVE),
        where("showToAllUsers", "==", true),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);

      const banners = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Banner[];

      return ok(banners);
    } catch (error) {
      logError("BannerService.getActiveGlobalBanners", error);
      return fail("Failed to fetch global banners");
    }
  }

  /**
   * Get active banners for a user based on their enrolled course IDs
   * Only returns banners where:
   * 1. Status is ACTIVE
   * 2. User is enrolled in at least one of the banner's target courses
   */
  async getActiveBannersForUser(
    enrolledCourseIds: string[]
  ): Promise<Result<Banner[]>> {
    try {
      // If user has no enrollments, return empty array
      if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
        return ok([]);
      }

      const bannersRef = collection(db, COLLECTION.BANNERS);
      const q = query(
        bannersRef,
        where("status", "==", BANNER_STATUS.ACTIVE),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);

      const banners = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((banner) => {
          const bannerData = banner as Banner;

          // If banner has no specific course targeting, don't show it
          // Only show banners explicitly assigned to courses the user is enrolled in
          if ((!bannerData.courseIds || bannerData.courseIds.length === 0) && !bannerData.showToAllUsers) {
            return false;
          }

          // Check if user is enrolled in at least one of the banner's target courses
          return bannerData.courseIds.some((courseId) =>
            enrolledCourseIds.includes(courseId) || bannerData.showToAllUsers
          );
        }) as Banner[];

      return ok(banners);
    } catch (error) {
      logError("BannerService.getActiveBannersForUser", error);
      return fail("Failed to fetch active banners");
    }
  }

  /**
   * Toggle banner status between ACTIVE and INACTIVE
   */
  async toggleBannerStatus(bannerId: string): Promise<Result<void>> {
    try {
      const bannerResult = await this.getBannerById(bannerId);
      if (!bannerResult.success || !bannerResult.data) {
        return fail("Banner not found");
      }

      const currentStatus = bannerResult.data.status;
      const newStatus =
        currentStatus === BANNER_STATUS.ACTIVE
          ? BANNER_STATUS.INACTIVE
          : BANNER_STATUS.ACTIVE;

      await this.updateBanner(bannerId, { status: newStatus });

      return ok(undefined);
    } catch (error) {
      logError("BannerService.toggleBannerStatus", error);
      return fail("Failed to toggle banner status");
    }
  }
}

export const bannerService = new BannerService();

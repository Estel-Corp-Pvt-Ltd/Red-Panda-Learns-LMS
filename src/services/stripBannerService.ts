import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { COLLECTION } from "@/constants";
import { db, auth } from "@/firebaseConfig";
import { StripBanner } from "@/types/strip-banner";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";

class StripBannerService {
  private readonly MAX_ACTIVE_BANNERS = 10;

  /**
   * Create a new strip banner
   */
  async createStripBanner(
    data: Omit<StripBanner, "id" | "createdAt" | "updatedAt" | "createdBy">
  ): Promise<Result<StripBanner>> {
    try {
      const user = auth.currentUser;
      if (!user) return fail("User not authenticated");

      // Check active banner limit
      const activeBannersResult = await this.getActiveStripBanners();
      const activeBanners = activeBannersResult.data;

      if (data.active && activeBanners.length >= this.MAX_ACTIVE_BANNERS) {
        return fail(`Maximum ${this.MAX_ACTIVE_BANNERS} active banners allowed`);
      }

      const bannerId = this.generateBannerId();
      const stripBanner: StripBanner = {
        id: bannerId,
        title: data.title,
        subtitle: data.subtitle,
        ctaText: data.ctaText || "",
        ctaLink: data.ctaLink || "",
        ctaActive: data.ctaActive || false,
        gradientStart: data.gradientStart || "#4F46E5",
        gradientEnd: data.gradientEnd || "#7C3AED",
        gradientAngle: data.gradientAngle || 90,
        textColor: data.textColor || "#FFFFFF",
        delaySeconds: data.delaySeconds || 0,
        slideDuration: data.slideDuration || 5000,
        dismissalHours: data.dismissalHours || 12,
        active: data.active || false,
        showOnDashboard: data.showOnDashboard || true,
        showOnLanding: data.showOnLanding || true,
        showOnCoursePages: data.showOnCoursePages || true,
        displayOrder: data.displayOrder || 0,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.STRIP_BANNERS, bannerId), stripBanner);
      console.log("StripBannerService - Banner created:", bannerId);
      return ok(stripBanner);
    } catch (error) {
      logError("StripBannerService.createStripBanner", error);
      return fail("Failed to create banner");
    }
  }

  /**
   * Update a strip banner
   */
  async updateStripBanner(
    id: string,
    updates: Partial<StripBanner>
  ): Promise<Result<void>> {
    try {
      const bannerRef = doc(db, COLLECTION.STRIP_BANNERS, id);
      const bannerDoc = await getDoc(bannerRef);

      if (!bannerDoc.exists()) {
        return fail("Banner not found", "NOT_FOUND");
      }

      const currentBanner = bannerDoc.data() as StripBanner;

      // Check if activating would exceed limit
      if (updates.active === true && !currentBanner.active) {
        const activeBannersResult = await this.getActiveStripBanners();
        if (activeBannersResult.data.length >= this.MAX_ACTIVE_BANNERS) {
          return fail(`Maximum ${this.MAX_ACTIVE_BANNERS} active banners allowed`);
        }
      }

      await updateDoc(bannerRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      console.log("StripBannerService - Updated banner:", id);
      return ok(null);
    } catch (error) {
      logError("StripBannerService.updateStripBanner", error);
      return fail("Failed to update banner");
    }
  }

  /**
   * Get banners for specific page type
   */
  async getBannersForPage(): Promise<Result<StripBanner[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.STRIP_BANNERS),
        where("active", "==", true),
        orderBy("displayOrder", "asc"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const banners: StripBanner[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as StripBanner;
      });
      return ok(banners);
    } catch (error) {
      logError("StripBannerService.getBannersForPage", error);
      return fail("Failed to fetch banners");
    }
  }

  /**
   * Get all banners (for admin)
   */
  async getAllStripBanners(): Promise<Result<StripBanner[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.STRIP_BANNERS),
        orderBy("displayOrder", "asc"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const banners = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.(),
          updatedAt: data.updatedAt?.toDate?.(),
        } as StripBanner;
      });

      return ok(banners);
    } catch (error) {
      logError("StripBannerService.getAllStripBanners", error);
      return fail("Failed to fetch banners");
    }
  }

  /**
   * Get active banners
   */
  async getActiveStripBanners(): Promise<Result<StripBanner[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.STRIP_BANNERS),
        where("active", "==", true),
        orderBy("displayOrder", "asc")
      );

      const querySnapshot = await getDocs(q);
      const banners = querySnapshot.docs.map((doc) => doc.data() as StripBanner);
      return ok(banners);
    } catch (error) {
      logError("StripBannerService.getActiveStripBanners", error);
      return fail("Failed to fetch active banners");
    }
  }

  /**
   * Get banners with pagination
   */
  async getStripBanners(
    filters?: {
      field: keyof StripBanner;
      op: any;
      value: any;
    }[],
    options: PaginationOptions<StripBanner> = {}
  ): Promise<Result<PaginatedResult<StripBanner>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = { field: 'createdAt', direction: 'desc' },
        pageDirection = 'next',
        cursor = null
      } = options;

      let q: any = collection(db, COLLECTION.STRIP_BANNERS);

      // Apply filters if provided
      if (filters && filters.length > 0) {
        const whereClauses = filters.map((f) =>
          where(f.field as string, f.op, f.value)
        );
        q = query(q, ...whereClauses);
      }

      // Apply ordering
      const { field, direction } = orderByOption;

      // For pagination, we need to handle different scenarios
      const queryConstraints = [
        orderBy(field as string, direction),
      ];

      if (pageDirection === 'previous' && cursor) {
        queryConstraints.push(orderBy(field as string, direction));
      } else if (cursor) {
        queryConstraints.push(orderBy(field as string, direction));
      }

      q = query(q, ...queryConstraints);

      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs;

      const banners = documents.map(doc => {
        const data = doc.data() as StripBanner;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as StripBanner;
      });

      const hasNextPage = documents.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;
      const nextCursor = hasNextPage ? documents[documents.length - 1] : null;
      const previousCursor = hasPreviousPage ? documents[0] : null;

      return ok({
        data: banners,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount: documents.length
      });
    } catch (error) {
      console.error('StripBannerService - Error fetching banners:', error);
      return fail("Error fetching banners");
    }
  }

  /**
   * Delete a strip banner
   */
  async deleteStripBanner(id: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, COLLECTION.STRIP_BANNERS, id));
      console.log("StripBannerService - Deleted banner:", id);
      return ok(null);
    } catch (error) {
      logError("StripBannerService.deleteStripBanner", error);
      return fail("Failed to delete banner");
    }
  }

  /**
   * Toggle banner active status
   */
  async toggleStripBannerActive(id: string): Promise<Result<void>> {
    try {
      const bannerRef = doc(db, COLLECTION.STRIP_BANNERS, id);
      const bannerDoc = await getDoc(bannerRef);

      if (!bannerDoc.exists()) {
        return fail("Banner not found", "NOT_FOUND");
      }

      const currentActive = bannerDoc.data().active;
      await updateDoc(bannerRef, {
        active: !currentActive,
        updatedAt: serverTimestamp(),
      });

      return ok(null);
    } catch (error) {
      logError("StripBannerService.toggleStripBannerActive", error);
      return fail("Failed to toggle banner status");
    }
  }

  /**
   * Reorder banners
   */
  async reorderBanners(bannerIds: string[]): Promise<Result<void>> {
    try {
      const updates = bannerIds.map(async (bannerId, index) => {
        const bannerRef = doc(db, COLLECTION.STRIP_BANNERS, bannerId);
        await updateDoc(bannerRef, {
          displayOrder: index,
          updatedAt: serverTimestamp(),
        });
      });

      await Promise.all(updates);
      return ok(null);
    } catch (error) {
      logError("StripBannerService.reorderBanners", error);
      return fail("Failed to reorder banners");
    }
  }

  private generateBannerId(): string {
    return `strip_banner_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export const stripBannerService = new StripBannerService();

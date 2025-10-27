import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  WhereFilterOp,
  arrayUnion,
  increment,
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";

import { Coupon, CouponUsage } from "@/types/coupon";

/**
 * Service class for managing coupons and coupon usage tracking.
 * Handles CRUD operations, filtering, and ID generation.
 */
class CouponService {
  private readonly COUPON_COUNTER_ID = "couponCounter";
  private readonly COUPON_BASE_ID = 70000000;
  private readonly COUPON_GAP_MIN = 20;
  private readonly COUPON_GAP_MAX = 50;

  /**
   * Generates a unique coupon ID using a transaction-based counter.
   * Uses random gaps between IDs for security.
   *
   * @returns A unique coupon ID string in format: `coupon_########`.
   */
  private async generateCouponId(): Promise<string> {
    const counterRef = doc(db, COLLECTION.COUNTERS, this.COUPON_COUNTER_ID);

    const newId = await runTransaction(db, async (transaction) => {
      const gap =
        Math.floor(
          Math.random() * (this.COUPON_GAP_MAX - this.COUPON_GAP_MIN + 1),
        ) + this.COUPON_GAP_MIN;

      const counterDoc = await transaction.get(counterRef);

      let lastNumber = this.COUPON_BASE_ID;
      if (counterDoc.exists()) {
        lastNumber = counterDoc.data().lastNumber;
      }

      const nextNumber = lastNumber + gap;
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    return `coupon_${newId}`;
  }

  /**
   * Creates a new coupon in Firestore.
   *
   * @param data - Coupon data without id, createdAt, and updatedAt fields.
   * @returns A Result object containing the created coupon ID on success, or an error message on failure.
   */
  async createCoupon(
    data: Omit<Coupon, "id" | "createdAt" | "updatedAt">,
  ): Promise<Result<string>> {
    try {
      const couponId = await this.generateCouponId();

      const newCoupon: Coupon = {
        ...data,
        id: couponId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, COLLECTION.COUPONS, couponId), newCoupon);

      return ok(couponId);
    } catch (error) {
      logError("CouponService.createCoupon", error);
      return fail("Failed to create coupon", error.code);
    }
  }

  /**
   * Updates an existing coupon.
   *
   * @param couponId - The ID of the coupon to update.
   * @param updates - Partial coupon object containing fields to update.
   * @returns A Result object indicating success or failure.
   */
  async updateCoupon(
    couponId: string,
    updates: Partial<Coupon>,
  ): Promise<Result<void>> {
    try {
      const couponRef = doc(db, COLLECTION.COUPONS, couponId);
      const couponDoc = await getDoc(couponRef);

      if (!couponDoc.exists()) {
        return fail("Coupon not found", "NOT_FOUND");
      }

      await updateDoc(couponRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      return ok(null);
    } catch (error) {
      logError("CouponService.updateCoupon", error);
      return fail("Failed to update coupon", error.code);
    }
  }

  /**
   * Fetches a coupon by its unique ID.
   *
   * @param couponId - The unique coupon ID.
   * @returns A Result object containing the Coupon if found, or an error if not found.
   */
  async getCouponById(couponId: string): Promise<Result<Coupon>> {
    try {
      const docSnap = await getDoc(doc(db, COLLECTION.COUPONS, couponId));

      if (!docSnap.exists()) {
        return fail("Coupon not found", "NOT_FOUND");
      }

      const coupon = docSnap.data() as Coupon;
      return ok(coupon);
    } catch (error) {
      logError("CouponService.getCouponById", error);
      return fail("Failed to fetch coupon", error.code);
    }
  }

  /**
   * Fetches a coupon by its code field.
   *
   * @param code - The unique coupon code string.
   * @returns A Result object containing the Coupon if found, or an error if not found.
   */
  async getCouponByCode(code: string): Promise<Result<Coupon>> {
    try {
      const q = query(
        collection(db, COLLECTION.COUPONS),
        where("code", "==", code),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return fail("Coupon not found", "NOT_FOUND");
      }

      // Assuming codes are unique, take the first doc
      const coupon = snapshot.docs[0].data() as Coupon;
      return ok(coupon);
    } catch (error) {
      logError("CouponService.getCouponByCode", error);
      return fail("Failed to fetch coupon by code", error.code);
    }
  }

  /**
   * Retrieves all coupons from Firestore.
   *
   * @returns A Result object containing an array of all Coupon objects.
   */
  async getAllCoupons(): Promise<Result<Coupon[]>> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION.COUPONS));
      const coupons = snapshot.docs.map((doc) => doc.data() as Coupon);

      return ok(coupons);
    } catch (error) {
      logError("CouponService.getAllCoupons", error);
      return fail("Failed to fetch coupons", error.code);
    }
  }

  /**
   * Retrieves coupons based on dynamic filters.
   *
   * @param filters - Optional array of filter conditions.
   * @returns A Result object containing an array of filtered Coupon objects.
   */
  async getFilteredCoupons(
    filters?: { field: keyof Coupon; op: WhereFilterOp; value }[],
  ): Promise<Result<Coupon[]>> {
    try {
      const ref = collection(db, COLLECTION.COUPONS);

      let snapshot;
      if (filters && filters.length > 0) {
        const q = query(
          ref,
          ...filters.map((f) => where(f.field as string, f.op, f.value)),
        );
        snapshot = await getDocs(q);
      } else {
        snapshot = await getDocs(ref);
      }

      const coupons = snapshot.docs.map((doc) => doc.data() as Coupon);
      return ok(coupons);
    } catch (error) {
      logError("CouponService.getFilteredCoupons", error);
      return fail("Failed to filter coupons", error.code);
    }
  }

  /**
   * Deletes a coupon from Firestore.
   *
   * @param couponId - The ID of the coupon to delete.
   * @returns A Result object indicating success or failure.
   */
  async deleteCoupon(couponId: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, COLLECTION.COUPONS, couponId));

      return ok(null);
    } catch (error) {
      logError("CouponService.deleteCoupon", error);
      return fail("Failed to delete coupon", error.code);
    }
  }

  /**
   * Records a coupon usage event in Firestore.
   *
   * @param usage - The CouponUsage object to store.
   * @returns A Result object indicating success or failure.
   */
  async createCouponUsage(usage: CouponUsage): Promise<Result<void>> {
    try {
      const usageRef = doc(db, COLLECTION.COUPON_USAGES, usage.id);
      await setDoc(usageRef, usage);

      return ok(null);
    } catch (error) {
      logError("CouponService.createCouponUsage", error);
      return fail("Failed to create coupon usage", error.code);
    }
  }

  /**
   * Fetches all coupon usages for a specific user.
   *
   * @param userId - The unique user ID.
   * @returns A Result object containing an array of CouponUsage records.
   */
  async getCouponUsagesByUser(userId: string): Promise<Result<CouponUsage[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.COUPON_USAGES),
        where("userId", "==", userId),
      );
      const snapshot = await getDocs(q);
      const usages = snapshot.docs.map((doc) => doc.data() as CouponUsage);

      return ok(usages);
    } catch (error) {
      logError("CouponService.getCouponUsagesByUser", error);
      return fail("Failed to fetch coupon usage", error.code);
    }
  }


async  addUserCouponUsage(
  userId: string,
  couponId: string
): Promise<Result<string>> {
  const couponRef = doc(db, COLLECTION.COUPONS, couponId);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.update(couponRef, {
        currentUsageCount: increment(1),
        usedByUserIds: arrayUnion(userId),
        updatedAt: Timestamp.now(),
      });
    });

    return ok("Coupon usage updated successfully!");
  } catch (error: any) {
    console.error("Failed to update coupon usage:", error);
    return fail(
      "Failed to update coupon usage",
      error?.code,
      error?.stack
    );
  }
}

}

export const couponService = new CouponService();

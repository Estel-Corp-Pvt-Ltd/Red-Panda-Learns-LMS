import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  runTransaction,
  Timestamp,
  WhereFilterOp,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { Coupon,CouponStatus,CouponUsage } from '@/types/coupon.';
import { error } from 'console';
class CouponService {
  private async generateCouponId(): Promise<string> {
    const counterRef = doc(db, 'counters', 'couponCounter');

    const newId = await runTransaction(db, async (transaction) => {
      const gap = Math.floor(Math.random() * (50 - 20 + 1)) + 20; // 20–50 gap
      const counterDoc = await transaction.get(counterRef);

      let lastNumber = 70000000;
      if (counterDoc.exists()) {
        lastNumber = counterDoc.data().lastNumber;
      }

      const nextNumber = lastNumber + gap;
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    return `coupon_${newId}`;
  }

  async createCoupon(data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const couponId = await this.generateCouponId();

      const newCoupon: Coupon = {
        ...data,
        id: couponId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'Coupons', couponId), newCoupon);
      console.log('Coupon created:', couponId);
      return couponId;
    } catch (error) {
      console.error('Error creating coupon:', error);
      throw new Error('Failed to create coupon');
    }
  }



  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<void> {
    try {
      const couponRef = doc(db, 'Coupons', couponId);
      const couponDoc = await getDoc(couponRef);

      if (!couponDoc.exists()) {
        throw new Error('Coupon not found');
      }

      await updateDoc(couponRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      console.log('Coupon updated:', couponId);
    } catch (error) {
      console.error('Error updating coupon:', error);
      throw new Error('Failed to update coupon');
    }
  }

  async getCouponById(couponId: string): Promise<Coupon | null> {
    try {
      const docSnap = await getDoc(doc(db, 'Coupons', couponId));
      if (!docSnap.exists()) return null;

      const coupon = docSnap.data() as Coupon;
      return coupon;
    } catch (error) {
      console.error('Error fetching coupon:', error);
      return null;
    }
  }

  async getAllCoupons(): Promise<Coupon[]> {
    try {
      const snapshot = await getDocs(collection(db, 'Coupons'));
      return snapshot.docs.map((doc) => doc.data() as Coupon);
    } catch (error) {
      console.error('Error fetching all coupons:', error);
      return [];
    }
  }

  async deleteCoupon(couponId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'Coupons', couponId));
      console.log('Coupon deleted:', couponId);
    } catch (error) {
      console.error('Error deleting coupon:', error);
      throw new Error('Failed to delete coupon');
    }
  }

  async getFilteredCoupons(
    filters?: { field: keyof Coupon; op: WhereFilterOp; value: any }[]
  ): Promise<Coupon[]> {
    try {
      let ref = collection(db, 'Coupons');

      if (filters && filters.length > 0) {
        const q = query(
          ref,
          ...filters.map((f) => where(f.field as string, f.op, f.value))
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data() as Coupon);
      } else {
        const snapshot = await getDocs(ref);
        return snapshot.docs.map((doc) => doc.data() as Coupon);
      }
    } catch (error) {
      console.error('Error filtering coupons:', error);
      return [];
    }
  }

  async createCouponUsage(usage: CouponUsage): Promise<void> {
    try {
      const usageRef = doc(db, 'CouponUsage', usage.id);
      await setDoc(usageRef, usage);
      console.log('Coupon usage recorded:', usage.id);
    } catch (error) {
      console.error('Error creating coupon usage:', error);
      throw new Error('Failed to create coupon usage');
    }
  }

  async getCouponUsagesByUser(userId: string): Promise<CouponUsage[]> {
    try {
      const q = query(collection(db, 'CouponUsage'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as CouponUsage);
    } catch (error) {
      console.error('Error fetching coupon usage:', error);
      return [];
    }
  }


  
  /**
   * Fetches a coupon document by its code field.
   * @param code - The unique coupon code string.
   * @returns The Coupon object if found, or null if not found.
   */
  async getCouponByCode(code: string): Promise<Coupon | null> {
    try {
      const q = query(collection(db, 'Coupons'), where('code', '==', code));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      // Assuming codes are unique, take the first doc
      const coupon = snapshot.docs[0].data() as Coupon;
      return coupon;
    } catch (error) {
      console.error('Error fetching coupon by code:', error);
      return null;
    }
  }

}

export const couponService = new CouponService();

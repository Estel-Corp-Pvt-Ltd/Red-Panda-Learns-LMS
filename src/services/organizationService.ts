import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { ORGANIZATION } from "@/constants";
import { OrganizationType } from "@/types/general";
import { Organization } from "@/types/organization";

class OrganizationService {
  /** Generate a unique organization ID: org_<number> */
  private async generateOrganizationId(): Promise<string> {
    const counterRef = doc(db, "counters", "organizationCounter");

    const newId = await runTransaction(db, async (transaction) => {
      const gap = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
      const counterDoc = await transaction.get(counterRef);

      let lastNumber = 10000000;
      if (counterDoc.exists()) lastNumber = counterDoc.data().lastNumber;

      const nextNumber = lastNumber + gap;
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    return `org_${newId}`;
  }

  /** Create an organization document */
  async createOrganization(
    data: Omit<Organization, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = await this.generateOrganizationId();
    const org: Organization = {
      id,
      name: data.name.trim(),
      type: data.type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, "organizations", id), org);
    console.log("OrganizationService - created:", id);
    return id;
  }

  /** Fetch all */
  async getAllOrganizations(): Promise<Organization[]> {
    const querySnapshot = await getDocs(collection(db, "organizations"));
    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.() ?? null,
      } as Organization;
    });
  }

  /** Fetch one by ID */
  async getOrganizationById(id: string): Promise<Organization | null> {
    const docSnap = await getDoc(doc(db, "organizations", id));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? null,
      updatedAt: data.updatedAt?.toDate?.() ?? null,
    } as Organization;
  }

  /** Update */
  async updateOrganization(id: string, updates: Partial<Organization>): Promise<void> {
    const ref = doc(db, "organizations", id);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    console.log("OrganizationService - updated:", id);
  }

  /** Delete */
  async deleteOrganization(id: string): Promise<void> {
    await deleteDoc(doc(db, "organizations", id));
    console.log("OrganizationService - deleted:", id);
  }
}

export const organizationService = new OrganizationService();
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
import { COLLECTION } from "@/constants";
import { Organization } from "@/types/organization";

class OrganizationService {
  /** Generate a unique organization ID: org_<number> */
  private async generateOrganizationId(): Promise<string> {
    try {
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
    } catch (error) {
      console.error("OrganizationService - Error generating ID:", error);
      throw new Error("Failed to generate organization ID");
    }
  }

  /** Create an organization document */
  async createOrganization(
    data: Omit<Organization, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const id = await this.generateOrganizationId();
      const org: Organization = {
        id,
        name: data.name.trim(),
        type: data.type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.ORGANIZATIONS, id), org);  // 👈 use constant
      console.log("OrganizationService - created:", id);
      return id;
    } catch (error) {
      console.error("OrganizationService - Error creating organization:", error);
      throw new Error("Failed to create organization");
    }
  }

  /** Fetch all organizations */
  async getAllOrganizations(): Promise<Organization[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION.ORGANIZATIONS));
      const orgs = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? null,
        } as Organization;
      });
      console.log("OrganizationService - Fetched:", orgs.length);
      return orgs;
    } catch (error) {
      console.error("OrganizationService - Error fetching organizations:", error);
      throw new Error("Failed to fetch organizations");
    }
  }

  /** Fetch organization by ID */
  async getOrganizationById(id: string): Promise<Organization | null> {
    try {
      const docSnap = await getDoc(doc(db, COLLECTION.ORGANIZATIONS, id));  // 👈 use constant
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.() ?? null,
      } as Organization;
    } catch (error) {
      console.error("OrganizationService - Error fetching organization:", error);
      throw new Error("Failed to fetch organization");
    }
  }

  /** Update organization */
  async updateOrganization(id: string, updates: Partial<Organization>): Promise<void> {
    try {
      const ref = doc(db, COLLECTION.ORGANIZATIONS, id);  // 👈 use constant
      await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
      console.log("OrganizationService - updated:", id);
    } catch (error) {
      console.error("OrganizationService - Error updating organization:", error);
      throw new Error("Failed to update organization");
    }
  }

  /** Delete organization */
  async deleteOrganization(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION.ORGANIZATIONS, id));  // 👈 use constant
      console.log("OrganizationService - deleted:", id);
    } catch (error) {
      console.error("OrganizationService - Error deleting organization:", error);
      throw new Error("Failed to delete organization");
    }
  }
}

export const organizationService = new OrganizationService();

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
  Query,
  where,
  query,
  orderBy,
  endBefore,
  limitToLast,
  startAfter,
  limit,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";
import { Organization } from "@/types/organization";
import { WhereFilterOp } from "firebase-admin/firestore";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";
import { fail, ok, Result } from "@/utils/response";

class OrganizationService {
  /** Generate a unique organization ID: org_<number> */
  private async generateOrganizationId(): Promise<string> {
    try {
      const counterRef = doc(db, COLLECTION.COUNTERS, "organizationCounter");

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
        classes: data.classes || [],
        divisions: data.divisions || [],
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
  async deleteOrganization(id: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, COLLECTION.ORGANIZATIONS, id));  // 👈 use constant
      console.log("OrganizationService - deleted:", id);
      return ok(null);
    } catch (error) {
      console.error("OrganizationService - Error deleting organization:", error);
      return fail("Failed to delete organization");
    }
  }

  async getOrganizations(
    filters?: {
      field: keyof Organization;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<Organization> = {}
  ): Promise<Result<PaginatedResult<Organization>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = { field: 'createdAt', direction: 'desc' },
        pageDirection = 'next',
        cursor = null
      } = options;

      let q: Query = collection(db, COLLECTION.ORGANIZATIONS);

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
      if (pageDirection === 'previous' && cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          endBefore(cursor),
          limitToLast(itemsPerPage)
        );
      } else if (cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      } else {
        q = query(
          q,
          orderBy(field as string, direction),
          limit(itemsPerPage)
        );
      }

      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs;

      console.log(`OrganizationService - Fetched ${documents.length} organizations`);

      if (pageDirection === 'previous') {
        documents.reverse();
      }

      const organizations = documents.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          classes: data.classes || [],
          divisions: data.divisions || [],
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as Organization;
      });

      const hasNextPage = querySnapshot.docs.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;
      const nextCursor = hasNextPage ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
      const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

      return ok({
        data: organizations,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount: querySnapshot.size
      });
    } catch (error) {
      console.error('OrganizationService - Error fetching organizations:', error);
      return fail("Error fetching organizations");
    }
  }
}

export const organizationService = new OrganizationService();

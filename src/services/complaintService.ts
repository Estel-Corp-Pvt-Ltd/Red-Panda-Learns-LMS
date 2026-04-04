import {
  addDoc,
  collection,
  doc,
  endBefore,
  getCountFromServer,
  getDocs,
  limit,
  limitToLast,
  orderBy,
  Query,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  where,
  WhereFilterOp,
  writeBatch,
} from "firebase/firestore";

import { COLLECTION } from "@/constants";

import { Complaint, ComplaintAction } from "@/types/complaint";

import { COMPLAINT_ACTION_TYPE, COMPLAINT_SEVERITY, COMPLAINT_STATUS } from "@/constants";

import { db } from "@/firebaseConfig";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";
import { fail, ok, Result } from "@/utils/response";

// import { getFunctions, httpsCallable } from "firebase/functions";

class ComplaintService {
  async createComplaint(
    data: Omit<
      Complaint,
      "id" | "status" | "createdAt" | "updatedAt" | "assignedTo" | "resolutionSummary" | "severity"
    >
  ): Promise<Result<string>> {
    try {
      // const res = await this.generateComplaintIdFn();
      // const idData = res.data as { success: boolean; message: string };
      //
      // if (!idData?.success) {
      //   return fail("Failed to generate complaint ID");
      // }
      //
      // const complaintId = idData.message;
      const complaintId = `COMPLAINT_${Date.now()}`;

      const complaintRef = doc(db, COLLECTION.COMPLAINTS, complaintId);

      const complaint = {
        id: complaintId,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        category: data.category,
        description: data.description,
        imageUrls: data.imageUrls,
        severity: COMPLAINT_SEVERITY.MEDIUM,
        relatedEntityId: data.relatedEntityId,
        status: COMPLAINT_STATUS.SUBMITTED,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(complaintRef, complaint);

      const actionsCol = collection(db, COLLECTION.COMPLAINTS, complaintId, "actions");

      await addDoc(actionsCol, {
        complaintId,
        actionBy: data.userId,
        actionType: COMPLAINT_ACTION_TYPE.CREATED,
        isInternal: false,
        createdAt: serverTimestamp(),
      });

      return ok(complaintId);
    } catch (error: any) {
      return fail("Failed to create complaint", error.code, error.stack);
    }
  }

  async assignComplaint(
    complaintId: string,
    assignedTo: string,
    actionBy: string,
    isInternal: boolean,
    comment?: string
  ): Promise<Result<void>> {
    try {
      const batch = writeBatch(db);
      const complaintRef = doc(db, COLLECTION.COMPLAINTS, complaintId);

      batch.update(complaintRef, {
        assignedTo,
        status: COMPLAINT_STATUS.UNDER_REVIEW,
        updatedAt: serverTimestamp(),
      });

      this.addAction(batch, complaintId, {
        complaintId,
        actionBy,
        actionType: COMPLAINT_ACTION_TYPE.ASSIGNED,
        comment,
        isInternal,
      });

      await batch.commit();
      return ok(undefined);
    } catch (error: any) {
      return fail("Failed to assign complaint", error.code, error.stack);
    }
  }

  async getComplaintsByUser(userId: string): Promise<Result<Complaint[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.COMPLAINTS),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const complaints: Complaint[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as Complaint),
      }));

      return ok(complaints);
    } catch (error: any) {
      return fail("Failed to fetch complaints for user", error.code, error.stack);
    }
  }

  async getLatestActionsForComplaints(
    complaintIds: string[]
  ): Promise<Result<Record<string, ComplaintAction | null>>> {
    try {
      const results = await Promise.all(
        complaintIds.map(async (complaintId) => {
          const q = query(
            collection(db, COLLECTION.COMPLAINTS, complaintId, "actions"),
            orderBy("createdAt", "desc"),
            limit(1)
          );

          const snap = await getDocs(q);

          if (snap.empty) {
            return [complaintId, null] as const;
          }

          const docSnap = snap.docs[0];

          return [
            complaintId,
            {
              ...(docSnap.data() as ComplaintAction),
            },
          ] as const;
        })
      );

      return ok(Object.fromEntries(results));
    } catch (error: any) {
      return fail("Failed to fetch latest complaint actions", error.code, error.stack);
    }
  }

  async resolveComplaint(
    complaintId: string,
    actionBy: string,
    comment?: string
  ): Promise<Result<void>> {
    try {
      const batch = writeBatch(db);
      const complaintRef = doc(db, COLLECTION.COMPLAINTS, complaintId);

      batch.update(complaintRef, {
        status: COMPLAINT_STATUS.RESOLVED,
        updatedAt: serverTimestamp(),
      });

      this.addAction(batch, complaintId, {
        complaintId,
        actionBy,
        actionType: COMPLAINT_ACTION_TYPE.RESOLVED,
        comment: comment || null,
        isInternal: false,
      });

      await batch.commit();
      return ok(null);
    } catch (error: any) {
      console.log("Error resolving complaint:", error);
      return fail("Failed to resolve complaint", error.code, error.stack);
    }
  }

  async getComplaints(
    filters?: {
      field: keyof Complaint;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<Complaint> = {}
  ): Promise<Result<PaginatedResult<Complaint>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = {
          field: "createdAt",
          direction: "desc",
        },
        pageDirection = "next",
        cursor = null,
      } = options;

      let q: Query = collection(db, COLLECTION.COMPLAINTS);

      // Apply filters
      if (filters && filters.length > 0) {
        const whereClauses = filters.map((f) => where(f.field as string, f.op, f.value));
        q = query(q, ...whereClauses);
      }

      // Count query (without pagination)
      const countQuery = query(q);
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data().count;

      const { field, direction } = orderByOption;

      // Pagination logic
      if (pageDirection === "previous" && cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          endBefore(cursor),
          limitToLast(itemsPerPage)
        );
      } else if (cursor) {
        q = query(q, orderBy(field as string, direction), startAfter(cursor), limit(itemsPerPage));
      } else {
        q = query(q, orderBy(field as string, direction), limit(itemsPerPage));
      }

      const querySnapshot = await getDocs(q);

      const documents = querySnapshot.docs;

      if (pageDirection === "previous") {
        documents.reverse();
      }

      const complaints: Complaint[] = documents.map((doc) => {
        const data = doc.data() as Complaint;
        return {
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate?.() || data.createdAt,
          updatedAt: (data.updatedAt as Timestamp)?.toDate?.() || data.updatedAt,
        };
      });

      const hasNextPage = querySnapshot.docs.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;

      const nextCursor = hasNextPage ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

      const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

      return ok({
        data: complaints,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount,
      });
    } catch (error: any) {
      return fail("Error fetching complaints", error.code, error.stack);
    }
  }

  async getComplaintActions(complaintId: string): Promise<Result<ComplaintAction[]>> {
    try {
      const actionsRef = collection(db, COLLECTION.COMPLAINTS, complaintId, "actions");
      const q = query(actionsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const actions: ComplaintAction[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      })) as ComplaintAction[];

      return { success: true, data: actions };
    } catch (error) {
      console.error("Error fetching complaint actions:", error);
      return {
        success: false,
        error: {
          message: "Failed to fetch actions",
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  // private functions = getFunctions();
  // private generateComplaintIdFn = httpsCallable(this.functions, "generateComplaintId");

  private addAction(
    batch: ReturnType<typeof writeBatch>,
    complaintId: string,
    action: Omit<ComplaintAction, "id" | "createdAt">
  ) {
    const actionRef = doc(collection(db, COLLECTION.COMPLAINTS, complaintId, "actions"));

    batch.set(actionRef, {
      id: actionRef.id,
      ...action,
      createdAt: serverTimestamp(),
    });
  }
}

export const complaintService = new ComplaintService();

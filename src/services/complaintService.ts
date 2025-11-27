import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    where,
    writeBatch
} from "firebase/firestore";

import {
    COLLECTION,
} from "@/constants";

import {
    Complaint,
    ComplaintAction,
} from "@/types/complaint";

import {
    COMPLAINT_ACTION_TYPE,
    COMPLAINT_SEVERITY,
    COMPLAINT_STATUS,
} from "@/constants";

import { db } from "@/firebaseConfig";
import { fail, ok, Result } from "@/utils/response";

class ComplaintService {

    private async generateComplaintId(): Promise<Result<string>> {
        try {
            const counterRef = doc(db, COLLECTION.COUNTERS, "complaintCounter");

            const nextNumber = await runTransaction(db, async (tx) => {
                const snap = await tx.get(counterRef);

                let lastNumber = 50000000;
                if (snap.exists()) {
                    lastNumber = snap.data().lastNumber;
                }

                const gap = Math.floor(Math.random() * (25 - 10 + 1)) + 10;
                const newNumber = lastNumber + gap;

                tx.set(counterRef, { lastNumber: newNumber }, { merge: true });
                return newNumber;
            });

            return ok(`CMP_${nextNumber}`);
        } catch (error: any) {
            return fail(
                "Failed to generate complaint ID",
                error.code,
                error.stack
            );
        }
    }

    private addAction(
        batch: ReturnType<typeof writeBatch>,
        complaintId: string,
        action: Omit<ComplaintAction, "id" | "createdAt">
    ) {
        const actionRef = doc(
            collection(
                db,
                COLLECTION.COMPLAINTS,
                complaintId,
                "actions"
            )
        );

        batch.set(actionRef, {
            id: actionRef.id,
            ...action,
            createdAt: serverTimestamp(),
        });
    }

    async createComplaint(
        data: Omit<
            Complaint,
            | "id"
            | "status"
            | "createdAt"
            | "updatedAt"
            | "assignedTo"
            | "resolutionSummary"
            | "severity"
        >
    ): Promise<Result<string>> {
        try {
            const idResult = await this.generateComplaintId();
            if (!idResult.success) return idResult;

            const complaintId = idResult.data!;
            const batch = writeBatch(db);

            const complaint: Complaint = {
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

            const complaintRef = doc(db, COLLECTION.COMPLAINTS, complaintId);
            batch.set(complaintRef, complaint);

            this.addAction(batch, complaintId, {
                complaintId,
                actionBy: data.userId,
                actionType: COMPLAINT_ACTION_TYPE.CREATED,
                isInternal: false,
            });

            await batch.commit();
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

    async getComplaintsByUser(
        userId: string
    ): Promise<Result<Complaint[]>> {
        try {
            const q = query(
                collection(db, COLLECTION.COMPLAINTS),
                where("userId", "==", userId),
                orderBy("createdAt", "desc")
            );

            const snapshot = await getDocs(q);

            const complaints: Complaint[] = snapshot.docs.map(doc => ({
                ...(doc.data() as Complaint),
            }));

            return ok(complaints);
        } catch (error: any) {
            return fail(
                "Failed to fetch complaints for user",
                error.code,
                error.stack
            );
        }
    }

    async getLatestActionsForComplaints(
        complaintIds: string[]
    ): Promise<Result<Record<string, ComplaintAction | null>>> {
        try {
            const results = await Promise.all(
                complaintIds.map(async (complaintId) => {
                    const q = query(
                        collection(
                            db,
                            COLLECTION.COMPLAINTS,
                            complaintId,
                            "actions"
                        ),
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
            return fail(
                "Failed to fetch latest complaint actions",
                error.code,
                error.stack
            );
        }
    }
}

export const complaintService = new ComplaintService();

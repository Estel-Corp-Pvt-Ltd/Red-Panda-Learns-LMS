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
    Timestamp,
    updateDoc,
    where,
    WhereFilterOp,
} from "firebase/firestore";

import { COLLECTION } from "@/constants";
import { db } from "@/firebaseConfig";
import { PopUp } from "@/types/pop-up";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";

class PopUpService {
    private readonly MAX_POPUPS = 3;

    /**
     * Creates a new pop-up in Firestore.
     * If 3 pop-ups are already active, deactivates the oldest one first.
     */
    async createPopUp(
        data: Omit<PopUp, "id" | "active" | "createdAt" | "updatedAt">
    ): Promise<Result<PopUp>> {
        try {
            // Fetch active pop-ups ordered by updatedAt (oldest first)
            const activePopUpsResult = await this.getActivePopUps();
            const activePopUps = activePopUpsResult.data;

            // Deactivate the oldest active pop-up if limit exceeded
            if (activePopUps.length >= this.MAX_POPUPS) {
                const oldestPopUp = activePopUps[0];
                await this.deactivatePopUp(oldestPopUp.id);
            }

            const popUpId = this.generatePopUpId();
            const popUp: PopUp = {
                id: popUpId,
                icon: data.icon || "",
                title: data.title,
                description: data.description,
                type: data.type,
                ctaText: data.ctaText,
                ctaLink: data.ctaLink,
                autoClose: data.autoClose || false,
                duration: data.duration || 5000,
                active: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, COLLECTION.POPUPS, popUpId), popUp);
            console.log("PopUpService - Pop-up created:", popUpId);
            return ok(popUp);
        } catch (error) {
            logError("PopUpService.createPopUp", error);
            return fail("Failed to create pop-up");
        }
    }

    /**
     * Updates an existing pop-up document.
     * If activating and limit is reached, deactivates the oldest.
     */
    async updatePopUp(id: string, updates: Partial<PopUp>): Promise<Result<void>> {
        try {
            const popUpRef = doc(db, COLLECTION.POPUPS, id);
            const popUpDoc = await getDoc(popUpRef);
            if (!popUpDoc.exists()) return fail("Pop-up not found", "NOT_FOUND");

            const currentPopUp = popUpDoc.data() as PopUp;

            // Handle activation rule
            if (updates.active === true && !currentPopUp.active) {
                const activePopUpsResult = await this.getActivePopUps();
                if (!activePopUpsResult) return fail("Failed to fetch active pop-ups");

                const activePopUps = activePopUpsResult.data;
                if (activePopUps.length >= this.MAX_POPUPS) {
                    const oldestPopUp = activePopUps[0];
                    await this.deactivatePopUp(oldestPopUp.id);
                }
            }

            const updateData: Partial<PopUp> = {
                updatedAt: serverTimestamp(),
                ...updates,
            };

            await updateDoc(popUpRef, updateData);
            console.log("PopUpService - Updated pop-up:", id);
            return ok(null);
        } catch (error) {
            logError("PopUpService.updatePopUp", error);
            return fail("Failed to update pop-up");
        }
    }

    /**
     * Retrieves a pop-up by ID.
     */
    async getPopUpById(id: string): Promise<Result<PopUp | null>> {
        try {
            const popUpDoc = await getDoc(doc(db, COLLECTION.POPUPS, id));
            if (!popUpDoc.exists()) return ok(null);

            const data = popUpDoc.data();
            const popUp: PopUp = {
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as PopUp;

            return ok(popUp);
        } catch (error) {
            logError("PopUpService.getPopUpById", error);
            return fail("Failed to fetch pop-up by ID");
        }
    }

    /**
     * Retrieves all active pop-ups ordered by updatedAt (oldest first).
     */
    async getActivePopUps(): Promise<Result<PopUp[]>> {
        try {
            const popUpsRef = collection(db, COLLECTION.POPUPS);
            const q = query(popUpsRef, where("active", "==", true));
            const querySnapshot = await getDocs(q);

            const popUps = querySnapshot.docs.map((doc) => {
                const data = doc.data() as PopUp;
                return {
                    ...data,
                    createdAtDate: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                    updatedAtDate: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
                };
            });

            // Sort using the temporary Date fields
            popUps.sort((a, b) => a.updatedAtDate.getTime() - b.updatedAtDate.getTime());

            // Return original objects without the temporary fields
            return ok(popUps as PopUp[]);
        } catch (error) {
            logError("PopUpService.getActivePopUps", error);
            return fail("Failed to fetch active pop-ups");
        }
    }

    /**
     * Retrieves all pop-ups.
     */
    async getAllPopUps(): Promise<Result<PopUp[]>> {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION.POPUPS));
            const popUps = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as PopUp;
            });

            return ok(popUps);
        } catch (error) {
            logError("PopUpService.getAllPopUps", error);
            return fail("Failed to fetch all pop-ups");
        }
    }

    /**
     * Deletes a pop-up by ID.
     */
    async deletePopUp(id: string): Promise<Result<void>> {
        try {
            await deleteDoc(doc(db, COLLECTION.POPUPS, id));
            console.log("PopUpService - Deleted pop-up:", id);
            return ok(null);
        } catch (error) {
            logError("PopUpService.deletePopUp", error);
            return fail("Failed to delete pop-up");
        }
    }

    /**
     * Activates a pop-up (and deactivates the oldest if necessary).
     */
    async activatePopUp(id: string): Promise<Result<void>> {
        try {
            const popUpResult = await this.getPopUpById(id);
            if (!popUpResult || !popUpResult.data) return fail("Pop-up not found", "NOT_FOUND");

            const activePopUpsResult = await this.getActivePopUps();
            if (!activePopUpsResult) return fail("Failed to fetch active pop-ups");

            const activePopUps = activePopUpsResult.data;
            if (activePopUps.length >= this.MAX_POPUPS) {
                const oldestPopUp = activePopUps[0];
                await this.deactivatePopUp(oldestPopUp.id);
            }

            return await this.updatePopUp(id, { active: true });
        } catch (error) {
            logError("PopUpService.activatePopUp", error);
            return fail("Failed to activate pop-up");
        }
    }

    /**
     * Deactivates a pop-up.
     */
    async deactivatePopUp(id: string): Promise<Result<void>> {
        try {
            await this.updatePopUp(id, { active: false });
            console.log("PopUpService - Deactivated pop-up:", id);
            return ok(null);
        } catch (error) {
            logError("PopUpService.deactivatePopUp", error);
            return fail("Failed to deactivate pop-up");
        }
    }

    /**
     * Generates a unique pop-up ID.
     */
    private generatePopUpId(): string {
        return `popup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export const popUpService = new PopUpService();

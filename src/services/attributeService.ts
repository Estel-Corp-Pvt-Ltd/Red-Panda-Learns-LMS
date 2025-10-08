import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTIONS } from "@/constants";
import { Attribute } from "@/types/attribute";

export class AttributeService {
  private collectionName = COLLECTIONS.ATTRIBUTES;

  async getAttributes(type: Attribute["type"]): Promise<Attribute[]> {
    try {
      const q = query(collection(db, this.collectionName), where("type", "==", type));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          type: data.type,
          createdAt: data.createdAt as Timestamp,
          updatedAt: data.updatedAt as Timestamp | undefined,
        };
      });
    } catch (error) {
      console.error("Failed to fetch attributes:", error);
      return [];
    }
  }

  /** Add a new attribute (Category or TargetAudience) */
  async addAttribute(
    type: Attribute["type"],
    name: string
  ): Promise<Attribute | null> {
    try {
      const newAttr = {
        name,
        type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.collectionName), newAttr);

      return {
        id: docRef.id,
        ...newAttr,
      } as Attribute;
    } catch (error) {
      console.error("Failed to add attribute:", error);
      return null;
    }
  }

  /** Delete an attribute by ID */
  async deleteAttribute(attributeId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, attributeId));
      return true;
    } catch (error) {
      console.error("Failed to delete attribute:", error);
      return false;
    }
  }
}

// Singleton instance
export const attributeService = new AttributeService();

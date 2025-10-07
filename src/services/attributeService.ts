// services/attributeService.ts
import { collection, getDocs, addDoc, query, where , deleteDoc , doc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

export interface Attribute {
  id: string;
  name: string;
  type: "Category" | "TargetAudience";
  createdAt: Date;
  updatedAt?: Date;
}

class attributeService {
  private collectionName = "Attributes";

  /** Fetch all attributes of a given type */
  async getAttributes(type: "Category" | "TargetAudience"): Promise<Attribute[]> {
    try {
      const q = query(collection(db, this.collectionName), where("type", "==", type));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate ? doc.data().updatedAt.toDate() : undefined,
      })) as Attribute[];
    } catch (error) {
      console.error("Failed to fetch attributes:", error);
      return [];
    }
  }

  /** Add a new attribute (Category or TargetAudience) */
  async addAttribute(type: "Category" | "TargetAudience", name: string): Promise<Attribute | null> {
    try {
      const newAttr = {
        name,
        type,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, this.collectionName), newAttr);
      return { id: docRef.id, ...newAttr };
    } catch (error) {
      console.error("Failed to add attribute:", error);
      return null;
    }
  }

  /** Optional: delete an attribute by ID */
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

export const AttributeService = new attributeService();

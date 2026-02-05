import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { COLLECTION } from "@/constants";
import { db } from "@/firebaseConfig";
import { ZoomHost, CreateZoomHostInput, UpdateZoomHostInput } from "@/types/zoom-host";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";

/**
 * Service for managing Zoom hosts in Firestore.
 * Provides CRUD operations for predefined Zoom meeting hosts.
 */
class ZoomHostService {
  private readonly collectionRef = collection(db, COLLECTION.ZOOM_HOSTS);

  /**
   * Fetches all active Zoom hosts, sorted by display order.
   * @returns Promise resolving to an array of active ZoomHost objects
   */
  async getActiveHosts(): Promise<Result<ZoomHost[]>> {
    try {
      const q = query(this.collectionRef, where("isActive", "==", true));

      const snapshot = await getDocs(q);

      const hosts = snapshot.docs.map((doc) => this.mapDocToHost(doc));

      return ok(hosts);
    } catch (error: any) {
      logError("ZoomHostService.getActiveHosts", error);
      return fail("Failed to fetch active Zoom hosts");
    }
  }

  /**
   * Fetches all Zoom hosts (including inactive), sorted by display order.
   * Useful for admin management interfaces.
   * @returns Promise resolving to an array of all ZoomHost objects
   */
  async getAllHosts(): Promise<Result<ZoomHost[]>> {
    try {
      const q = query(this.collectionRef, orderBy("displayOrder", "asc"));

      const snapshot = await getDocs(q);

      const hosts = snapshot.docs.map((doc) => this.mapDocToHost(doc));

      return ok(hosts);
    } catch (error: any) {
      logError("ZoomHostService.getAllHosts", error);
      return fail("Failed to fetch all Zoom hosts");
    }
  }

  /**
   * Fetches a single Zoom host by ID.
   * @param hostId - The unique identifier of the host
   * @returns Promise resolving to the ZoomHost object or null if not found
   */
  async getHostById(hostId: string): Promise<Result<ZoomHost | null>> {
    try {
      const docRef = doc(this.collectionRef, hostId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return ok(null);
      }

      return ok(this.mapDocToHost(docSnap));
    } catch (error: any) {
      logError("ZoomHostService.getHostById", error);
      return fail("Failed to fetch Zoom host");
    }
  }

  /**
   * Creates a new Zoom host.
   * @param input - The host data to create
   * @returns Promise resolving to the created ZoomHost object
   */
  async createHost(input: CreateZoomHostInput): Promise<Result<ZoomHost>> {
    try {
      const hostId = doc(this.collectionRef).id;

      const hostData = {
        ...input,
        id: hostId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(this.collectionRef, hostId), hostData);

      // Return the created host (with placeholder timestamps)
      return ok({
        ...hostData,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      } as ZoomHost);
    } catch (error: any) {
      logError("ZoomHostService.createHost", error);
      return fail("Failed to create Zoom host");
    }
  }

  /**
   * Updates an existing Zoom host.
   * @param hostId - The unique identifier of the host to update
   * @param input - The fields to update
   * @returns Promise resolving to success/failure result
   */
  async updateHost(hostId: string, input: UpdateZoomHostInput): Promise<Result<void>> {
    try {
      const docRef = doc(this.collectionRef, hostId);

      await updateDoc(docRef, {
        ...input,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error: any) {
      logError("ZoomHostService.updateHost", error);
      return fail("Failed to update Zoom host");
    }
  }

  /**
   * Deletes a Zoom host.
   * @param hostId - The unique identifier of the host to delete
   * @returns Promise resolving to success/failure result
   */
  async deleteHost(hostId: string): Promise<Result<void>> {
    try {
      const docRef = doc(this.collectionRef, hostId);
      await deleteDoc(docRef);

      return ok(undefined);
    } catch (error: any) {
      logError("ZoomHostService.deleteHost", error);
      return fail("Failed to delete Zoom host");
    }
  }

  /**
   * Toggles the active status of a Zoom host.
   * @param hostId - The unique identifier of the host
   * @param isActive - The new active status
   * @returns Promise resolving to success/failure result
   */
  async setHostActiveStatus(hostId: string, isActive: boolean): Promise<Result<void>> {
    return this.updateHost(hostId, { isActive });
  }

  /**
   * Maps a Firestore document to a ZoomHost object.
   * @param doc - The Firestore document snapshot
   * @returns The mapped ZoomHost object
   */
  private mapDocToHost(doc: any): ZoomHost {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
    } as ZoomHost;
  }
}

export const zoomHostService = new ZoomHostService();

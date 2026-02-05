import { FieldValue, Timestamp } from "firebase/firestore";

/**
 * Represents a Zoom host configuration stored in Firestore.
 * Used for predefined hosts in Zoom meeting creation.
 */
export interface ZoomHost {
  /** Unique identifier for the host */
  id: string;

  /** Display name for the host */
  name: string;

  /** Email address associated with the Zoom account */
  email: string;

  /** Whether this host is currently active and available for selection */
  isActive: boolean;

  /** Optional description or notes about this host */
  description?: string;

  /** Display order for sorting hosts in the UI */
  displayOrder?: number;

  /** Timestamp when the host was created */
  createdAt: Timestamp | FieldValue;

  /** Timestamp when the host was last updated */
  updatedAt: Timestamp | FieldValue;
}

/**
 * Input type for creating a new Zoom host (without system-generated fields)
 */
export type CreateZoomHostInput = Omit<ZoomHost, "id" | "createdAt" | "updatedAt">;

/**
 * Input type for updating an existing Zoom host
 */
export type UpdateZoomHostInput = Partial<Omit<ZoomHost, "id" | "createdAt" | "updatedAt">>;

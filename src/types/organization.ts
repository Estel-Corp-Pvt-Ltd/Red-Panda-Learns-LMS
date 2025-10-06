import { OrganizationType } from "@/types/general";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Represents a single organization document stored in Firestore.
 */
export interface Organization {
  /** Unique identifier (auto‑generated in the service, e.g., "org_10001") */
  id: string;

  /** Official organization name */
  name: string;

  /** Organization type: SCHOOL | INDUSTRY | COLLEGE */
  type: OrganizationType;

  /** Firestore timestamps — converted to JS Date or null after fetch */
  createdAt: Timestamp | FieldValue;

  /** Firestore timestamps — converted to JS Date or null after fetch */
  updatedAt: Timestamp | FieldValue;
}
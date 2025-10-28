import { DocumentSnapshot } from "firebase/firestore";

// Add pagination interface types
export interface PaginationOptions<T> {
  limit?: number;
  orderBy?: {
    field: keyof T;
    direction: 'asc' | 'desc';
  };
  pageDirection?: 'next' | 'previous';
  cursor?: DocumentSnapshot | null;
}

export interface PaginatedResult<T> {
  data: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: DocumentSnapshot | null;
  previousCursor: DocumentSnapshot | null;
  totalCount?: number;
}

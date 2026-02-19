/**
 * Central Brain state schemas.
 * These interfaces define the shape of the cached state files
 * that snapshot Firestore collections.
 */

// ── Course State ────────────────────────────────────────────

export interface CourseSnapshot {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration: { hours: number; minutes: number };
  thumbnail?: string;
  regularPrice: number;
  salePrice: number;
  pricingModel: string;
  categoryIds: string[];
  targetAudienceIds: string[];
  tags: string[];
  instructorId: string;
  instructorName: string;
  status: string;
  mode: string;
  liveAt: string | null;
  isEnrollmentPaused: boolean;
  isCertificateEnabled: boolean;
  isCourseCompletionEnabled: boolean;
  isForumEnabled: boolean;
  topicCount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoursesState {
  courses: CourseSnapshot[];
  totalCount: number;
  byStatus: Record<string, number>;
  byPricingModel: Record<string, number>;
  generatedAt: string;
}

// ── User State ──────────────────────────────────────────────

export interface UserSnapshot {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  organizationId?: string;
  class?: string;
  division?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersState {
  users: UserSnapshot[];
  totalCount: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  generatedAt: string;
}

// ── Enrollment State ────────────────────────────────────────

export interface EnrollmentSnapshot {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseName: string;
  bundleId?: string;
  status: string;
  orderId: string;
  enrollmentDate: string;
  completionDate: string | null;
  hasCertificate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentsState {
  enrollments: EnrollmentSnapshot[];
  totalCount: number;
  byStatus: Record<string, number>;
  byCourse: Record<string, number>;
  generatedAt: string;
}

// ── Order State ─────────────────────────────────────────────

export interface OrderLineItem {
  itemId: string;
  itemType: string;
  name: string;
  amount: number;
  originalAmount?: number;
}

export interface OrderSnapshot {
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderLineItem[];
  status: string;
  amount: number;
  currency: string;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersState {
  orders: OrderSnapshot[];
  totalCount: number;
  byStatus: Record<string, number>;
  totalRevenue: Record<string, number>;
  generatedAt: string;
}

// ── System State ────────────────────────────────────────────

export interface CollectionCount {
  collection: string;
  count: number;
  lastUpdated: string;
}

export interface SystemState {
  lastFullRefresh: string;
  collections: CollectionCount[];
  serverVersion: string;
  uptime: number;
}

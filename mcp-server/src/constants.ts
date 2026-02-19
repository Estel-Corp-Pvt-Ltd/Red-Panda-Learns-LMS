/**
 * Shared constants mirrored from the frontend codebase.
 * Keep in sync with src/constants.ts in the main app.
 */

// Firestore collection names
export const COLLECTION = {
  ASSIGNMENTS: "Assignments",
  ASSIGNMENT_SUBMISSIONS: "AssignmentSubmissions",
  COURSES: "Courses",
  BANNERS: "Banners",
  BUNDLES: "Bundles",
  COHORTS: "Cohorts",
  COMMENTS: "Comments",
  STRIP_BANNERS: "StripBanners",
  COMMENT_VOTES: "CommentVotes",
  USERS: "Users",
  CARTS: "Carts",
  LESSONS: "Lessons",
  LESSON_ATTACHMENTS: "LessonAttachments",
  COUPONS: "Coupons",
  COUPON_USAGES: "CouponUsages",
  ORGANIZATIONS: "Organizations",
  CONFIG: "Config",
  ATTRIBUTES: "Attributes",
  POPUPS: "PopUps",
  ORDERS: "Orders",
  TRANSACTIONS: "Transactions",
  COUNTERS: "Counters",
  LEARNING_PROGRESS: "LearningProgress",
  ENROLLMENTS: "Enrollments",
  QUIZZES: "Quizzes",
  QUIZ_SUBMISSIONS: "QuizSubmissions",
  ANNOUNCEMENTS: "Announcements",
  CERTIFICATE_REQUESTS: "CertificateRequests",
  COMPLAINTS: "Complaints",
  FORUM_CHANNELS: "ForumChannels",
  CHANNEL_MESSAGES: "ChannelMessages",
  ZOOM_HOSTS: "ZoomHosts",
} as const;

// User roles
export const USER_ROLE = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  INSTRUCTOR: "INSTRUCTOR",
  ADMIN: "ADMIN",
  ACCOUNTANT: "ACCOUNTANT",
} as const;

// User status
export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

// Course status
export const COURSE_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

// Course mode
export const COURSE_MODE = {
  LIVE: "LIVE",
  SELF_PACED: "SELF-PACED",
} as const;

// Pricing model
export const PRICING_MODEL = {
  FREE: "FREE",
  PAID: "PAID",
} as const;

// Enrollment status
export const ENROLLMENT_STATUS = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  DROPPED: "DROPPED",
} as const;

// Order status
export const ORDER_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

// Currency
export const CURRENCY = {
  INR: "INR",
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
} as const;

// Enrolled program type
export const ENROLLED_PROGRAM_TYPE = {
  COURSE: "COURSE",
  BUNDLE: "BUNDLE",
} as const;

export const USER_ROLE = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  INSTRUCTOR: "INSTRUCTOR",
  ADMIN: "ADMIN",
  ACCOUNTANT: "ACCOUNTANT",
} as const;

export const LEARNING_CONTENT = {
  LESSON: "LESSON",
  ASSIGNMENT: "ASSIGNMENT",
} as const;

export const LESSON_TYPE = {
  SLIDE_DECK: "SLIDE DECK",
  VIDEO_LECTURE: "VIDEO LECTURE",
  INTERACTIVE_PROJECT: "INTERACTIVE PROJECT",
  PDF: "PDF",
  MIRO_BOARD: "MIRO BOARD",
  TEXT: "TEXT",
} as const;

export const VIDEO_SOURCE = {
  YOUTUBE: "YOUTUBE",
  VIMEO: "VIMEO",
  UPLOAD: "UPLOAD",
  EXTERNAL: "EXTERNAL",
} as const;

export const ATTACHMENT_TYPE = {
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
  IMAGE: "IMAGE",
  DOCUMENT: "DOCUMENT",
} as const;

export const RESOURCE_TYPE = {
  FILE: "FILE",
  LINK: "LINK",
} as const;

export const COURSE_PROGRESS_STATUS = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const LESSON_PROGRESS_STATUS = {
  NOT_STARTED: "NOT STARTED",
  IN_PROGRESS: "IN PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export const COURSE_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export const PLATFROM_TYPE = {
  WEB: "WEB",
  ANDROID: "ANDROID",
  IOS: "IOS",
} as const;

export const PUSH_NOTIFICATION_TYPE = {
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
  GRADING: "GRADING",
};

export const BUNDLE_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export const COURSE_DIFFICULTY_LEVEL = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;

export const PRICING_MODEL = {
  FREE: "FREE",
  PAID: "PAID",
} as const;

export const BANNER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export const ENROLLMENT_STATUS = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  DROPPED: "DROPPED",
} as const;

export const ENROLLED_PROGRAM_TYPE = {
  COURSE: "COURSE",
  BUNDLE: "BUNDLE",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export const PAYMENT_PROVIDER = {
  RAZORPAY: "RAZORPAY",
} as const;

export const CURRENCY = {
  INR: "INR", // Indian Rupee
  USD: "USD", // United States Dollar
  EUR: "EUR", // Euro
  GBP: "GBP", // Pound Sterling
} as const;

export const LEARNING_UNIT = {
  ASSIGNMENT: "ASSIGNMENT",
  LESSON: "LESSON",
  TOPIC: "TOPIC",
} as const;

export const ENVIRONMENT = {
  DEVELOPMENT: "DEVELOPMENT",
  PRODUCTION: "PRODUCTION",
} as const;

export const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  EXPIRED: "EXPIRED",
  DISPUTED: "DISPUTED",
} as const;

export const ORDER_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export const PAYMENT_ATTEMPT_STATUS = {
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  SUCCESS: "SUCCESS",
} as const;

export const TRANSACTION_TYPE = {
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
} as const;

export const REFUND_INITIATOR = {
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;

// constants/order.ts
export const ADDRESS_TYPE = {
  BILLING: "BILLING",
  SHIPPING: "SHIPPING",
} as const;

// constants/sort.ts
export const SORT_KEY = {
  RELEVANCE: "RELEVANCE",
  PRICE_ASC: "PRICE_ASC",
  PRICE_DESC: "PRICE_DESC",
  TITLE_ASC: "TITLE_ASC",
  TITLE_DESC: "TITLE_DESC",
} as const;

export const ANNOUNCEMENT_SCOPE = {
  GLOBAL: "GLOBAL",
  COURSE: "COURSE",
  ORGANIZATION: "ORGANIZATION",
} as const;

export const ANNOUNCEMENT_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

// --- RAZORPAY WEBHOOK EVENTS

export const RAZORPAY_WEBHOOK_EVENT = {
  PAYMENTS: {
    PAYMENT_AUTHORIZED: "payment.authorized",
    PAYMENT_CAPTURED: "payment.captured",
    PAYMENT_FAILED: "payment.failed",
  },
  ORDERS: {
    ORDER_PAID: "order.paid",
  },
  VIRTUAL_ACCOUNTS: {
    VIRTUAL_ACCOUNT_CREATED: "virtual_account.created",
    VIRTUAL_ACCOUNT_CREDITED: "virtual_account.credited",
  },
} as const;

// --- COUPON SYSTEM ---

export const COUPON_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  EXPIRED: "EXPIRED",
} as const;

export const MESSAGE_TYPE = {
  TEXT: "TEXT",
  LINK: "LINK",
  IMAGE: "IMAGE",
} as const;

export const MESSAGE_STATUS = {
  ACTIVE: "ACTIVE",
  HIDDEN: "HIDDEN",
  DELETED: "DELETED",
} as const;

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
  FALLBACK_CURRENCY_RATES: "FallbackCurrencyRates",
  POPUPS: "PopUps",
  ORDERS: "Orders",
  TRANSACTIONS: "Transactions",
  COUNTERS: "Counters",
  LEARNING_PROGRESS: "LearningProgress",
  ENROLLMENTS: "Enrollments",
  CURRENCY_RATES: "CurrencyRates",
  COURSE_ARRANGEMENTS: "CourseArrangements",
  QUIZZES: "Quizzes",
  QUIZ_SUBMISSIONS: "QuizSubmissions",
  ADMIN_ASSIGNED_STUDENTS: "AdminAssignedStudents",
  SUBMISSION_NOTIFICATION: "SubmissionNotification",
  COMPLAINTS: "Complaints",
  COMPLAINT_ACTIONS: "ComplaintActions",
  ANNOUNCEMENTS: "Announcements",
  CERTIFICATE_REQUESTS: "CertificateRequests",
  LESSON_ANALYTICS: "LessonAnalytics",
  COURSE_ANALYTICS: "CourseAnalytics",
  FORUM_CHANNELS: "ForumChannels",
  CHANNEL_MESSAGES: "ChannelMessages",
  FORUM_MESSAGE_UPVOTES: "ForumMessageUpvotes",
  COURSE_WELCOME_TEMPLATES: "CourseWelcomeTemplates",
  CONTENT_LOCKS: "ContentLocks",
  KARMA_DAILY: "KarmaDaily",
  KARMA_RULES: "KarmaRules",
} as const;

export const ATTRIBUTE_TYPE = {
  CATEGORY: "CATEGORY",
  TARGET_AUDIENCE: "TARGET AUDIENCE",
} as const;

export const ORGANIZATION = {
  SCHOOL: "SCHOOL",
  INDUSTRY: "INDUSTRY",
  COLLEGE: "COLLEGE",
} as const;

export const FALLBACK_CURRENCY_RATE: Record<string, number> = {
  // INR to/from
  USD_INR: 83.5,
  INR_USD: 0.012,
  EUR_INR: 90.0,
  INR_EUR: 0.011,
  GBP_INR: 100.0,
  INR_GBP: 0.01,

  // Cross foreign
  USD_EUR: 0.92,
  EUR_USD: 1.09,
};

export const NOTIFICATION_STATUS = {
  PENDING: "PENDING", // record created but no email sent yet
  REMINDER_SCHEDULED: "REMINDER SCHEDULED", // reminder task created, waiting to run
  PAUSED: "PAUSED", // admin paused reminders for this submission
  EVALUATED: "EVALUATED", // assignment evaluated; no more notifications
  ARCHIVED: "ARCHIVED", // stored for history; no active actions
  ERROR: "ERROR", // notification attempt failed; needs retry check
} as const;

export const CART_ACTION = {
  ADD: "ADD",
  REMOVE: "REMOVE",
  CLEAR: "CLEAR",
  SET_CART: "SET_CART",
} as const;

export const POPUP_COURSE_TYPE = {
  LIVE: "LIVE",
  SELF_PACED: "SELF-PACED",
} as const;

export const COURSE_MODE = {
  LIVE: "LIVE",
  SELF_PACED: "SELF-PACED",
} as const;

export const QUIZ_QUESTION_TYPE = {
  MCQ: "MCQ",
  MULTIPLE_ANSWER: "MULTIPLE ANSWER",
  FILL_BLANK: "FILL BLANK",
} as const;

export const QUIZ_SUBMISSION_STATUS = {
  IN_PROGRESS: "IN PROGRESS",
  SUBMITTED: "SUBMITTED",
  NOT_SUBMITTED: "NOT SUBMITTED",
} as const;

export const QUIZ_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
};

// --- COMPLAINT ---

export const COMPLAINT_STATUS = {
  SUBMITTED: "SUBMITTED",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  UNDER_REVIEW: "UNDER REVIEW",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
  ESCALATED: "ESCALATED",
  CLOSED: "CLOSED",
};

export const COMPLAINT_SEVERITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

export const COMPLAINT_ACTION_TYPE = {
  CREATED: "CREATED",
  COMMENTED: "COMMENTED",
  ASSIGNED: "ASSIGNED",
  STATUS_CHANGED: "STATUS CHANGED",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
};

export const COMPLAINT_CATEGORY = {
  CONTENT: "CONTENT",
  PAYMENT: "PAYMENT",
  TECHNICAL: "TECHNICAL",
  INSTRUCTOR: "INSTRUCTOR",
};

export const COMMENT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DELETED: "DELETED",
} as const;

export const CERTIFICATE_REQUEST_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

// -- Karma System --

export const KARMA_BREAKDOWN_TYPE = {
  LEARNING: "LEARNING",
  ASSIGNMENT: "ASSIGNMENT",
  QUIZ: "QUIZ",
  COMMUNITY: "COMMUNITY",
  SOCIAL: "SOCIAL",
} as const;

export const KARMA_CATEGORY = {
  LEARNING: "LEARNING",
  COMMUNITY: "COMMUNITY",
  SOCIAL: "SOCIAL",
} as const;

export const LEARNING_ACTION = {
  LESSON_WATCH_TIME: "LESSON WATCH TIME",
  KARMA_BOOST_LESSON_POINTS: "KARMA BOOST LESSON POINTS",
  LESSON_COMPLETION: "LESSON COMPLETION",
  ASSIGNMENT_SUBMISSION_MISS: "ASSIGNMENT SUBMISSION MISS",
  ASSIGNMENT_GRADE_FAIL: "ASSIGNMENT GRADE FAIL",
  ASSIGNMENT_GRADE_PASS: "ASSIGNMENT GRADE PASS",
  ASSIGNMENT_GRADE_90_PLUS: "ASSIGNMENT GRADE 90%+",
  QUIZ_MISSED: "QUIZ MISSED",
  QUIZ_GRADE_FAIL: "QUIZ GRADE FAIL",
  QUIZ_GRADE_PASS: "QUIZ GRADE PASS",
  QUIZ_GRADE_90_PLUS: "QUIZ GRADE 90%+",
} as const;

export const COMMUNITY_ACTION = {
  LESSON_COMMENT_APPROVED: "LESSON COMMENT (APPROVED)",
  FORUM_MESSAGE_APPROVED: "FORUM MESSAGE (APPROVED)",
  USER_UPVOTE_RECEIVED: "USER UPVOTE RECEIVED",
  USER_COMMENT_UNUPVOTED: "USER COMMENT UNUPVOTED",
  ADMIN_UPVOTE_RECEIVED: "ADMIN UPVOTE RECEIVED",
  MESSAGE_OR_COMMENT_REJECTED: "MESSAGE OR COMMENT REJECTED",
} as const;

export const SOCIAL_ACTION = {
  CERTIFICATE_SHARED: "CERTIFICATE SHARED",
} as const;

export const KARMA_ACTIONS_BY_CATEGORY = {
  [KARMA_CATEGORY.LEARNING]: Object.values(LEARNING_ACTION),
  [KARMA_CATEGORY.COMMUNITY]: Object.values(COMMUNITY_ACTION),
  [KARMA_CATEGORY.SOCIAL]: Object.values(SOCIAL_ACTION),
} as const;

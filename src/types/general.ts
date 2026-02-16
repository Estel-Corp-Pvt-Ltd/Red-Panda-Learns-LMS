import {
  ADDRESS_TYPE,
  ANNOUNCEMENT_SCOPE,
  ANNOUNCEMENT_STATUS,
  ATTRIBUTE_TYPE,
  BANNER_STATUS,
  BUNDLE_STATUS,
  CERTIFICATE_REQUEST_STATUS,
  COMMENT_STATUS,
  COMPLAINT_ACTION_TYPE,
  COMPLAINT_CATEGORY,
  COMPLAINT_SEVERITY,
  COMPLAINT_STATUS,
  COUPON_STATUS,
  COURSE_STATUS,
  CURRENCY,
  ENROLLED_PROGRAM_TYPE,
  ENROLLMENT_STATUS,
  LEARNING_UNIT,
  NOTIFICATION_STATUS,
  ORDER_STATUS,
  ORGANIZATION,
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
  PAYPAL_WEBHOOK_EVENT,
  POPUP_COURSE_TYPE,
  PRICING_MODEL,
  QUIZ_QUESTION_TYPE,
  QUIZ_STATUS,
  QUIZ_SUBMISSION_STATUS,
  RAZORPAY_WEBHOOK_EVENT,
  REFUND_INITIATOR,
  SORT_KEY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  USER_ROLE,
  USER_STATUS,
  PLATFROM_TYPE,
  KARMA_BREAKDOWN_TYPE,
  KARMA_CATEGORY,
  LEARNING_ACTION,
  SOCIAL_ACTION,
  COMMUNITY_ACTION,
  COURSE_MODE,
} from "@/constants";

// ATTRIBUTES
export type AttributeType = (typeof ATTRIBUTE_TYPE)[keyof typeof ATTRIBUTE_TYPE];

// USER
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

// COURSE & BUNDLE
export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];
export type CourseMode = (typeof COURSE_MODE)[keyof typeof COURSE_MODE];
export type PricingModel = (typeof PRICING_MODEL)[keyof typeof PRICING_MODEL];
export type BundleStatus = (typeof BUNDLE_STATUS)[keyof typeof BUNDLE_STATUS];
export type LearningUnit = (typeof LEARNING_UNIT)[keyof typeof LEARNING_UNIT];

// ENROLLMENT
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS];
export type EnrolledProgramType =
  (typeof ENROLLED_PROGRAM_TYPE)[keyof typeof ENROLLED_PROGRAM_TYPE];

// PAYMENT
export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];
export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];
export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];
export type PaymentAttemptStatus =
  (typeof PAYMENT_ATTEMPT_STATUS)[keyof typeof PAYMENT_ATTEMPT_STATUS];
export type RefundInitiator = (typeof REFUND_INITIATOR)[keyof typeof REFUND_INITIATOR];
export type RazorpayWebhookEvent =
  (typeof RAZORPAY_WEBHOOK_EVENT)[keyof typeof RAZORPAY_WEBHOOK_EVENT];
export type PayPalWebhookEvent = (typeof PAYPAL_WEBHOOK_EVENT)[keyof typeof PAYPAL_WEBHOOK_EVENT];

// ORDER
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type AddressType = (typeof ADDRESS_TYPE)[keyof typeof ADDRESS_TYPE];

// COUPON
export type CouponStatus = (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];

// ORGANIZATION
export type OrganizationType = (typeof ORGANIZATION)[keyof typeof ORGANIZATION];

// POP UP
export type PopUpCourseType = (typeof POPUP_COURSE_TYPE)[keyof typeof POPUP_COURSE_TYPE];

// QUIZ
export type QuizQuestionType = (typeof QUIZ_QUESTION_TYPE)[keyof typeof QUIZ_QUESTION_TYPE];
export type QuizSubmissionStatus =
  (typeof QUIZ_SUBMISSION_STATUS)[keyof typeof QUIZ_SUBMISSION_STATUS];
export type QuizStatus = (typeof QUIZ_STATUS)[keyof typeof QUIZ_STATUS];

// NOTIFICATION & ANNOUNCEMENT
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];
export type AnnouncementScope = (typeof ANNOUNCEMENT_SCOPE)[keyof typeof ANNOUNCEMENT_SCOPE];
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUS)[keyof typeof ANNOUNCEMENT_STATUS];

// COMMENT
export type CommentType = (typeof COMMENT_STATUS)[keyof typeof COMMENT_STATUS];

// --- COMPLAINT ---
export type ComplaintStatus = (typeof COMPLAINT_STATUS)[keyof typeof COMPLAINT_STATUS];
export type ComplaintSeverity = (typeof COMPLAINT_SEVERITY)[keyof typeof COMPLAINT_SEVERITY];
export type ComplaintActionType =
  (typeof COMPLAINT_ACTION_TYPE)[keyof typeof COMPLAINT_ACTION_TYPE];
export type ComplaintCategory = (typeof COMPLAINT_CATEGORY)[keyof typeof COMPLAINT_CATEGORY];

// --- CERTIFICATE ---
export type CertificateRequestStatus =
  (typeof CERTIFICATE_REQUEST_STATUS)[keyof typeof CERTIFICATE_REQUEST_STATUS];

// --- BANNER ---
export type BannerStatus = (typeof BANNER_STATUS)[keyof typeof BANNER_STATUS];

// -- PLATFORM TYPE ---
export type PlatformType = (typeof PLATFROM_TYPE)[keyof typeof PLATFROM_TYPE];
// MISCELLANEOUS
export type Duration = {
  hours: number;
  minutes: number;
};
export type SortKey = (typeof SORT_KEY)[keyof typeof SORT_KEY];

// -- KARMA BREAKDOWN --
export type KarmaBreakdown = Record<keyof typeof KARMA_BREAKDOWN_TYPE, number>;

export type KarmaCategory = (typeof KARMA_CATEGORY)[keyof typeof KARMA_CATEGORY];

export type LearningAction = (typeof LEARNING_ACTION)[keyof typeof LEARNING_ACTION];

export type CommunityAction = (typeof COMMUNITY_ACTION)[keyof typeof COMMUNITY_ACTION];

export type SocialAction = (typeof SOCIAL_ACTION)[keyof typeof SOCIAL_ACTION];

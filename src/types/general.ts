import {
    ATTRIBUTE_TYPE,
    BUNDLE_STATUS,
    COUPON_STATUS,
    COURSE_STATUS,
    CURRENCY,
    ENROLLED_PROGRAM_TYPE,
    ENROLLMENT_STATUS,
    LEARNING_UNIT,
    ORGANIZATION,
    PAYMENT_ATTEMPT_STATUS,
    PAYMENT_PROVIDER,
    PAYMENT_STATUS,
    PAYPAL_WEBHOOK_EVENT,
    POPUP_COURSE_TYPE,
    PRICING_MODEL,
    RAZORPAY_WEBHOOK_EVENT,
    REFUND_INITIATOR,
    TRANSACTION_STATUS,
    TRANSACTION_TYPE,
    USER_ROLE,
    USER_STATUS,
    ORDER_STATUS
} from "@/constants";

export type AttributeType = typeof ATTRIBUTE_TYPE[keyof typeof ATTRIBUTE_TYPE];
export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
export type PricingModel = typeof PRICING_MODEL[keyof typeof PRICING_MODEL];
export type CourseStatus = typeof COURSE_STATUS[keyof typeof COURSE_STATUS];
export type BundleStatus = typeof BUNDLE_STATUS[keyof typeof BUNDLE_STATUS];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type EnrollmentStatus = typeof ENROLLMENT_STATUS[keyof typeof ENROLLMENT_STATUS];
export type EnrolledProgramType = typeof ENROLLED_PROGRAM_TYPE[keyof typeof ENROLLED_PROGRAM_TYPE];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type PaymentProvider = typeof PAYMENT_PROVIDER[keyof typeof PAYMENT_PROVIDER];
export type Currency = typeof CURRENCY[keyof typeof CURRENCY];
export type LearningUnit = typeof LEARNING_UNIT[keyof typeof LEARNING_UNIT];
export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type PaymentAttemptStatus = typeof PAYMENT_ATTEMPT_STATUS[keyof typeof PAYMENT_ATTEMPT_STATUS];
export type TransactionType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE];
export type RefundInitiator = typeof REFUND_INITIATOR[keyof typeof REFUND_INITIATOR];
export type RazorpayWebhookEvent = typeof RAZORPAY_WEBHOOK_EVENT[keyof typeof RAZORPAY_WEBHOOK_EVENT];
export type PayPalWebhookEvent = typeof PAYPAL_WEBHOOK_EVENT[keyof typeof PAYPAL_WEBHOOK_EVENT];
export type CouponStatus = typeof COUPON_STATUS[keyof typeof COUPON_STATUS];
export type OrganizationType = typeof ORGANIZATION[keyof typeof ORGANIZATION];
export type PopUpCourseType = typeof POPUP_COURSE_TYPE[keyof typeof POPUP_COURSE_TYPE];

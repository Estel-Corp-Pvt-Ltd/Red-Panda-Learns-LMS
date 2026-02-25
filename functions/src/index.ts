import { enrollStudent } from "./handlers/enrollments/enrollStudent";
import { createRazorpayOrder } from "./handlers/createRazorpayOrder";
// import { verifyPayment } from "./handlers/verifyPayment";
import { razorpayWebhook } from "./handlers/razorpayWebhook";
import { sendMailWorker } from "./workers/sendMailWorker";
// import { getLessons } from "./handlers/getLessons";
import { enrollFreeCourse } from "./handlers/enrollments/enrollFreeCourse";
// import { resetUserPassword } from "./handlers/resetUserPassword";
// import { canStartQuiz } from "./handlers/canStartQuiz";
// import { getQuizTimeLeft } from "./handlers/getQuizTimeLeft";
// import { generateComplaintId } from "./handlers/generateComplaintId";
import {
  enrollStudentsInBulk,
  processEnrollmentTask,
} from "./handlers/enrollments/enrollStudentsInBulk";
// import { sendAnnouncementEmailWorker } from "./workers/sendAnnouncementsWorker";
// Cascade delete workers
// import { courseDeleteCascade } from "./workers/courseDeleteCascade";
// import { lessonDeleteCascade } from "./workers/lessonDeleteCascade";
// import { assignStudentsToAdmin } from "./handlers/assignStudentstoAdmin";
// import { bulkUnassignStudentsFromAdmin } from "./handlers/unassignStudentstoAdmin";
// import { pauseStudentNotifications } from "./handlers/pauseStudentNotifications";
// import { createNotification } from "./handlers/notifications/notificationController";
// import { sendInitialNotification } from "./handlers/notifications/sendInitialEmail";
// import { SendMailWorkerForNotif } from "./workers/sendMailWorkerForNotif";
// import { lessonTimeSpent } from "./handlers/analytics/lessonTimeSpent";
// import { onEnrollmentCreated } from "./events/onEnrollmentCreated";
// import { completeLesson } from "./handlers/analytics/completeLesson";
// import { completeCourse } from "./handlers/analytics/completeCourse";
// import { userDeleteCascade } from "./workers/userDeleteCascade";
// import { pauseReminderForAssignments } from "./handlers/notifications/pauseReminderForAssignments";
// import { markSubmissionNotificationsEvaluated } from "./handlers/markSubmissionNotificationsEvaluated";
import { createCouponUsage } from "./handlers/createCouponUsage";
// import { onCourseUpdated } from "./handlers/announcements/triggerAnnouncement";
// import { sendAnnouncementEmailonRequest } from "./handlers/announcements/sendAnnouncementsMail";
// import { createGlobalAnnouncement } from "./handlers/createGlobalAnnouncements";
// import { createCourseManualAnnouncement } from "./handlers/createCourseManualAnnouncements";
// import { sendComplaintRedressalMail } from "./handlers/sendComplaintRedressalMail";
// import { sendComplaintRedressalMailWorker } from "./workers/sendComplaintRedressalMailWorker";
// import { deleteAnnouncement } from "./handlers/announcements/deleteAnnouncements";
// import { updateAnnouncement } from "./handlers/announcements/updateAnnouncement";
// import { unpauseReminderForAssignments } from "./handlers/notifications/unpauseReminderForAssignments";
// import { showCertificatePreview } from "./handlers/showCertificatePreview";
// import { bulkIssueCertificates } from "./handlers/bulkIssueCertificates";
// import { getCourseTimeSpent } from "./handlers/analytics/getCourseTimeSpent";
// import { sendGradedAssignmentNotification } from "./services/sendGradedAssignmentNotification";
// import { sendUserMailOnAssignmentGradedWorker } from "./workers/sendUserMailOnAssignmentGradedWorker";
// import { sendMailtoUserOnAssignmentGraded } from "./services/email/sendMailtoUserOnAssignmentGraded";
import {
  getOrders,
  getOrderById,
  // getOrderStats,
} from "./handlers/api/ordersApiHandlers";
// import { sendSubmissionGradedNotification } from "./handlers/pushNotificationsHandler";
// import { sendCourseWelcomeMailWorker } from "./workers/sendCourseWelcomeMail";
// import { sendCertificateMailWorker } from "./workers/sendCertificateMail";
// import { addOrUpdateKarmaRule } from "./handlers/karmaRuleHandler";
import { addKarma } from "./services/karma/incrementHanlder";
export {
  enrollStudent,
  createRazorpayOrder,
  // verifyPayment,
  razorpayWebhook,
  sendMailWorker,
  // courseDeleteCascade,
  // lessonDeleteCascade,
  // userDeleteCascade,
  // getLessons,
  enrollFreeCourse,
  // resetUserPassword,
  enrollStudentsInBulk,
  processEnrollmentTask,
  // canStartQuiz,
  // getQuizTimeLeft,
  // generateComplaintId,
  // assignStudentsToAdmin,
  // bulkUnassignStudentsFromAdmin,
  // pauseStudentNotifications,
  // createNotification,
  // sendInitialNotification,
  // SendMailWorkerForNotif,
  // pauseReminderForAssignments,
  // markSubmissionNotificationsEvaluated,
  createCouponUsage,
  // onEnrollmentCreated,
  // lessonTimeSpent,
  // completeLesson,
  // completeCourse,
  // onCourseUpdated,
  // sendAnnouncementEmailWorker,
  // sendAnnouncementEmailonRequest,
  // createGlobalAnnouncement,
  // createCourseManualAnnouncement,
  // sendComplaintRedressalMail,
  // sendComplaintRedressalMailWorker,
  // updateAnnouncement,
  // deleteAnnouncement,
  // unpauseReminderForAssignments,
  // showCertificatePreview,
  // bulkIssueCertificates,
  // getCourseTimeSpent,
  getOrders,
  getOrderById,
  // getOrderStats,
  // sendGradedAssignmentNotification,
  // sendMailtoUserOnAssignmentGraded,
  // sendSubmissionGradedNotification,
  // sendUserMailOnAssignmentGradedWorker,
  // sendCourseWelcomeMailWorker,
  // sendCertificateMailWorker,
  // addOrUpdateKarmaRule,
  addKarma,
};

import { lazy, Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CohortProvider } from "@/contexts/CohortContext";
import { EnrollmentProvider } from "@/contexts/EnrollmentContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { LoadingOverlayProvider } from "./contexts/LoadingOverlayContext";
import LoadingSpinnerOverlay from "./components/LogoSpinnerOverlay";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import AnimatedPage from "./components/AnimatedPage";
import NetworkStatus from "./components/NetworkStatus";


// Lazy load admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminStatistics = lazy(() => import("./pages/admin/AdminStatistics"));
const CreateBundlePage = lazy(() => import("./pages/admin/CreateBundlePage"));
const CohortBuilderPage = lazy(() => import("./pages/admin/CreateCohortPage"));
const CreateCouponPage = lazy(() => import("./pages/admin/CreateCouponPage"));
const CreateCoursePage = lazy(() => import("./pages/admin/CreateCoursePage"));
const CurriculumBuilderPage = lazy(() => import("./pages/admin/CurriculumBuilderPage"));
const EditBundlePage = lazy(() => import("./pages/admin/EditBundle"));
const EditCouponPage = lazy(() => import("./pages/admin/EditCouponPage"));
const EditLessonPage = lazy(() => import("./pages/admin/EditLesson"));
const EditUserPage = lazy(() => import("./pages/admin/EditUser"));
const SubmissionDetailPage = lazy(() => import("./pages/admin/SubmissionDetailPage"));
const DummyCurriculumBuilderPage = lazy(() => import("./pages/admin/dummycurriculum"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminBundles = lazy(() => import("./pages/admin/AdminBundles"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminBannersPage = lazy(() => import("./pages/admin/AdminBannersPage"));
const CreateBannerPage = lazy(() => import("./pages/admin/CreateBannerPage"));
const EditBannerPage = lazy(() => import("./pages/admin/EditBannerPage"));
const AdminComplaints = lazy(() => import("./pages/admin/AdminComplaints"));
const AdminOrganizations = lazy(() => import("./pages/admin/AdminOrganizations"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAssignStudents = lazy(() => import("./pages/admin/AdminAssignStudents"));
const AdminInstructors = lazy(() => import("./pages/admin/AdminInstructors"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
// const AdminPopUps = lazy(() => import("./pages/admin/PopUps"));
const AdminManageAssignments = lazy(() => import("@/pages/admin/AdminManageAssignments"));
const AdminCreateAnnouncement = lazy(() => import("@/pages/admin/AdminManageAnnouncements"));
const AdminBulkTeacherAdd = lazy(() => import("./pages/admin/AdminBulkTeacherAdd"));
// const AdminStripBanners = lazy(() => import("./pages/admin/AdminStripBanner"));
const EnrollStudent = lazy(() => import("./pages/admin/EnrollStudent"));
const AdminBulkStudentEnroll = lazy(() => import("./pages/admin/AdminBulkStudentEnroll"));
const AdminResetPassword = lazy(() => import("./pages/admin/AdminResetPassword"));
const ArrangeCourses = lazy(() => import("./pages/admin/ArrangeCourses"));
const AdminCommentApproval = lazy(() => import("./pages/admin/AdminCommentApproval"));
const AdminCertificateRequests = lazy(() => import("./pages/admin/AdminCertificateRequests"));
const AdminMessageApproval = lazy(() => import("./pages/admin/AdminMessageApproval"));
const AdminKarmaRulesPage = lazy(() => import("./pages/admin/AdminEditKarmaRules"));
const StudentEnrollments = lazy(() => import("./components/admin/StudentEnrollments"));

// Lazy load teacher pages
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherStudents = lazy(() => import("./pages/teacher/TeacherStudents"));
const TeacherAssignments = lazy(() => import("./pages/teacher/TeacherAssignments"));
const TeacherAnnouncements = lazy(() => import("./pages/teacher/TeacherAnnouncements"));
const TeacherCourses = lazy(() => import("./pages/teacher/TeacherCourses"));
const TeacherComments = lazy(() => import("./pages/teacher/TeacherComments"));
const TeacherBulkUpload = lazy(() => import("./pages/teacher/TeacherBulkUpload"));
const TeacherStatistics = lazy(() => import("./pages/teacher/TeacherStatistics"));
const TeacherStudentDetail = lazy(() => import("./pages/teacher/TeacherStudentDetail"));

// Lazy load instructor pages
const InstructorLayout = lazy(() => import("./components/InstructorLayout"));
const InstructorDashboard = lazy(() => import("./pages/instructor/InstructorDashboard"));

// Lazy load accountant pages
const AccountantOrders = lazy(() => import("./pages/accountant/AccountantOrdersTab"));

// Lazy load user/public pages
const LandingPage = lazy(() => import("./pages/landingpage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const LessonDetailPage = lazy(() => import("./pages/LessonDetailPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const CartCheckoutPage = lazy(() => import("./pages/cartCheckout"));
const BundleDetailPage = lazy(() => import("./pages/BundleDetailPage"));
const BundleCheckoutPage = lazy(() => import("./pages/BundleCheckoutPage"));
const BundleDashboardPage = lazy(() => import("./pages/BundleDashboardPage"));
const MySubmissionsPage = lazy(() => import("./pages/MySubmissions"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const MyInvoicesPage = lazy(() => import("./pages/MyInvoices"));
const Quizzes = lazy(() => import("./pages/Quizzes"));
const AttemptQuiz = lazy(() => import("./pages/AttemptQuiz"));
const FreeCourses = lazy(() => import("./pages/FreeCourses"));
const UserComplaints = lazy(() => import("./pages/UserComplaints"));
const Forum = lazy(() => import("./pages/Forum"));
const Profile = lazy(() => import("./pages/Profile"));
const WhatsNew = lazy(() => import("./pages/Whats-new"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ModalDemo = lazy(() => import("./pages/ModalDemo"));
const DummyBundleCheckoutPage = lazy(() => import("./pages/dummycoursecheckoutpage"));
const Certificate = lazy(() => import("./components/course/Certificate"));
const PublicCertificate = lazy(() => import("./components/course/PublicCertificate"));
const AuthRedirection = lazy(() => import("./components/auth/AuthRedirection"));

// Lazy load static pages
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ContactPage = lazy(() => import("./pages/Contact"));
const AboutUsPage = lazy(() => import("./pages/AboutUs"));
const RefundPage = lazy(() => import("./pages/RefundPolicy"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EnrollmentProvider>
        <CohortProvider>
          <CartProvider>
            <TooltipProvider>
              <LoadingOverlayProvider>
                  <Toaster />
                  <BrowserRouter>
                    <ScrollToTop />
                    <NetworkStatus />
                    <Suspense fallback={<LoadingSpinnerOverlay message="Loading..." />}>
                      <AnimatedPage>
                      <Routes>
                        {/* Public pages */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/courses" element={<CoursesPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/courses/:param" element={<CourseDetailPage />} />
                        <Route
                          path="/certificate/:enrollmentId"
                          element={
                            <AuthGuard requireAuth requireEnrollmentOrAdmin>
                              <Certificate />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/certificate/public/view/:certificateId"
                          element={<PublicCertificate />}
                        />
                        <Route
                          path="/courses/:param/lesson/:lessonId"
                          element={
                            <AuthGuard requireAuth requireEnrollmentOrAdmin={true}>
                              <LessonDetailPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/courses/:courseSlug/forum"
                          element={
                            <AuthGuard requireAuth requireEnrollmentOrAdmin={true}>
                              <Forum />
                            </AuthGuard>
                          }
                        />

                        {/* Auth */}
                        <Route path="/auth" element={<AuthRedirection />} />
                        <Route path="/auth/login" element={<Login />} />
                        <Route path="/auth/signup" element={<Signup />} />

                        {/* Student pages */}
                        <Route
                          path="/checkout/:param"
                          element={
                            <AuthGuard>
                              <CheckoutPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/whats-new"
                          element={
                            <AuthGuard requireAuth requireStudent>
                              <WhatsNew />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/dashboard"
                          element={
                            <AuthGuard requireAuth requireStudent>
                              <DashboardPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/complaints"
                          element={
                            <AuthGuard requireAuth requireStudent>
                              <UserComplaints />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/quizzes"
                          element={
                            <AuthGuard requireAuth requireStudent>
                              <Quizzes />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/quizzes/:quizId"
                          element={
                            <AuthGuard requireAuth requireStudent>
                              <AttemptQuiz />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/cart"
                          element={
                            <AuthGuard>
                              <CartPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/cart/checkout"
                          element={
                            <AuthGuard>
                              <CartCheckoutPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <AuthGuard>
                              <Profile />
                            </AuthGuard>
                          }
                        />
                        <Route path="/submissions" element={<MySubmissionsPage />} />
                        <Route path="/invoices/:orderId" element={<InvoicePage />} />
                        <Route path="/invoices" element={<MyInvoicesPage />} />
                        <Route path="/free-courses" element={<FreeCourses />} />

                        {/* Bundle pages */}
                        <Route path="/course-bundle/:param" element={<BundleDetailPage />} />
                        <Route
                          path="/course-bundle/:param/checkout"
                          element={
                            <AuthGuard>
                              <BundleCheckoutPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/bundle/:param/dashboard"
                          element={
                            <AuthGuard>
                              <BundleDashboardPage />
                            </AuthGuard>
                          }
                        />

                        {/* Dummy/dev routes */}
                        <Route path="/dev/modal-demo" element={<ModalDemo />} />
                        <Route
                          path="dummy/bundle/:bundleId/checkout"
                          element={<DummyBundleCheckoutPage />}
                        />

                        {/* Admin routes */}
                        <Route
                          path="/admin"
                          element={
                            <AuthGuard requireAuth requireAdmin>
                              <AdminDashboard />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/courses"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminCourses />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/bundles"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminBundles />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/enrollments"
                          element={
                            <AuthGuard requireAdmin>
                              <StudentEnrollments />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/bulk-student-enroll"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminBulkStudentEnroll />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/assign-students"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminAssignStudents />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/users"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminUsers />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/instructors"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminInstructors />
                            </AuthGuard>
                          }
                        />
                        {/* <Route
                          path="/admin/strip-banners"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminStripBanners />
                            </AuthGuard>
                          }
                        /> */}
                        <Route
                          path="/admin/orders"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminOrders />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/certificate-requests"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminCertificateRequests />
                            </AuthGuard>
                          }
                        />
                        {/* <Route
                          path="/admin/pop-ups"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminPopUps />
                            </AuthGuard>
                          }
                        /> */}
                        <Route
                          path="/admin/enroll-student"
                          element={
                            <AuthGuard requireAdmin>
                              <EnrollStudent />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/statistics"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminStatistics />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/coupons"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminCoupons />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/banners"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminBannersPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/create-banner"
                          element={
                            <AuthGuard requireAdmin>
                              <CreateBannerPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/edit-banner/:bannerId"
                          element={
                            <AuthGuard requireAdmin>
                              <EditBannerPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/view-complaints"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminComplaints />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/organizations"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminOrganizations />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/comments"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminCommentApproval />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/forum-messages"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminMessageApproval />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/edit-lesson/:lessonId"
                          element={
                            <AuthGuard requireAdmin>
                              <EditLessonPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/submissions"
                          element={
                            <AuthGuard requireAdmin>
                              <SubmissionDetailPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/edit-user/:userId"
                          element={
                            <AuthGuard requireAdmin>
                              <EditUserPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/create-course"
                          element={
                            <AuthGuard requireAdmin>
                              <CreateCoursePage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/karmarules"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminKarmaRulesPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/bulk-add-teachers"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminBulkTeacherAdd />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/create-bundle"
                          element={
                            <AuthGuard requireAdmin>
                              <CreateBundlePage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/edit-bundle/:param"
                          element={
                            <AuthGuard requireAdmin>
                              <EditBundlePage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="admin/edit-coupon/:couponId"
                          element={
                            <AuthGuard requireAdmin>
                              <EditCouponPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/create-cohort"
                          element={
                            <AuthGuard requireAdmin>
                              <CohortBuilderPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/edit-course/:param"
                          element={
                            <AuthGuard requireAdmin>
                              <CurriculumBuilderPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/arrange-courses"
                          element={
                            <AuthGuard requireAdmin>
                              <ArrangeCourses />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/dummy/edit-course/:courseId"
                          element={
                            <AuthGuard requireAdmin>
                              <DummyCurriculumBuilderPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/create-coupon"
                          element={
                            <AuthGuard requireAdmin>
                              <CreateCouponPage />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/manage-assignment-authors"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminManageAssignments />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/announcements"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminCreateAnnouncement />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/admin/reset-password"
                          element={
                            <AuthGuard requireAdmin>
                              <AdminResetPassword />
                            </AuthGuard>
                          }
                        />

                        {/* Instructor routes */}
                        <Route
                          path="/instructor"
                          element={
                            <AuthGuard requireInstructor>
                              <InstructorLayout>
                                <InstructorDashboard />
                              </InstructorLayout>
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/instructor/edit-course/:param"
                          element={
                            <AuthGuard requireInstructor>
                              <InstructorLayout>
                                <CurriculumBuilderPage />
                              </InstructorLayout>
                            </AuthGuard>
                          }
                        />

                        {/* Accountant routes */}
                        <Route
                          path="/accountant"
                          element={
                            <AuthGuard requireAccountant>
                              <AccountantOrders />
                            </AuthGuard>
                          }
                        />

                        {/* Teacher routes */}
                        <Route
                          path="/teacher"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherDashboard />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/teacher/students"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherStudents />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/teacher/students/:studentId"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherStudentDetail />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/teacher/assignments"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherAssignments />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/teacher/announcements"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherAnnouncements />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/teacher/courses"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherCourses />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/teacher/comments"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherComments />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/teacher/bulk-upload"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherBulkUpload />
                            </AuthGuard>
                          }
                        />
                        <Route
                          path="/teacher/statistics"
                          element={
                            <AuthGuard requireAuth requireTeacher>
                              <TeacherStatistics />
                            </AuthGuard>
                          }
                        />

                        {/* Static pages */}
                        <Route path="/terms" element={<TermsPage />} />
                        <Route path="/about-us" element={<AboutUsPage />} />
                        <Route path="/contact-us" element={<ContactPage />} />
                        <Route path="/privacy" element={<PrivacyPage />} />
                        <Route path="/refund-policy" element={<RefundPage />} />

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      </AnimatedPage>
                    </Suspense>
                  </BrowserRouter>
              </LoadingOverlayProvider>
            </TooltipProvider>
          </CartProvider>
        </CohortProvider>
      </EnrollmentProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

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
import ModalDemo from "./pages/ModalDemo";
import { LoadingOverlayProvider } from "./contexts/LoadingOverlayContext";
import LoadingSpinnerOverlay from "./components/LogoSpinnerOverlay";

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
const SubmissionDetailPage = lazy(
  () => import("./pages/admin/SubmissionDetailPage")
);
const DummyCurriculumBuilderPage = lazy(
  () => import("./pages/admin/dummycurriculum")
);
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminBundles = lazy(() => import("./pages/admin/AdminBundles"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminOrganizations = lazy(
  () => import("./pages/admin/AdminOrganizations")
);
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminInstructors = lazy(() => import("./pages/admin/AdminInstructors"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminPopUps = lazy(() => import("./pages/admin/PopUps"));

// user pages
import BundleCheckoutPage from "./pages/BundleCheckoutPage";
import BundleDashboardPage from "./pages/BundleDashboardPage";
import BundleDetailPage from "./pages/BundleDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import CoursesPage from "./pages/CoursesPage";
import DashboardPage from "./pages/DashboardPage";
import LessonDetailPage from "./pages/LessonDetailPage";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Login from "./pages/auth/Login";
import SetNewPassword from "./pages/auth/PasswordReset";
import Signup from "./pages/auth/Signup";
import VerifyEmail from "./pages/auth/VerifyEmail";
import DummyBundleCheckoutPage from "./pages/dummycoursecheckoutpage";
import LandingPage from "./pages/landingpage";
import CartCheckoutPage from "./pages/cartCheckout";
import MySubmissionsPage from "./pages/MySubmissions";
import PopUpContainer from "./components/PopUpContainer";
import InvoicePage from "./pages/InvoicePage";
import MyInvoicesPage from "./pages/MyInvoices";

const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const RefundPage = lazy(() => import("./pages/RefundPolicy"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EnrollmentProvider>
        <CohortProvider>
          <CartProvider>
            <TooltipProvider>
              <LoadingOverlayProvider>
                <PopUpContainer />
                <Toaster />
                <BrowserRouter>
                  <Suspense
                    fallback={<LoadingSpinnerOverlay message="Loading..." />}
                  >
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route
                        path="/course/:courseId"
                        element={<CourseDetailPage />}
                      />
                      <Route path="/courses/" element={<CoursesPage />} />
                      <Route
                        path="/course/:courseId/lesson/:lessonId"
                        element={
                          <AuthGuard
                            requireAuth
                            requireEnrollmentOrAdmin={true}
                          >
                            <LessonDetailPage />
                          </AuthGuard>
                        }
                      />
                      <Route path="/auth/login" element={<Login />} />
                      <Route path="/auth/signup" element={<Signup />} />
                      <Route
                        path="/auth/verify-email"
                        element={<VerifyEmail />}
                      />
                      <Route
                        path="/auth/forgot-password"
                        element={<ForgotPassword />}
                      />
                      <Route
                        path="/auth/reset-password"
                        element={<SetNewPassword />}
                      />
                      <Route
                        path="/checkout/:courseId"
                        element={
                          <AuthGuard>
                            <CheckoutPage />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <AuthGuard>
                            <DashboardPage />
                          </AuthGuard>
                        }
                      />
                      <Route path="/dev/modal-demo" element={<ModalDemo />} />
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
                      <Route
                        path="/admin/orders"
                        element={
                          <AuthGuard requireAdmin>
                            <AdminOrders />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/admin/pop-ups"
                        element={
                          <AuthGuard requireAdmin>
                            <AdminPopUps />
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
                        path="/admin/organizations"
                        element={
                          <AuthGuard requireAdmin>
                            <AdminOrganizations />
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
                        path="/admin/create-bundle"
                        element={
                          <AuthGuard requireAdmin>
                            <CreateBundlePage />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="admin/edit-bundle/:bundleId"
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
                        path="/admin/dummy/edit-course/:courseId"
                        element={
                          <AuthGuard requireAdmin>
                            <DummyCurriculumBuilderPage />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/bundle/:bundleId"
                        element={<BundleDetailPage />}
                      />
                      <Route
                        path="/bundle/:bundleId/checkout"
                        element={
                          <AuthGuard>
                            <BundleCheckoutPage />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/bundle/:bundleId/dashboard"
                        element={
                          <AuthGuard>
                            <BundleDashboardPage />
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
                      <Route path="/courses" element={<CoursesPage />} />
                      <Route
                        path="dummy/bundle/:bundleId/checkout"
                        element={<DummyBundleCheckoutPage />}
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
                        path="/submissions"
                        element={<MySubmissionsPage />}
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
                      <Route path="*" element={<NotFound />} />
                      <Route
                        path="/invoices/:orderId"
                        element={<InvoicePage />}
                      />
                      <Route path="/invoices" element={<MyInvoicesPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/refund-policy" element={<RefundPage />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </LoadingOverlayProvider>
            </TooltipProvider>
          </CartProvider>
        </CohortProvider>
      </EnrollmentProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

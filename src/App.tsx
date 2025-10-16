import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EnrollmentProvider } from "@/contexts/EnrollmentContext";
import { CohortProvider } from "@/contexts/CohortContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import LessonDetailPage from "./pages/LessonDetailPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateCoursePage from "./pages/admin/CreateCoursePage";
import CreateBundlePage from "./pages/admin/CreateBundlePage";
import CurriculumBuilderPage from "./pages/admin/CurriculumBuilderPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import CheckoutPage from "./pages/CheckoutPage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";
import CohortBuilderPage from "./pages/admin/CreateCohortPage";
import CohortDetailPage from "./pages/admin/CohortDetailPage";
import CohortCheckoutPage from "./pages/CohortCheckoutPage";
import BundleDetailPage from "./pages/BundleDetailPage";
import BundleCheckoutPage from "./pages/BundleCheckoutPage";
import BundleDashboardPage from "./pages/BundleDashboardPage";
import CreateLessonPage from "./pages/admin/CreateLessonPage";
import EditLessonPage from "./pages/admin/EditLesson";
import EditUserPage from "./pages/admin/EditUser";
import LandingPage from "./pages/landingpage";
import ViewLessonAdmin from "./pages/admin/ViewLesson";
import ForgotPassword from "./pages/auth/ForgotPassword";
import SetNewPassword from "./pages/auth/PasswordReset";
import EditBundlePage from "./pages/admin/EditBundle";
import CreateCouponPage from "./pages/admin/CreateCouponPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import RefundPage from "./pages/RefundPolicy";
import DummyBundleCheckoutPage from "./pages/dummycoursecheckoutpage";
import EditCouponPage from "./pages/admin/EditCouponPage";
import VerifyEmail from "./pages/auth/VerifyEmail";
import { CartProvider } from "./contexts/CartContext";
import CartPage from "./pages/CartPage";
import DummyCurriculumBuilderPage from "./pages/admin/dummycurriculum";
import LoadingSpinnerOverlay from "./components/LogoSpinnerOverlay";
import { LoadingOverlayProvider } from "./contexts/LoadingOverlayContext";
import EditAssignmentPage from "./pages/admin/EditAssignmentPage";
import SubmissionDetailPage from "./pages/admin/SubmissionDetailPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EnrollmentProvider>
        <CohortProvider>
          <CartProvider>
            <TooltipProvider>
              <LoadingOverlayProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/course/:courseId" element={<CourseDetailPage />} />
                    <Route path="/courses/" element={<CoursesPage />} />

                    <Route
                      path="/course/:courseId/lesson/:lessonId"
                      element={
                        <AuthGuard requireAuth requireEnrollment>
                          <LessonDetailPage />
                        </AuthGuard>
                      }
                    />
                    <Route path="/auth/login" element={<Login />} />
                    <Route path="/auth/signup" element={<Signup />} />
                    <Route path="/auth/verify-email" element={<VerifyEmail />} />
                    <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                    <Route path="/auth/reset-password" element={<SetNewPassword />} />
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
                    <Route
                      path="/admin"
                      element={
                        <AuthGuard requireAuth requireAdmin>
                          <AdminDashboard />
                        </AuthGuard>
                      }
                    />
                    <Route path="/admin/course/:courseId/lesson/:lessonId" element={<ViewLessonAdmin />} />
                    <Route
                      path="/admin/course/:courseId/lesson/:lessonId"
                      element={
                        <AuthGuard requireAdmin >
                          <ViewLessonAdmin />
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/admin/create-lesson"
                      element={
                        <AuthGuard requireAdmin >
                          <CreateLessonPage />
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
                      path="/admin/edit-assignment/:assignmentId"
                      element={
                        <AuthGuard requireAdmin>
                          <EditAssignmentPage />
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/admin/assignments/:assignmentId/submissions"
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
                        <AuthGuard requireAdmin >
                          <EditBundlePage />
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="admin/edit-coupon/:couponId"
                      element={
                        <AuthGuard requireAdmin >
                          <EditCouponPage />
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/admin/create-cohort"
                      element={
                        <AuthGuard requireAdmin >
                          <CohortBuilderPage />
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/admin/cohort/:cohortId"
                      element={
                        <AuthGuard requireAdmin >
                          <CohortDetailPage />
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="/admin/edit-course/:courseId"
                      element={
                        <AuthGuard requireAdmin >
                          <CurriculumBuilderPage />
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/admin/dummy/edit-course/:courseId"
                      element={
                        <AuthGuard requireAdmin >
                          <DummyCurriculumBuilderPage />
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/cohort/:cohortId/checkout"
                      element={
                        <AuthGuard>
                          <CohortCheckoutPage />
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
                    <Route
                      path="/courses"
                      element={
                        <CoursesPage />
                      }
                    />
                    <Route
                      path="dummy/bundle/:bundleId/checkout"
                      element={<DummyBundleCheckoutPage />}
                    />
                    <Route path="*" element={<NotFound />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/refund-policy" element={<RefundPage />} />
                    <Route path="/cart" element={<CartPage />} />

                  </Routes>
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

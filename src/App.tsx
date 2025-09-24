
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
import { CreateCohortPage } from "./pages/admin/CreateCohortPage";
import CohortDetailPage from "./pages/admin/CohortDetailPage";
import EditCohortPage from "./pages/admin/EditCohortPage";
import UserCohortDetailPage from "./pages/CohortDetailPage";
import CohortCheckoutPage from "./pages/CohortCheckoutPage";
import CohortDashboardPage from "./pages/CohortDashboardPage";
import BundleDetailPage from "./pages/BundleDetailPage";
import BundleCheckoutPage from "./pages/BundleCheckoutPage";
import BundleDashboardPage from "./pages/BundleDashboardPage";
import CreateLessonPage from "./pages/admin/CreateLessonPage";
import EditLessonPage from "./pages/admin/EditLesson";
import EditUserPage from "./pages/admin/EditUser";
import LandingPage from "./pages/landingpage";
import ViewLessonAdmin from "./pages/admin/ViewLesson";
import ForgotPassword from "./pages/auth/ForgotPassword";
import { useCourseQuery } from "./hooks/useCaching";
import SetNewPassword from "./pages/auth/PasswordReset";

const queryClient = new QueryClient();



const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EnrollmentProvider>
        <CohortProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/course/:courseId" element={<CourseDetailPage />} />
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
                <Route path="/auth/forgot-password" element={< ForgotPassword />} />
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
                    <AuthGuard>
                      <CreateLessonPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/edit-lesson/:lessonId"
                  element={
                    <AuthGuard>
                      <EditLessonPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/edit-user/:userId"
                  element={
                    <AuthGuard>
                      <EditUserPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/create-course"
                  element={
                    <AuthGuard>
                      <CreateCoursePage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/create-bundle"
                  element={
                    <AuthGuard>
                      <CreateBundlePage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/create-cohort"
                  element={
                    <AuthGuard>
                      <CreateCohortPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/cohort/:cohortId"
                  element={
                    <AuthGuard>
                      <CohortDetailPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/cohort/:cohortId/edit"
                  element={
                    <AuthGuard>
                      <EditCohortPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/edit-course/:courseId"
                  element={
                    <AuthGuard>
                      <CurriculumBuilderPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/cohort/:cohortId"
                  element={<UserCohortDetailPage />}
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
                  path="/cohort/:cohortId/dashboard"
                  element={
                    <AuthGuard>
                      <CohortDashboardPage />
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
                  path="/courses"
                  element={
                   
                      <CoursesPage />
                   
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CohortProvider>
      </EnrollmentProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

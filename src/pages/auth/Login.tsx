import { Header } from "@/components/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRedirectParam, handleAuthRedirect } from "@/utils/auth-redirect";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || "/dashboard";
  const message = (location.state as any)?.message;
  const redirectUrl = getRedirectParam();

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const user = await loginWithGoogle();

      if (redirectUrl && (await handleAuthRedirect(redirectUrl))) return;

      toast({ title: "Welcome!", description: "You signed in with Google." });
      if (user?.role === USER_ROLE.ADMIN) {
        navigate("/admin", { replace: true });
      } else if (user?.role === USER_ROLE.ACCOUNTANT) {
        navigate("/accountant", { replace: true });
      } else if (user?.role === USER_ROLE.TEACHER) {
        navigate("/teacher", { replace: true });
      } else if (user?.role === USER_ROLE.INSTRUCTOR) {
        navigate("/instructor", { replace: true });
      } else {
        navigate(from || "/dashboard", { replace: true });
      }
    } catch (err: any) {
      console.log("Login error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex justify-center items-center py-12 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src="/RedPandaDraftLogo.png" className="w-10" alt="Logo" />
              <span className="text-2xl font-bold">RedPanda Learns</span>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Sign in to access your account</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              aria-label="Continue with Google"
              className="
    w-full h-15 justify-center gap-3 rounded-md
    bg-[#060606] text-white text-lg font-semibold
    hover:bg-[#060606] active:bg-[#1557b0]
    hover:scale-[1.02] transition-transform duration-150 ease-in-out
    shadow-lg shadow-[#1a73e8]/30
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a73e8]
    disabled:opacity-90
  "
            >
              <img src="/google-logo.svg" alt="Google" className="h-6 w-6" loading="eager" />
              {loading ? "Signing in..." : "Continue with Google"}
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/auth/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

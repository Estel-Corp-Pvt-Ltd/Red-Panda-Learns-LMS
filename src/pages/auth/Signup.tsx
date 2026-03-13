import React, { useState } from "react";

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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRedirectParam, handleAuthRedirect } from "@/utils/auth-redirect";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const redirectUrl = getRedirectParam();

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();

      if (redirectUrl && (await handleAuthRedirect(redirectUrl))) return;

      toast({
        title: "Account created successfully!",
        description: "Welcome to RedPanda Learns. You can now access your courses.",
      });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="py-12 px-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src="/RedPandaDraftLogo.png" className="w-10" alt="" />
              <span className="text-2xl font-bold">RedPanda Learns</span>
            </div>
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>Get started with RedPanda Learns</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="
    w-full h-15 justify-center gap-3 rounded-md
    bg-[#060606] text-white text-lg font-semibold
    hover:bg-[#060606] active:bg-[#1557b0]
    hover:scale-[1.02] transition-transform duration-150 ease-in-out
    shadow-lg shadow-[#1a73e8]/30
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a73e8]
    disabled:opacity-90
  "
              aria-label="Continue with Google"
            >
              <img src="/google-logo.svg" alt="Google" className="h-6 w-6" loading="eager" />
              {loading ? "Signing in..." : "Continue with Google"}
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

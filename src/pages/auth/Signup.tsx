import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, User, Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { getRecaptchaToken } from "@/utils/recaptcha";
import EmailSentAlert from "@/components/auth/EmailSentAlert";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailSentAlert, setShowEmailSentAlert] = useState(false);

  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 🔹 Password checks
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      // 🔹 1) Get v3 token with action 'signup'
      const token = await getRecaptchaToken("signup");
      if (!token) {
        setError("⚠️ reCAPTCHA verification failed. Please try again.");
        setLoading(false);
        return;
      }

      // 🔹 2) Verify on backend and enforce a score threshold (e.g., 0.6)
      const verifyUrl = import.meta.env.VITE_VERIFY_RECAPTCHA_URL;
      const res = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, expectedAction: "signup" }),
      });

      const verifyData = await res.json();

      if (!res.ok || !verifyData.success || (verifyData.score ?? 0) < 0.6) {
        setError("reCAPTCHA verification failed. Please try again.");
        setLoading(false);
        return;
      }

      console.log(
        "reCAPTCHA v3 passed — score:",
        verifyData.score,
        "action:",
        verifyData.action
      );

      // 🔹 3) Proceed with Firebase signup
      const confirmation = await signup(email, password, name);

      if (confirmation.success) {
        toast({
          title: "Account created successfully!",
          description: "Welcome to Vizuara AI Labs. You can now access your courses.",
        });
        setShowEmailSentAlert(true);
      } else {
        toast({
          title: "Sign up failed!",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      toast({
        title: "Account created successfully!",
        description:
          "Welcome to Vizuara AI Labs. You can now access your courses.",
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
              <img src="/logo.png" className="w-10" alt="" />
              <span className="text-2xl font-bold">Vizuara AI Labs</span>
            </div>
            <CardTitle className="text-2xl font-bold">
              Create an account
            </CardTitle>
            <CardDescription>
              Enter your information to get started with Vizuara AI Labs
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Button
                type="button"
                variant="outline"
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
                <img
                  src="/google-logo.svg"
                  alt="Google"
                  className="h-6 w-6 "
                  loading="eager"
                />
                {loading ? "Signing in..." : "Continue with Google"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col items-center gap-3">
            {" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Already have an account?{" "}
              <Link
                to="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                {" "}
                Sign in{" "}
              </Link>{" "}
            </p>{" "}
            <p className="text-[11px] text-muted-foreground text-center leading-snug">
              {" "}
              This site is protected by reCAPTCHA and the Google{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {" "}
                Privacy Policy{" "}
              </a>{" "}
              and{" "}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {" "}
                Terms of Service{" "}
              </a>{" "}
              apply.{" "}
            </p>{" "}
          </CardFooter>
        </Card>
      </div>
      {showEmailSentAlert && (<EmailSentAlert email={email} setVisible={setShowEmailSentAlert} />)}
    </div>
  );
}

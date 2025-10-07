import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, Chrome } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { USER_ROLE } from '@/constants';
import { getRecaptchaToken } from "@/utils/recaptcha";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/';
  const message = (location.state as any)?.message;

  // 🔹 Shared reCAPTCHA verification logic
  const verifyRecaptcha = async () => {
    const token = await getRecaptchaToken("login");  // add action for clarity

    const verifyUrl = import.meta.env.VITE_VERIFY_RECAPTCHA_URL;
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const verifyData = await res.json();

    if (!res.ok || !verifyData.success || (verifyData.score ?? 0) < 0.5) {
      throw new Error("⚠️ Bot verification failed. Debug info in console.");
    }

  };
  // 🔹 Email/Password Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyRecaptcha(); //  Check human first

      const { success, error, user } = await login(email, password);

      if (success) {
        toast({ title: "Welcome back!", description: "You have successfully logged in." });
        if (user?.role === USER_ROLE.ADMIN) {
          navigate("/admin", { replace: true });
        } else {
          navigate(from || "/dashboard", { replace: true });
        }
        return;
      }
      toast({ title: "Login Failed!", description: error });
    } catch (err: any) {
      setError(err.message || " Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Google OAuth Login
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await verifyRecaptcha(); // Check human first

      const user = await loginWithGoogle();

      toast({ title: "Welcome!", description: "You signed in with Google." });
      if (user?.role === USER_ROLE.ADMIN) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "⚠️ Something went wrong");
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
              <img src="/logo.png" className="w-10" alt="Logo" />
              <span className="text-2xl font-bold">Vizuara AI Labs</span>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {message && (
              <Alert><AlertDescription>{message}</AlertDescription></Alert>
            )}
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Enter your password"
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
                    {showPassword
                      ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                      : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <Chrome className="h-4 w-4 mr-2" />
              Google
            </Button>
          </CardContent>

          

         

          <CardFooter className="flex flex-col items-center gap-3"> <p className="text-sm text-muted-foreground"> Don&apos;t have an account?{" "} <Link to="/auth/signup" className="text-primary hover:underline font-medium"> Sign up </Link> </p> <p className="text-[11px] text-muted-foreground text-center leading-snug"> This site is protected by reCAPTCHA and the Google{" "} <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline" > Privacy Policy </a>{" "} and{" "} <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline" > Terms of Service </a>{" "} apply. </p> </CardFooter>
        </Card>
      </div>
    </div>
  );
}
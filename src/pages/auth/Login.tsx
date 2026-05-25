import { Header } from "@/components/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardModal } from "@/components/ui/standard-modal";
import { USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRedirectParam, handleAuthRedirect } from "@/utils/auth-redirect";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { loginWithGoogle, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || "/dashboard";
  const message = (location.state as any)?.message;
  const redirectUrl = getRedirectParam();

  const showError = (message: string) => {
    setError(message);
    setErrorModalOpen(true);
  };

  const clearError = () => {
    setError("");
    setErrorModalOpen(false);
  };

  const routeAfterLogin = (role: string) => {
    if (role === USER_ROLE.ADMIN) {
      navigate("/admin", { replace: true });
    } else if (role === USER_ROLE.ACCOUNTANT) {
      navigate("/accountant", { replace: true });
    } else if (role === USER_ROLE.TEACHER) {
      navigate("/teacher", { replace: true });
    } else if (role === USER_ROLE.INSTRUCTOR) {
      navigate("/instructor", { replace: true });
    } else {
      navigate(from || "/dashboard", { replace: true });
    }
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setEmailLoading(true);

    try {
      const result = await loginWithEmail(email, password);

      if (!result.success) {
        showError(result.error || "Email login failed");
        return;
      }

      if (redirectUrl && (await handleAuthRedirect(redirectUrl))) return;

      toast({ title: "Welcome!", description: "You signed in successfully." });
      routeAfterLogin(result.role);
    } catch (err: any) {
      console.log("Login error:", err);
      showError(err.message || "Something went wrong");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setLoading(true);

    try {
      const result = await loginWithGoogle();

      if (!result.success) {
        showError(result.error || "Google login failed");
        return;
      }

      if (redirectUrl && (await handleAuthRedirect(redirectUrl))) return;

      toast({ title: "Welcome!", description: "You signed in with Google." });

      routeAfterLogin(result.role);
    } catch (err: any) {
      console.log("Login error:", err);
      showError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-login-page">
      <StandardModal
        open={errorModalOpen && Boolean(error)}
        onOpenChange={(open) => {
          setErrorModalOpen(open);
          if (!open) setError("");
        }}
        tone="failure"
        title="Sign in failed"
        description={error}
      />

      <Header className="auth-login-header" />

      <main className="auth-login-main">
        <div className="auth-login-grid">
          <section className="auth-login-left" aria-label="Learning benefits">
            <div className="auth-login-pill">
              <Sparkles size={13} fill="currentColor" />
              AI Learning Made Simple
            </div>

            <div>
              <h1 className="auth-login-title">
                Master <span>AI Skills</span>
                <br />
                Through Interactive Learning
              </h1>
              <p className="auth-login-subtitle">
                Hands-on courses, real projects, streaks, XP systems, and community learning.
              </p>
            </div>

            <div className="auth-login-art-wrap">
              <img
                src="/learning-panda-light.png"
                className="auth-login-art auth-login-art-light"
                alt="Red panda learning on a laptop"
              />
              <img
                src="/learning-panda-image.png"
                className="auth-login-art auth-login-art-dark"
                alt="Red panda learning on a laptop"
              />
            </div>

          </section>

          <section className="auth-login-right" aria-label="Sign in">
            <div className="auth-login-card">
              <div className="auth-login-card-heading">
                <img src="/logo.png" alt="RedPandaLearns" />
                <h2>Welcome back, learner.</h2>
                <p>Sign in to continue your learning journey</p>
              </div>

              <div className="auth-login-actions">
                {message && (
                  <Alert className="auth-login-alert">
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                <form className="auth-login-form" onSubmit={handleEmailLogin}>
                  <div className="auth-login-field">
                    <Label htmlFor="email" className="sr-only">Email</Label>
                    <div className="auth-login-input-wrap">
                      <Mail size={17} />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-login-field">
                    <Label htmlFor="password" className="sr-only">Password</Label>
                    <div className="auth-login-input-wrap">
                      <Lock size={17} />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="auth-login-password-toggle"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={emailLoading || loading}
                    className="auth-login-provider auth-login-provider-primary"
                  >
                    {emailLoading ? "Signing in..." : "Sign in"}
                  </button>
                </form>

                <div className="auth-login-divider">
                  <span />
                  <span>or</span>
                  <span />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading || emailLoading}
                  aria-label="Continue with Google"
                  className="auth-login-provider"
                >
                  <img src="/google-logo.svg" alt="Google" loading="eager" />
                  {loading ? "Signing in..." : "Continue with Google"}
                </button>
              </div>

              <p className="auth-login-signup">
                Don&apos;t have an account? <Link to="/auth/signup">Sign up</Link>
              </p>
            </div>

          </section>
        </div>
      </main>
    </div>
  );
}

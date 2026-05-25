import React, { useState } from "react";

import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardModal } from "@/components/ui/standard-modal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRedirectParam, handleAuthRedirect } from "@/utils/auth-redirect";
import { Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { loginWithGoogle, signupWithEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const redirectUrl = getRedirectParam();

  const showError = (message: string) => {
    setError(message);
    setErrorModalOpen(true);
  };

  const clearError = () => {
    setError("");
    setErrorModalOpen(false);
  };

  const closeVerificationModal = () => {
    setVerificationModalOpen(false);
    navigate("/auth/login", { replace: true });
  };

  const getEmailVerificationContinueUrl = () => {
    const loginUrl = new URL("/auth/login", window.location.origin);
    if (redirectUrl) loginUrl.searchParams.set("redirect", redirectUrl);
    return loginUrl.toString();
  };

  const handleEmailSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    setEmailLoading(true);

    try {
      const result = await signupWithEmail(email, password, name, getEmailVerificationContinueUrl());

      if (!result.success) {
        showError(result.error || "Email signup failed");
        return;
      }

      setVerificationModalOpen(true);
    } catch (err: any) {
      showError(err.message || "Something went wrong");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    clearError();
    setLoading(true);

    try {
      const result = await loginWithGoogle();

      if (!result.success) {
        showError(result.error || "Google signup failed");
        return;
      }

      if (redirectUrl && (await handleAuthRedirect(redirectUrl))) return;

      toast({
        title: "Account created successfully!",
        description: "Welcome to RedPanda Learns. You can now access your courses.",
      });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
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
        title="Could not create account"
        description={error}
      />

      <StandardModal
        open={verificationModalOpen}
        onOpenChange={(open) => {
          if (!open) closeVerificationModal();
          else setVerificationModalOpen(true);
        }}
        tone="success"
        title="Check your email"
        description="We sent you a verification link. Verify your email before signing in."
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
                Start your <span>AI journey</span>
                <br />
                with hands-on learning
              </h1>
              <p className="auth-login-subtitle">
                Create your learner account, verify your email, and jump into courses built around
                projects, streaks, XP, and community practice.
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

          <section className="auth-login-right" aria-label="Create account">
            <div className="auth-login-card">
              <div className="auth-login-card-heading">
                <img src="/logo.png" alt="RedPandaLearns" />
                <h2>Create your learner account.</h2>
                <p>Sign up with email or continue with Google</p>
              </div>

              <div className="auth-login-actions">
                <form className="auth-login-form" onSubmit={handleEmailSignup}>
                  <div className="auth-login-field">
                    <Label htmlFor="signup-name" className="sr-only">Full name</Label>
                    <div className="auth-login-input-wrap">
                      <User size={17} />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Full name"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-login-field">
                    <Label htmlFor="signup-email" className="sr-only">Email</Label>
                    <div className="auth-login-input-wrap">
                      <Mail size={17} />
                      <Input
                        id="signup-email"
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
                    <Label htmlFor="signup-password" className="sr-only">Password</Label>
                    <div className="auth-login-input-wrap">
                      <Lock size={17} />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={6}
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

                  <div className="auth-login-field">
                    <Label htmlFor="signup-confirm-password" className="sr-only">
                      Confirm password
                    </Label>
                    <div className="auth-login-input-wrap">
                      <Lock size={17} />
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        className="auth-login-password-toggle"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={emailLoading || loading}
                    className="auth-login-provider auth-login-provider-primary"
                  >
                    {emailLoading ? "Creating account..." : "Create account"}
                  </button>
                </form>

                <div className="auth-login-divider">
                  <span />
                  <span>or</span>
                  <span />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={loading || emailLoading}
                  aria-label="Continue with Google"
                  className="auth-login-provider"
                >
                  <img src="/google-logo.svg" alt="Google" loading="eager" />
                  {loading ? "Signing up..." : "Continue with Google"}
                </button>
              </div>

              <p className="auth-login-signup">
                Already have an account? <Link to="/auth/login">Sign in</Link>
              </p>
            </div>

          </section>
        </div>
      </main>
    </div>
  );
}

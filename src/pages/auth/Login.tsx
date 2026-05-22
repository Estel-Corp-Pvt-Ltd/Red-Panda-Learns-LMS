import { Header } from "@/components/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRedirectParam, handleAuthRedirect } from "@/utils/auth-redirect";
import { Brain, Flame, Sparkles, Trophy, Users, Zap } from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Login.css";

const featureCards = [
  { icon: Flame, title: "7-Day Streaks", text: "Keep learning every day", tone: "orange" },
  { icon: Brain, title: "AI Projects", text: "Build real-world AI applications", tone: "pink" },
  { icon: Trophy, title: "XP & Leaderboards", text: "Earn XP and climb the ranks", tone: "gold" },
  { icon: Users, title: "Community Pods", text: "Learn together and grow", tone: "blue" },
];

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
      const result = await loginWithGoogle();

      if (!result.success) {
        setError(result.error || "Google login failed");
        return;
      }

      if (redirectUrl && (await handleAuthRedirect(redirectUrl))) return;

      toast({ title: "Welcome!", description: "You signed in with Google." });

      const role = result.role;
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
    } catch (err: any) {
      console.log("Login error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-login-page">
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

            <div className="auth-login-features">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="auth-login-feature">
                    <Icon className={`auth-login-icon-${feature.tone}`} size={29} />
                    <h2>{feature.title}</h2>
                    <p>{feature.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="auth-login-stats">
              <div className="auth-login-stat">
                <span>
                  <Users size={22} />
                </span>
                <p><strong>12,000+</strong>Active Learners</p>
              </div>
              <div className="auth-login-stat">
                <span className="auth-login-stat-hot">
                  <Zap size={22} fill="currentColor" />
                </span>
                <p><strong>1.2M+</strong>XP Earned This Week</p>
              </div>
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
                {error && (
                  <Alert variant="destructive" className="auth-login-alert auth-login-alert-error">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  aria-label="Continue with Google"
                  className="auth-login-provider auth-login-provider-primary"
                >
                  <img src="/google-logo.svg" alt="Google" loading="eager" />
                  {loading ? "Signing in..." : "Continue with Google"}
                </button>
              </div>

              <div className="auth-login-divider">
                <span />
                <span>or</span>
                <span />
              </div>

              <p className="auth-login-signup">
                Don&apos;t have an account? <Link to="/auth/signup">Sign up</Link>
              </p>
            </div>

            <div className="auth-login-loved">
              <div className="auth-login-avatars">
                {["AM", "RK", "NS", "SP"].map((name, index) => (
                  <span key={name} style={{ zIndex: 4 - index }}>
                    {name}
                  </span>
                ))}
              </div>
              <div>
                <div className="auth-login-stars" aria-label="Five stars">*****</div>
                <p>Loved by learners worldwide</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

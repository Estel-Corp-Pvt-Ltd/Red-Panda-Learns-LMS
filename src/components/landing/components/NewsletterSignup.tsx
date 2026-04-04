import { useState } from "react";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { subscribeToNewsletter } from "../services/newsletter.service";
import { useToast } from "@/hooks/use-toast";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SquiggleLine } from "./Doodles";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const result = await subscribeToNewsletter(email);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      toast({ title: "You're in! Welcome to the adventure." });
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  }

  return (
    <section className="py-16 px-6 paper-bg">
      <div className="mx-auto max-w-xl">
        <ScrollReveal>
          <div className="sketch-card p-10 text-center">
            {success ? (
              <div className="space-y-3">
                <CheckCircle className="mx-auto h-12 w-12 text-accent-mint" />
                <h3 className="font-bold text-foreground font-hand text-2xl">
                  You&apos;re on the list!
                </h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll send fun updates and new course alerts to your inbox.
                </p>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-3">✉️</div>
                <h2 className="font-hand text-3xl font-bold text-foreground">
                  Join the Adventure!
                </h2>
                <div className="flex justify-center mt-1">
                  <SquiggleLine className="w-32 text-accent-yellow/40" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Get notified about new courses, fun challenges, and special rewards.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="flex-1 rounded-lg border-2 border-foreground/15 bg-background px-4 py-2.5 text-sm outline-none focus:border-accent-sky transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button type="submit" className="btn-sketchy" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

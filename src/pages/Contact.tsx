import { useState, useRef, useLayoutEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, Copy, Check, MapPin } from "lucide-react";

export default function ContactPage() {
  const email = "hello@vizuara.com";
  const address =
    "HQ59+QWG, Pashan Hwy Side Rd, next to Royal Court Banquet, Baner, Pune, Maharashtra 411045";

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Auto-size address textarea
  const addressRef = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = addressRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  }, []);

  const copy = async (value: string, setFlag: (b: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
      setFlag(true);
      setTimeout(() => setFlag(false), 1200);
    } catch {
      // ignore
    }
  };

  // Shared classes for copy button: centered, visible in light/dark
  const copyBtn =
    "absolute right-2 inset-y-0 my-auto grid place-items-center h-10 w-10 md:h-12 md:w-12 rounded-xl " +
    // Light mode: black button with white icon
    "bg-black text-white border border-black/10 shadow-sm " +
    // Dark mode: flyred button
    "dark:bg-flyred dark:text-white dark:border-white/10 " +
    "hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-flyred";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Center the card on all screens */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl md:max-w-2xl rounded-2xl shadow-xl border border-border/60 dark:border-flyred/10 bg-card mx-auto">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
              <Mail className="h-6 w-6 text-flyred" />
              Contact Us
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8 pt-2">
            <p className="text-base text-muted-foreground">
              Send us an email and we&apos;ll get back to you shortly.
            </p>

            {/* Email (more padding) */}
            <div className="relative flex items-center">
              <Input
                readOnly
                value={email}
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                className="h-14 rounded-2xl pl-5 pr-16 text-base sm:text-lg border-border focus-visible:ring-flyred"
              />
              {/* Copy button – centered and visible in light mode (black) */}
              <button
                type="button"
                onClick={() => copy(email, setCopiedEmail)}
                aria-label={copiedEmail ? "Copied" : "Copy email"}
                className={copyBtn}
              >
                {copiedEmail ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>

            <div className="text-sm text-muted-foreground">
              Or email us directly:{" "}
              <a href={`mailto:${email}`} className="underline text-flyred hover:text-flyred/90">
                {email}
              </a>
            </div>

            {/* Address (wrap + centered copy button) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-flyred" />
                <span className="font-semibold">Address</span>
              </div>

              <div className="relative flex items-center">
                <textarea
                  ref={addressRef}
                  readOnly
                  value={address}
                  rows={2}
                  onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
                  className="w-full rounded-2xl pl-4 pr-16 text-base border border-border bg-background focus-visible:ring-flyred resize-none leading-relaxed py-3"
                  style={{ overflow: "hidden" }}
                />
                {/* Copy button – centered and visible in light mode (black) */}
                <button
                  type="button"
                  onClick={() => copy(address, setCopiedAddress)}
                  aria-label={copiedAddress ? "Copied" : "Copy address"}
                  className={copyBtn}
                >
                  {copiedAddress ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
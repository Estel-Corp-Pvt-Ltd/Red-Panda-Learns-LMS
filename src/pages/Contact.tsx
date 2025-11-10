import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Check } from "lucide-react";

export default function ContactPage() {
  const email = "hello@vizuara.com";
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (_) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 grid place-items-center px-4 py-14">
        <Card className="w-full max-w-xl md:max-w-2xl rounded-2xl shadow-xl border border-flyred/10 bg-card">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
              <Mail className="h-6 w-6 text-flyred" />
              Contact Us
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            <p className="text-base text-muted-foreground">
              Send us an email and we&apos;ll get back to you shortly.
            </p>

            <div className="relative">
              <Input
                readOnly
                value={email}
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                className="h-14 rounded-2xl pr-16 text-lg border-flyred/20 focus-visible:ring-flyred"
              />
              <Button
                type="button"
                size="icon"
                onClick={copyEmail}
                aria-label={copied ? "Copied" : "Copy email"}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-xl bg-flyred text-white hover:bg-flyred/90 focus-visible:ring-2 focus-visible:ring-flyred"
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Or click here to email us directly:{" "}
              <a
                href={`mailto:${email}`}
                className="underline text-flyred hover:text-flyred/90"
              >
                {email}
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
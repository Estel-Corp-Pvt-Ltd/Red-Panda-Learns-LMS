import { Card } from "@/components/ui/card";

export const NewsletterSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center rounded-3xl">
            <iframe
              title="Vizuara Newsletter Signup"
              src="https://www.vizuaranewsletter.com/embed"
              width="100%"
              height="320"
              className="block mx-auto mb-6 w-full max-w-[480px] rounded-xl border border-foreground/10 bg-card
                         dark:invert dark:hue-rotate-180"
              style={{ background: "transparent" }}
              frameBorder={0}
              scrolling="no"
              loading="lazy"
            />
            <noscript>
              <p className="mt-3 text-sm text-muted-foreground">
                JavaScript is disabled. Open the signup form here:{" "}
                <a
                  href="https://www.vizuaranewsletter.com/embed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  vizuaranewsletter.com/embed
                </a>
              </p>
            </noscript>

            <p className="text-xs text-muted-foreground">
              Stay updated with our newsletter. Get the latest AI insights and
              course updates directly in your inbox.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const NewsletterSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card p-12 text-center rounded-3xl">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-orange via-brand-fuchsia to-brand-blue rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="https://www.vizuara.com/lovable-uploads/4759bf6b-47a5-457f-8246-61d08da3288d.png"
                  alt="Logo"
                  className="w-6 h-6 "
                />
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Vizuara's AI Newsletter</span>
            </h2>

            <p className="text-xl text-muted-foreground mb-2">
              Your daily dose of AI/ML knowledge from MIT experts
            </p>

            <p className="text-lg font-semibold text-brand-fuchsia mb-8">
              Over 13,000 subscribers
            </p>

            <div className="max-w-md mx-auto mb-6">
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1"
                />
                <Button className="bg-gradient-to-r from-brand-fuchsia to-brand-blue text-white border-0 hover:opacity-90 px-6">
                  Subscribe
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Stay updated with our newsletter. Get the latest AI insights and
              course updates directly in your inbox.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

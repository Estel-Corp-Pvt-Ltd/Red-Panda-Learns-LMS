import { Header } from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-3xl mx-auto shadow-md">
          <CardHeader>
            <CardTitle>RedPanda Learns Refund Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm sm:text-base leading-relaxed">
            <p>Please read our refund policy carefully to understand our practices.</p>

            <section>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Once an <strong>individual course</strong> is purchased, it cannot be refunded.
                </li>
                <li>
                  Once a <strong>multi-course bundle</strong> is purchased, it cannot be refunded.
                </li>
              </ul>
            </section>

            <p className="text-muted-foreground">
              By purchasing a course or bundle on RedPanda Learns, you acknowledge and agree to this
              Refund Policy.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

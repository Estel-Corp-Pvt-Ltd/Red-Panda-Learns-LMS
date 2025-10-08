import { Header } from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-3xl mx-auto shadow-md">
          <CardHeader>
            <CardTitle>Vizuara Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm sm:text-base leading-relaxed">
            
            <section>
              <p>
                We value your privacy and have developed this policy to explain how we collect, use, communicate, and disclose personal information.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Collection & Purpose</h2>
              <p>
                Before collecting personal information, we will identify the purposes for which it will be used.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Consent & Use</h2>
              <p>
                We will only collect and use personal information for the specified purposes, unless we obtain the consent of the individual or as required by law.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Retention</h2>
              <p>
                We will retain personal information for as long as it is necessary to fulfill the specified purposes.
                Data will be collected in a fair and lawful manner, and, where appropriate, with the knowledge or consent of the individual.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Relevance & Accuracy</h2>
              <p>
                Personal data should be relevant to the purposes for which it will be used and, to the extent necessary, should be accurate, complete, and up-to-date.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Data Security</h2>
              <p>
                We will protect personal information with reasonable security safeguards against loss, theft, unauthorized access, disclosure, copying, use, or modification.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Transparency</h2>
              <p>
                We will make information about our policies and practices regarding the management of personal information readily available to customers.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Our Commitment</h2>
              <p>
                We are committed to conducting our business in accordance with these principles to ensure the confidentiality of personal information is protected and maintained.
              </p>
            </section>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
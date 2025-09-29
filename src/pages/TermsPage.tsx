import { Header } from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-3xl mx-auto shadow-md">
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm sm:text-base leading-relaxed">
            
            <section>
              <h2 className="font-semibold mb-2">Terms</h2>
              <p>
                By accessing this web site, you are agreeing to be bound by these
                web site Terms and Conditions of Use, all applicable laws and
                regulations, and agree that you are responsible for compliance
                with any applicable local laws. If you do not agree with any of
                these terms, you are prohibited from using or accessing this site.
                The materials contained in this web site are protected by applicable
                copyright and trademark law.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of the materials
                (information or software) on Vizuara’s web site for personal,
                non-commercial transitory viewing only. This is the grant of a license,
                not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Modify or copy the materials</li>
                <li>Share personal information or contact details with any teacher or student</li>
                <li>Use the materials for commercial purposes or public displays</li>
                <li>Attempt to decompile or reverse engineer any software from Vizuara</li>
                <li>Remove any copyright or proprietary notations</li>
                <li>Transfer the materials to another person or mirror them on any other server</li>
              </ul>
              <p className="mt-2">
                This license shall automatically terminate if you violate any of these
                restrictions and may be terminated by Vizuara at any time. Upon termination,
                you must destroy any downloaded materials in your possession whether in electronic
                or printed format.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Disclaimer</h2>
              <p>
                The materials on Vizuara’s web site are provided “as is”. Vizuara makes no warranties,
                expressed or implied, and disclaims all other warranties, including without limitation,
                implied warranties or conditions of merchantability, fitness for a particular purpose,
                or non-infringement of intellectual property or other rights. Further, Vizuara does not
                warrant the accuracy, likely results, or reliability of use of the materials.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Limitations</h2>
              <p>
                In no event shall Vizuara or its suppliers be liable for any damages (including, without
                limitation, damages for loss of data or profit, or due to business interruption,) arising
                out of the use or inability to use Vizuara’s site, even if a representative has been notified
                of potential damage. Some jurisdictions do not allow limitations on warranties, so these 
                limitations may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Revisions and Errata</h2>
              <p>
                The materials on Vizuara’s site may include errors (technical, typographical, or photographic).
                Vizuara does not guarantee materials are accurate, complete, or current, and may update content 
                at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Non-Solicitation</h2>
              <p>
                Teachers using the platform are not allowed to solicit business from students/parents or encourage
                them to leave Vizuara. Any violation will result in forfeiture of the account balance.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Links</h2>
              <p>
                Vizuara has not reviewed all linked sites and is not responsible for the contents of any such 
                site. Inclusion of a link does not imply endorsement. Use of linked web sites is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Site Terms of Use Modifications</h2>
              <p>
                Vizuara may revise these terms of use at any time without notice. By using this web site you 
                are agreeing to be bound by the then current version of these Terms.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
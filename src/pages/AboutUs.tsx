import { Header } from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-3xl mx-auto shadow-md">
          <CardHeader>
            <CardTitle>About Us</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-sm sm:text-base leading-relaxed">
            {/* Overview */}
            <section>
              <h2 className="font-semibold mb-2">Overview</h2>
              <p className="mb-3">
                We are Vizuara - a fast-growing Indian startup backed by the MIT ecosystem 
                revolutionizing AI education for students and professionals. Our mission is to
                make world-class, hands-on AI learning accessible to everyone.
              </p>
              <p>
                Vizuara is founded by alumni from IIT Madras, MIT, and Purdue University. We blend
                academic rigor with practical, industry-aligned projects to help learners build
                real skills, faster.
              </p>
            </section>

            {/* Mission & Vision */}
            <section>
              <h2 className="font-semibold mb-2">Our Mission</h2>
              <p>
                Democratize high-quality AI education through structured programs, actionable
                projects, and mentorship - enabling learners to go from fundamentals to real-world
                impact.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Our Vision</h2>
              <p>
                To become the most trusted platform for AI education in emerging markets - where
                ambitious learners build portfolios, publish work, and land meaningful opportunities.
              </p>
            </section>

            {/* What we do */}
            <section>
              <h2 className="font-semibold mb-2">What We Do</h2>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Project-based AI, ML, and Generative AI programs with mentorship</li>
                <li>University application guidance and profile-building support</li>
                <li>Industry-relevant capstones, papers, and portfolio curation</li>
                <li>Career enablement - demos, reviews, and interview preparation</li>
              </ul>
            </section>

            {/* Quick facts */}
            <section>
              <h2 className="font-semibold mb-2">Quick Facts</h2>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Backed by the MIT ecosystem; built by IIT Madras, MIT, and Purdue alumni</li>
                <li>Curriculum designed with a “learn-by-building” philosophy</li>
                <li>Hands-on mentorship and feedback loops for faster growth</li>
              </ul>
            </section>

            {/* Our story */}
            <section>
              <h2 className="font-semibold mb-2">Our Story</h2>
              <p>
                Starting with small cohorts and research-driven bootcamps, we saw how learners
                thrive when rigor meets relevance. Today, Vizuara brings that high-touch model
                to a broader audience - without compromising on depth, expectations, or outcomes.
              </p>
            </section>

            {/* Values */}
            <section>
              <h2 className="font-semibold mb-2">Our Values</h2>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Excellence over shortcuts - real skills, real outcomes</li>
                <li>Builder mindset - learn by creating, shipping, and iterating</li>
                <li>Clarity and honesty - in feedback, curriculum, and expectations</li>
                <li>Student-first - design every experience for learner success</li>
              </ul>
            </section>

           
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
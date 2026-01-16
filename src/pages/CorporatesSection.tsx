// src/sections/CorporatesSection.tsx
import { Button } from "@/components/ui/button";
import { Building2, Handshake, Copy, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import img from "/img.png";

const CorporatesSection = () => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const email = "hello@vizuara.com";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast({
      title: "Email copied!",
      description: "hello@vizuara.com has been copied to your clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative flex items-center justify-center py-20 px-4 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-4 text-foreground dark:text-white">
          For Corporates
        </h2>
        <p className="text-center text-foreground/60 dark:text-gray-400 mb-16 text-lg">
          Empower your organization with cutting-edge AI solutions and expert training
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          {/* AI Training for Industries */}
          <div className="p-8 rounded-xl border border-border/30 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm hover:shadow-lg dark:hover:shadow-blue-500/10 transition-all duration-300">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white shadow-lg shadow-blue-500/30">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground dark:text-white">
                  AI Training for Industries
                </h3>
              </div>

              <p className="text-foreground/70 dark:text-gray-300 text-sm leading-relaxed mb-6">
                Transform your workforce with comprehensive AI training programs tailored to your
                industry needs. Our expert-led courses equip your team with practical AI skills,
                from foundational concepts to advanced applications, enabling them to drive
                innovation and efficiency in your organization.
              </p>

              <ul className="space-y-3 text-foreground/70 dark:text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>Customized curriculum for your industry vertical</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>Hands-on training with real-world use cases</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>Expert instructors from MIT, Purdue &amp; IIT Madras</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>Flexible delivery: on-site, remote, or hybrid</span>
                </li>
              </ul>
            </div>
          </div>

          {/* B2B Partnership */}
          <div className="p-8 rounded-xl border border-border/30 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm hover:shadow-lg dark:hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 text-white shadow-lg shadow-purple-500/30">
                  <Handshake className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground dark:text-white">
                  B2B Partnership for AI Product Development
                </h3>
              </div>

              <p className="text-foreground/70 dark:text-gray-300 text-sm leading-relaxed mb-6">
                Work with our team to build AI products that are robust, explainable, and ready for
                production. From problem framing to deployment, we stay close to your business teams
                so that models actually ship and create value instead of staying in slide decks.
              </p>

              <ul className="space-y-3 text-foreground/70 dark:text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                  <span>End-to-end AI product design & development</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                  <span>Custom ML/DL models and LLM applications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                  <span>Scalable architecture, MLOps, and deployment support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                  <span>Long-term technical partnership and support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* WHY FIRST PRINCIPLE LABS */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6 items-stretch">
            {/* Left: Image, same height as right card on md+ */}
            <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-gray-900/60">
              <img
                src={img}
                alt="First Principle Labs"
                className="w-full h-full object-cover md:min-h-full"
              />
            </div>

            {/* Right: Why First Principle Labs text + CTA */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-gray-900/60 p-6 md:p-8 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Why First Principle Labs
                </p>
                <h3 className="text-xl md:text-2xl font-semibold text-foreground dark:text-white">
                  First Principle Labs : Our Industry Division
                </h3>
                <p className="mt-2 text-sm text-foreground/70 dark:text-gray-300">
                  Whether you are a company looking to apply AI to real‑world use cases and drive
                  measurable impact, or an organization aiming to upskill your workforce in modern
                  AI the right way, feel free to check out our website below .
                </p>

                {/* <ul className="mt-3 space-y-2 text-sm text-foreground/70 dark:text-gray-300">
                  <li>
                    • Strong technical depth across CV, NLP, and LLMs
                    <div className="ml-4 mt-1 text-xs text-foreground/60 dark:text-gray-400">
                      Awareness &amp; Foundations Program, Enterprise Agentic AI Deployment Program,
                      Advanced AI Engineering Division Program.
                    </div>
                  </li>
                  <li>• Structured discovery and design before writing code</li>
                  <li>• Data‑driven decisions and measurable business outcomes</li>
                  <li>• End‑to‑end builds: from notebooks to production roll‑outs</li>
                </ul> */}
              </div>

              <div className="mt-5">
                <Link
                  to="https://firstprinciplelabs.ai/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#5526ff] text-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-[#4019ce]"
                >
                  Visit firstprinciplelabs
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Email with Copy Button */}
        <div className="text-center">
          <p className="text-foreground/60 dark:text-gray-400 text-lg mb-4">
            Ready to transform your organization with AI? Get in touch with our team.
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border/30 dark:border-gray-800 shadow-lg dark:shadow-gray-900/50">
            <span className="text-foreground dark:text-white font-semibold text-lg">{email}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={copyToClipboard}
              className="h-8 w-8 rounded-full hover:bg-foreground/10 dark:hover:bg-gray-700"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="w-4 h-4 dark:text-gray-300" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CorporatesSection;

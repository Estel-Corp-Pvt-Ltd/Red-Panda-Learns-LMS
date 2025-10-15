import { Button } from "@/components/ui/button";
import { Building2, Handshake, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
    <section className="relative flex items-center justify-center py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-4 text-foreground">
          For Corporates
        </h2>
        <p className="text-center text-foreground/60 mb-16 text-lg">
          Empower your organization with cutting-edge AI solutions and expert training
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          {/* AI Training for Industries */}
          <div className="p-8 rounded-xl border border-border/30 bg-white/40 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  AI Training for Industries
                </h3>
              </div>
              
              <p className="text-foreground/70 text-sm leading-relaxed mb-6">
                Transform your workforce with comprehensive AI training programs tailored to your industry needs. 
                Our expert-led courses equip your team with practical AI skills, from foundational concepts to 
                advanced applications, enabling them to drive innovation and efficiency in your organization.
              </p>

              <ul className="space-y-3 text-foreground/70 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Customized curriculum for your industry vertical</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Hands-on training with real-world use cases</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Expert instructors from MIT, Purdue & IIT Madras</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Flexible delivery: on-site, remote, or hybrid</span>
                </li>
              </ul>
            </div>
          </div>

          {/* B2B Partnership */}
          <div className="p-8 rounded-xl border border-border/30 bg-white/40 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <Handshake className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  B2B Partnership for AI Product Development
                </h3>
              </div>
              
              <p className="text-foreground/70 text-sm leading-relaxed mb-6">
                Collaborate with our team of AI experts to build cutting-edge AI products tailored to your 
                business objectives. From concept to deployment, we partner with you to develop scalable, 
                production-ready AI solutions that deliver measurable business value.
              </p>

              <ul className="space-y-3 text-foreground/70 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>End-to-end AI product development</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Custom ML/DL models and LLM applications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Scalable architecture and deployment support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Long-term technical partnership and support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Email with Copy Button */}
        <div className="text-center">
          <p className="text-foreground/60 text-lg mb-4">
            Ready to transform your organization with AI? Get in touch with our team.
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-white/80 backdrop-blur-sm border border-border/30 shadow-lg">
            <span className="text-foreground font-semibold text-lg">{email}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={copyToClipboard}
              className="h-8 w-8 rounded-full hover:bg-foreground/10"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CorporatesSection;

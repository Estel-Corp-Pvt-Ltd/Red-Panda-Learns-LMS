import React from "react";
import { Award, Share2, CheckCircle2, Hourglass, ArrowRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import Sidebar, { UserSidebarMobileToggle } from "@/components/Sidebar";
import { useNavigate } from "react-router-dom";

const WhatsNew = () => {
  const navigate = useNavigate();
  return (
    // ROOT: Flex Column so Header sits on top
    <div className="flex flex-col h-screen bg-background font-sans">
      {/* 1. HEADER (Full Width, Top) */}
      <Header />

      {/* 2. BODY CONTAINER (Sidebar + Content) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Left Side) */}
        <Sidebar />

        {/* Main Scrollable Content (Right Side) */}
        <main className="flex-1 overflow-y-auto bg-background/50">
          <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-12">
            {/* Mobile top bar: title + arrow toggle for sidebar */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h1 className="text-lg font-semibold">Dashboard</h1>
              <UserSidebarMobileToggle />
            </div>
            {/* --- INTRO SECTION --- */}
            <div className="flex flex-col gap-4 border-b border-border/40 pb-8 mt-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider rounded-sm border border-primary/20">
                  <Sparkles className="w-3 h-3" /> New Feature Unlocked
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground">
                  Get Your <span className="text-primary">Certificate</span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                  You’ve done the hard work now get the proof. Official
                  <span className="font-semibold text-foreground mx-1">Course Certificates</span>
                  are now available for eligible courses.
                </p>
              </div>
            </div>

            {/* --- HERO BRUTALIST BOX --- */}
            <div className="relative group w-full">
              {/* The Container with Cut Corners */}
              <div
                className="relative bg-card text-card-foreground p-8 md:p-12 shadow-2xl"
                style={{
                  // The "Tech" Shape: Cut Top-Left and Bottom-Right
                  clipPath: "polygon(0 0, 100% 0, 100% 88%, 96% 100%, 0 100%, 0 0)",
                }}
              >
                {/* Heavy Corner Brackets (Visual Candy) */}
                <div className="absolute top-0 left-0 w-24 h-24 border-t-[8px] border-l-[8px] border-primary pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-24 h-24 border-b-[8px] border-r-[8px] border-primary pointer-events-none" />

                {/* Subtle Grid Pattern Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--primary)_1px,transparent_1px),linear-gradient(to_bottom,var(--primary)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-[0.03] pointer-events-none" />

                {/* Content Layout */}
                <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                  {/* Left: Text & CTA */}
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-black uppercase leading-[0.9] tracking-tighter mb-4">
                        Get{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50">
                          Certified
                        </span>
                      </h2>
                      <p className="text-xl font-semibold text-black  dark:text-white leading-relaxed border-l-4 border-primary/20 pl-6">
                        Look for the
                        <img
                          src="/isCertificateAvailableIcon.png"
                          alt="Certificate available"
                          className="h-10 w-10 inline-block p-1 mr-3"
                        />
                        icon on your dashboard. Complete <strong>90%</strong> of the course and{" "}
                        <strong>claim</strong> your proof of expertise instantly.
                      </p>
                    </div>
                  </div>

                  {/* Right: Visual Graphic */}
                  <div className="hidden lg:flex justify-center relative perspective-1000">
                    {/* Glow */}
                    <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full opacity-60" />

                    {/* The Certificate Card Representation */}
                    <div className="relative w-80 bg-background border border-border p-2 rotate-3 group-hover:rotate-0 transition-transform duration-500 ease-out shadow-2xl">
                      <div className="border-2 border-double border-muted p-6 h-56 flex flex-col items-center justify-center text-center space-y-4 bg-card/50">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 border border-primary/20">
                          <Award className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2 w-full flex flex-col items-center opacity-60">
                          <div className="w-32 h-2.5 bg-foreground rounded-sm" />
                          <div className="w-24 h-2 bg-foreground/50 rounded-sm" />
                        </div>
                        {/* "Stamp" */}
                        <div className="mt-4 px-4 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-md">
                          Official
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- HOW IT WORKS (User Friendly Steps) --- */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-1.5 bg-primary skew-x-[-12deg]"></div>
                <h3 className="text-2xl font-bold uppercase tracking-wide">How it works</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StepCard
                  step="01"
                  icon={CheckCircle2}
                  title="Learn"
                  desc="Dive into the content. Complete 90% of the course modules."
                />
                <StepCard
                  step="02"
                  icon={Zap}
                  title="Request"
                  desc="Hit the 'Complete Course' button to submit your profile."
                />
                <StepCard
                  step="03"
                  icon={Hourglass}
                  title="Verify"
                  desc="We review your progress quickly. Sit tight, it won't take long."
                />
                <StepCard
                  step="04"
                  icon={Share2}
                  title="Share"
                  desc="Get your public link. Add it to LinkedIn or download the PDF."
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- Helper Component for Steps ---
const StepCard = ({ step, icon: Icon, title, desc }) => (
  <div className="group relative bg-card p-6 border border-border hover:border-primary transition-colors duration-300 overflow-hidden shadow-sm">
    {/* Large Number Background */}
    <span className="absolute -right-4 -top-6 text-[100px] font-black text-muted/5 select-none group-hover:text-primary/5 transition-colors">
      {step}
    </span>

    <div className="relative z-10">
      <div className="w-12 h-12 bg-background border border-border text-foreground flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 group-hover:border-primary group-hover:text-primary transition-all duration-300 rounded-sm">
        <Icon className="w-6 h-6" />
      </div>

      <h4 className="text-xl font-bold uppercase mb-2 tracking-tight">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>

    {/* Bottom Line Accent Animation */}
    <div className="absolute bottom-0 left-0 w-0 h-1 bg-primary group-hover:w-full transition-all duration-500 ease-out" />
  </div>
);

export default WhatsNew;

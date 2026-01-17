// pages/WhatsNew.tsx
import React, { useState } from "react";
import { Award, Star } from "lucide-react";
import { Header } from "@/components/Header";
import Sidebar, { UserSidebarMobileToggle } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

// Import the tab components
import CertificateTab from "@/components/whatsNew/certificateNew";
import KarmaTab from "@/components/whatsNew/karma";

// --- Tab Types ---
type TabType = "CERTIFICATE" | "KARMA";

// --- Tab Configuration ---
const TABS = [
  {
    id: "KARMA" as TabType,
    label: "Karma",
    icon: Star,
    isNew: true,
  },
  {
    id: "CERTIFICATE" as TabType,
    label: "Certificates",
    icon: Award,
    isNew: false,
  },
];

const WhatsNew = () => {
  const [activeTab, setActiveTab] = useState<TabType>("KARMA");

  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-background/50">
          <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            {/* Mobile top bar */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h1 className="text-lg font-semibold">What's New</h1>
              <UserSidebarMobileToggle />
            </div>

            {/* --- TAB NAVIGATION --- */}
            <div className="flex items-center gap-2 border-b border-border">
              {TABS.map((tab) => (
                <TabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  icon={tab.icon}
                  label={tab.label}
                  isNew={tab.isNew}
                />
              ))}
            </div>

            {/* --- TAB CONTENT --- */}
            {activeTab === "CERTIFICATE" && <CertificateTab />}
            {activeTab === "KARMA" && <KarmaTab />}
          </div>
        </main>
      </div>
    </div>
  );
};

// --- Tab Button Component ---
const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  isNew = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  isNew?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative flex items-center gap-2 px-4 py-3 font-semibold text-sm uppercase tracking-wide transition-all duration-200",
      "border-b-2 -mb-[2px]",
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
    {isNew && (
      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-bold uppercase rounded-sm animate-pulse">
        New
      </span>
    )}
  </button>
);

export default WhatsNew;

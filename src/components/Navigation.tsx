import { Button } from "@/components/ui/button";
import { Code, Moon, Sun } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <nav className="flex items-center justify-between py-4 px-6 bg-background/95 backdrop-blur-sm border-b border-border">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Code className="h-8 w-8 text-primary" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
        </div>
        <span className="text-xl font-bold text-foreground">Diagramotion</span>
      </div>

      {/* Navigation Menu */}
      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
          Features
        </a>
        <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
          How It Works
        </a>
        <a href="#showcase" className="text-muted-foreground hover:text-foreground transition-colors">
          Showcase
        </a>
        <a href="#use-cases" className="text-muted-foreground hover:text-foreground transition-colors">
          Use Cases
        </a>
        <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
          Pricing
        </a>
        <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
          FAQ
        </a>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="premium" className="px-6">
          Get Started
        </Button>
      </div>
    </nav>
  );
}
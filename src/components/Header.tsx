import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo />
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#products" className="text-muted-foreground hover:text-foreground transition-colors">
            Products
          </a>
          <a href="#research" className="text-muted-foreground hover:text-foreground transition-colors">
            Research
          </a>
          <a href="#teaching" className="text-muted-foreground hover:text-foreground transition-colors">
            Teaching
          </a>
        </nav>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a href="/auth/login">  <Button variant="ghost" size="sm">
          
            Account
          </Button></a>
        </div>
      </div>
    </header>
  );
};
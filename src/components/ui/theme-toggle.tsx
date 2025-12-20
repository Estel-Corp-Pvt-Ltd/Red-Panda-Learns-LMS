import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  // Get initial theme from localStorage, default to 'true' (dark theme) if not set
  const savedTheme = localStorage.getItem("theme");
  const [isDark, setIsDark] = useState(savedTheme ? savedTheme === "dark" : true);

  // Function to toggle theme and save to localStorage
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    // Set the class on the document element
    document.documentElement.classList.toggle("dark", newTheme);

    // Save theme to localStorage
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  useEffect(() => {
    // On initial load, apply the theme stored in localStorage
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 px-0"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

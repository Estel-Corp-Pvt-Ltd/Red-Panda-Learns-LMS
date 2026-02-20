import { Mail, Linkedin, Youtube, Instagram, BookOpen } from "lucide-react";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">RedPanda Learns</h3>
            <p className="text-sm text-muted-foreground">
              Making AI accessible for all through innovative education and research.
            </p>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Products</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://dynaroute.RedPanda Learns.ai/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  DynaRoute
                </a>
              </li>
              <li>
                <a
                  href="https://vizz.RedPanda Learns.ai/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Vizz AI
                </a>
              </li>
            </ul>
          </div>

          {/* Research */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Research</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://research.RedPanda Learns.ai/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Research Domains
                </a>
              </li>
              <li>
                <a
                  href="https://ai-highschool-research.RedPanda Learns.ai/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  AI Researcher Bootcamp
                </a>
              </li>
              <li>
                <a
                  href="https://flyvidesh.online/ml-bootcamp"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  SciML Bootcamp
                </a>
              </li>
              <li>
                <a
                  href="https://cvresearchbootcamp.RedPanda Learns.ai/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Computer Vision Research Bootcamp
                </a>
              </li>
            </ul>
          </div>

          {/* Courses */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Courses</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://minor.RedPanda Learns.ai/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Minor in AI
                </a>
              </li>
              <li>
                <a
                  href="http://genai-minor.RedPanda Learns.ai/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Minor in GenAI
                </a>
              </li>
              <li>
                <a
                  href="https://courses.RedPanda Learns.ai/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Course Library
                </a>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/@RedPanda Learns"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  YouTube
                </a>
              </li>
            </ul>
          </div>

          {/* Company & Connect */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Company</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/about-us"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="/contact-us"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
            <div className="pt-2">
              <h4 className="text-sm font-semibold text-foreground mb-3">Follow Us</h4>
              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:hello@RedPanda Learns.com"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Email"
                >
                  <Mail className="h-5 w-5" />
                </a>
                <a
                  href="https://www.linkedin.com/company/RedPanda Learns"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="https://x.com/RedPanda Learnsai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="X (Twitter)"
                >
                  <XIcon className="h-5 w-5" />
                </a>
                <a
                  href="https://www.youtube.com/@RedPanda Learns"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com/RedPanda Learns_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://www.RedPanda Learnsnewsletter.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Substack"
                >
                  <BookOpen className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} RedPanda Learns. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="/about-us"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                About Us
              </a>
              <a
                href="/contact-us"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </a>
              <a
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

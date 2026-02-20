import { Link } from "react-router-dom";
import { SquiggleLine, DoodleStar } from "./Doodles";

export function LandingFooter() {
  return (
    <footer className="relative py-16 px-6 border-t-2 border-dashed border-foreground/10">
      <div className="pointer-events-none absolute inset-0">
        <DoodleStar className="absolute right-[10%] top-[20%] w-6 text-accent-yellow/20 animate-wiggle" />
        <DoodleStar className="absolute left-[8%] bottom-[30%] w-5 text-accent-lav/15" />
      </div>

      <div className="mx-auto max-w-6xl relative">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 font-hand text-2xl font-bold text-foreground">
              🐼 RedPanda Learns
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              A fun, safe place where kids learn, play, and grow their superpowers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-hand text-lg font-bold text-foreground mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/courses" className="hover:text-foreground transition-colors">All Courses</Link></li>
              <li><Link to="/free-courses" className="hover:text-foreground transition-colors">Free Courses</Link></li>
              <li><Link to="/about-us" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link to="/contact-us" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-hand text-lg font-bold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-hand text-lg font-bold text-foreground mb-3">Connect</h4>
            <p className="text-sm text-muted-foreground">
              hello@redpandalearns.com
            </p>
            <div className="mt-4">
              <Link to="/auth/signup" className="btn-sketchy text-sm py-2 px-4">
                Get Started
              </Link>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-10">
          <SquiggleLine className="w-48 text-foreground/10" />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} RedPanda Learns. Made with love for curious kids.
        </p>
      </div>
    </footer>
  );
}

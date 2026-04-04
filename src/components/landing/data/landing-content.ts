/* ──────────────────────────────────────────────
   Landing page content — hand-drawn sketchbook design
   ────────────────────────────────────────────── */

// ── Hero ──────────────────────────────────────
export const heroContent = {
  headline: "Learn Big.",
  headlineAccent: "Dream Bigger.",
  subheadline:
    "A fun, safe, and creative place where kids aged 6-14 explore exciting courses, earn Panda Points, and unlock their superpowers!",
  primaryCta: { text: "Start Learning Free!", href: "/auth/signup" },
  secondaryCta: { text: "I'm a Parent", href: "#for-parents" },
};

// ── Course Adventures ─────────────────────────
export interface CourseAdventure {
  icon: string;
  title: string;
  tagline: string;
  bgColor: string;
}

export const courseAdventures: CourseAdventure[] = [
  {
    icon: "✨",
    title: "Math Magic",
    tagline: "Numbers, puzzles & brain games",
    bgColor: "var(--accent-coral)",
  },
  {
    icon: "🔬",
    title: "Science Explorers",
    tagline: "Experiments & discoveries",
    bgColor: "var(--accent-sky)",
  },
  {
    icon: "🎨",
    title: "Creative Art",
    tagline: "Draw, paint & create!",
    bgColor: "var(--accent-mint)",
  },
  {
    icon: "💻",
    title: "Coding for Kids",
    tagline: "Build games & animations",
    bgColor: "var(--accent-lav)",
  },
  {
    icon: "🌍",
    title: "World Discoveries",
    tagline: "Explore places & cultures",
    bgColor: "var(--accent-yellow)",
  },
];

// ── How It Works (Chalkboard) ────────────────
export interface ChalkStep {
  step: number;
  emoji: string;
  title: string;
  description: string;
}

export const howItWorks: ChalkStep[] = [
  {
    step: 1,
    emoji: "📺",
    title: "Watch Fun Lessons",
    description: "Enjoy short, animated videos made just for kids.",
  },
  {
    step: 2,
    emoji: "🧩",
    title: "Try Activities",
    description: "Quizzes, games, and hands-on projects to practise what you learn.",
  },
  {
    step: 3,
    emoji: "⭐",
    title: "Get Points",
    description: "Earn Panda Points for every lesson you complete!",
  },
  {
    step: 4,
    emoji: "🚀",
    title: "Level Up!",
    description: "Unlock badges, new levels, and show off your skills.",
  },
];

// ── For Parents (Sticky Notes) ───────────────
export const parentStickyNotes = {
  safe: {
    title: "A Safe & Smart Place",
    color: "yellow" as const,
    items: [
      "No ads or distractions — ever",
      "100% kid-friendly content reviewed by educators",
      "Privacy controls and parental dashboard",
      "COPPA-compliant data handling",
    ],
  },
  peace: {
    title: "For Peace of Mind",
    color: "cyan" as const,
    items: [
      "Track your child's progress with clear reports",
      "Courses designed by certified teachers",
      "Flexible scheduling — learn anytime, anywhere",
      "Dedicated support team for parents",
    ],
  },
};

// ── Panda Points & Badges ────────────────────
export const progressBars = [
  { label: "Math Whiz", progress: 75, color: "var(--accent-coral)" },
  { label: "Science Lab", progress: 45, color: "var(--accent-sky)" },
];

export const stickerBook = [
  { emoji: "🏆", label: "Champion", unlocked: true },
  { emoji: "⭐", label: "Super Star", unlocked: true },
  { emoji: "🔬", label: "Scientist", unlocked: true },
  { emoji: "🎨", label: "Artist", unlocked: false },
  { emoji: "🚀", label: "Explorer", unlocked: false },
  { emoji: "💎", label: "Diamond", unlocked: false },
];

// ── Testimonials ──────────────────────────────
export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatar: string;
  bgColor: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "1",
    quote:
      "My son can't stop talking about his science experiments! He even taught his little sister how volcanoes work.",
    name: "Priya M.",
    role: "Parent of a 9-year-old",
    avatar: "👩",
    bgColor: "bg-pastel-peach",
  },
  {
    id: "2",
    quote:
      "Math used to be boring, but now it's like a game! I already earned 3 badges and I'm going for the 4th!",
    name: "Arjun K.",
    role: "Age 11, Student",
    avatar: "👦",
    bgColor: "bg-pastel-blue",
  },
  {
    id: "3",
    quote:
      "As a teacher, this platform makes it so easy to assign fun activities. The kids are more engaged than ever!",
    name: "Mrs. Sharma",
    role: "5th Grade Teacher",
    avatar: "👩‍🏫",
    bgColor: "bg-pastel-mint",
  },
];

// ── Pricing ──────────────────────────────────
export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  color: string;
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Explorer",
    price: "Free",
    period: "",
    description: "Great for getting started",
    features: [
      "5 free courses",
      "Basic badges",
      "Community access",
      "Limited quizzes",
    ],
    cta: "Start Free",
    color: "bg-pastel-blue",
  },
  {
    name: "Super Panda",
    price: "$9",
    period: "/month",
    description: "Most popular for learners",
    features: [
      "All courses unlocked",
      "Unlimited Panda Points",
      "Sticker book & badges",
      "Progress reports for parents",
      "Priority support",
    ],
    cta: "Go Super!",
    popular: true,
    color: "bg-pastel-yellow",
  },
  {
    name: "Classroom",
    price: "$49",
    period: "/month",
    description: "Perfect for schools",
    features: [
      "Up to 30 students",
      "Teacher dashboard",
      "Assignment tools",
      "Grade book & analytics",
      "Admin panel",
      "Dedicated support",
    ],
    cta: "Contact Us",
    color: "bg-pastel-mint",
  },
];

// ── Impact Stats ─────────────────────────────
export interface Stat {
  value: number;
  suffix: string;
  label: string;
  emoji: string;
}

export const impactStats: Stat[] = [
  { value: 1000, suffix: "+", label: "Happy Learners", emoji: "😊" },
  { value: 50, suffix: "+", label: "Fun Courses", emoji: "📚" },
  { value: 5000, suffix: "+", label: "Badges Earned", emoji: "🏅" },
  { value: 25, suffix: "+", label: "Schools", emoji: "🏫" },
];

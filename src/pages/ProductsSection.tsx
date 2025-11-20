import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

const products = [
  {
    logo: "/dynaroute-logo.png",
    title: "DynaRoute",
    description:
      "Route your queries to the most appropriate model based on complexity, cost, and performance requirements.",
    link: "https://dynaroute.vizuara.ai/",
    color: "#fbb03b",
    gradient: "from-[#fbb03b] to-[#ff9500]",
    bgClass: "bg-black dark:bg-gray-900",
  },
  {
    logo: "/vizz-logo.png",
    title: "Vizz-AI",
    description: "Your Personalized AI Tutor for Every Vizuara's Course",
    link: "https://vizz.vizuara.ai/",
    color: "#ff00ff",
    gradient: "from-[#ff00ff] to-[#cc00cc]",
    bgClass: "bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-900/30 dark:via-purple-900/30 dark:to-blue-900/30",
  },
];

const ProductsSection = () => {
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <section className="relative flex items-center justify-center py-24 px-4 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-blue-950/20"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-400/30 dark:bg-pink-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-400/30 dark:bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 dark:bg-background/30 backdrop-blur-sm border border-border/50 mb-4">
            <Sparkles className="w-4 h-4 text-foreground/70" />
            <span className="text-sm font-medium text-foreground/70">Our AI Products</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-semibold text-foreground">
            AI Products
          </h2>

          <p className="text-center text-foreground/60 text-lg max-w-2xl mx-auto">
            Accessible AI tools and platforms for all users
          </p>

          <p className="text-center text-foreground/70 text-base max-w-3xl mx-auto">
            Our AI tools are built from real research and hands-on experience, designed to solve actual problems you face
            in learning and development.
          </p>
        </div>

        {/* Product Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {products.map((product, index) => {
            const isHovered = hoveredCard === index;

            return (
              <div
                key={index}
                className="product-card relative group h-full"
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div
                  className="relative h-full p-8 rounded-2xl border border-border/50 dark:border-border/30 bg-background/60 dark:bg-background/40 backdrop-blur-md transition-all duration-300"
                  style={{
                    boxShadow: isHovered
                      ? `0 12px 40px -10px ${product.color}25, 0 0 0 1px ${product.color}15`
                      : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  }}
                >
                  <div className="relative flex flex-col items-center text-center space-y-6 h-full">
                    {/* Logo Container */}
                    <div
                      className={`relative p-5 rounded-full ${product.bgClass} transition-all duration-300`}
                      style={{
                        boxShadow: isHovered
                          ? `0 8px 24px ${product.color}40`
                          : '0 4px 12px rgba(0, 0, 0, 0.1)',
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      <img
                        src={product.logo}
                        alt={`${product.title} logo`}
                        className="w-14 h-14 object-contain"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-grow flex flex-col">
                      <h3
                        className="text-2xl font-semibold mb-3 transition-colors duration-300"
                        style={{
                          color: isHovered ? product.color : 'var(--foreground)',
                        }}
                      >
                        {product.title}
                      </h3>

                      <p className="text-foreground/70 dark:text-foreground/60 text-sm leading-relaxed flex-grow">
                        {product.description}
                      </p>
                    </div>

                    {/* Button */}
                    <Button
                      variant="outline"
                      size="lg"
                      className="mt-4 rounded-full group/btn border-2 transition-all duration-300"
                      style={{
                        borderColor: isHovered ? product.color : undefined,
                        color: isHovered ? product.color : undefined,
                      }}
                      asChild
                    >
                      <a
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <span>Learn More</span>
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
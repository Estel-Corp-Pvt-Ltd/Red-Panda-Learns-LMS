import { useEffect } from "react";

const TestimonialsSection = () => {
  useEffect(() => {
    // Load Senja widget script
    const script = document.createElement("script");
    script.src = "https://widget.senja.io/widget/b3824906-3bc9-4de7-be9e-9e52f4e559f1/platform.js";
    script.type = "text/javascript";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      document.body.removeChild(script);
    };
  }, []);

  return (
    <section className="relative flex items-center justify-center py-20 px-4 overflow-hidden">
      {/* Animated gradient blobs background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-300/40 rounded-full blur-3xl animate-blob-float-1"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-300/40 rounded-full blur-3xl animate-blob-float-2"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-300/30 rounded-full blur-3xl animate-blob-float-3"></div>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-16 text-foreground">
          Testimonials
        </h2>

        <div 
          className="senja-embed" 
          data-id="b3824906-3bc9-4de7-be9e-9e52f4e559f1" 
          data-mode="shadow" 
          data-lazyload="false" 
          style={{ display: "block", width: "100%" }}
        />
      </div>
    </section>
  );
};

export default TestimonialsSection;

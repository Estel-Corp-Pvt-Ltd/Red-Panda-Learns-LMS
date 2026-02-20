import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Library } from "lucide-react";

const minorCourses = [
  {
    title: "Minor in AI",
    description: "Comprehensive AI fundamentals program",
    link: "https://minor.RedPanda Learns.ai/",
    tags: ["Foundations for ML", "ML & DL Mastery", "NLP & CV", "LLM Capstone"],
  },
  {
    title: "Minor in GenAI",
    description: "Specialized generative AI curriculum",
    link: "http://genai-minor.RedPanda Learns.ai/",
    tags: ["GenAI Fundamentals", "Build LLMs", "Production Deployment", "LLM Capstone"],
  },
];

const archivedCourses = [
  {
    title: "For Undergrads, Grads & Industry Professionals",
    description:
      "Hand-picked courses by top RedPanda Learns instructors, conducted live over the past year. Now available as self-paced online courses for everyone.",
    link: "https://courses.RedPanda Learns.ai/",
    tags: [
      "ML-DL Mastery",
      "GenAI Fundamentals",
      "Build GPT",
      "Build SLM",
      "AI Agents",
      "Computer Vision",
      "RAG",
      "Fine-tuning",
      "RLHF",
      "Scientific ML",
    ],
  },
  {
    title: "For School Students",
    subtitle: "Interactive AI Learning for Grades 1-10",
    description:
      "AI/ML curriculum designed by MIT, Purdue experts. Interactive modules for learning AI/ML for all ages. Truly one of its kind!",
    link: "https://interactive-ai-courses.RedPanda Learns.ai/",
    tags: ["No-Code AI/ML", "Rich Content", "Self-Paced", "PhD Designed"],
  },
];

const AICoursesSection = () => {
  return (
    <section className="relative flex items-center justify-center py-20 px-4 overflow-hidden bg-background">
      {/* Animated gradient blobs background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-blue-950/20"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-400/50 dark:bg-pink-600/20 rounded-full blur-3xl animate-blob-float-1"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-400/50 dark:bg-purple-600/20 rounded-full blur-3xl animate-blob-float-2"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-400/40 dark:bg-blue-600/15 rounded-full blur-3xl animate-blob-float-3"></div>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-4 text-foreground">
          AI Courses
        </h2>
        <p className="text-center text-foreground/60 dark:text-foreground/50 mb-16 text-lg">
          Transforming education through innovative AI learning programs
        </p>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Minor Courses (LIVE) - Purple/Pink Theme */}
          <div className="relative">
            {/* Purple/Pink gradient blobs for Minor section */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-[180px] h-[180px] bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-8">
                <GraduationCap className="w-6 h-6 text-foreground" />
                <h3 className="text-2xl md:text-3xl font-semibold text-foreground">
                  Minor{" "}
                  <span className="text-primary inline-flex items-center gap-2">
                    (LIVE
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 dark:bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 dark:bg-red-400"></span>
                    </span>
                    )
                  </span>
                </h3>
              </div>
              <div className="space-y-6">
                {minorCourses.map((course, index) => (
                  <div
                    key={index}
                    className="p-8 rounded-xl border border-purple-200/50 dark:border-purple-800/30 
                               bg-gradient-to-br from-purple-50/80 to-pink-50/80 
                               dark:from-purple-950/40 dark:to-pink-950/40 
                               backdrop-blur-sm 
                               hover:shadow-lg hover:shadow-purple-200/50 dark:hover:shadow-purple-900/30 
                               transition-all duration-300"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <h4 className="text-xl font-semibold text-foreground">{course.title}</h4>
                      <p className="text-foreground/70 dark:text-foreground/60 text-sm leading-relaxed">
                        {course.description}
                      </p>
                      {course.tags && course.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mt-3">
                          {course.tags.map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant="secondary"
                              className="text-xs bg-purple-100/80 dark:bg-purple-900/40 
                                         text-purple-900 dark:text-purple-200 
                                         border-purple-200/50 dark:border-purple-700/50 
                                         cursor-default hover:bg-purple-100/80 dark:hover:bg-purple-900/40 
                                         shimmer"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 rounded-full 
                                   border-purple-300 dark:border-purple-700 
                                   hover:bg-purple-600 dark:hover:bg-purple-600 
                                   hover:text-white dark:hover:text-white 
                                   hover:border-purple-600 dark:hover:border-purple-600 
                                   transition-all duration-200"
                        asChild
                      >
                        <a href={course.link} target="_blank" rel="noopener noreferrer">
                          Learn More
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Course Library - Blue/Teal Theme */}
          <div className="relative">
            {/* Blue/Teal gradient blobs for Course Library section */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-[180px] h-[180px] bg-teal-400/20 dark:bg-teal-600/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-8">
                <Library className="w-6 h-6 text-foreground" />
                <h3 className="text-2xl md:text-3xl font-semibold text-foreground">
                  Course Library
                </h3>
              </div>
              <div className="space-y-6">
                {archivedCourses.map((course, index) => (
                  <div
                    key={index}
                    className="p-8 rounded-xl border border-blue-200/50 dark:border-blue-800/30 
                               bg-gradient-to-br from-blue-50/80 to-teal-50/80 
                               dark:from-blue-950/40 dark:to-teal-950/40 
                               backdrop-blur-sm 
                               hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 
                               transition-all duration-300"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <h4 className="text-lg font-semibold text-foreground">{course.title}</h4>
                      {course.subtitle && (
                        <p className="text-primary font-medium text-sm">{course.subtitle}</p>
                      )}
                      <p className="text-foreground/70 dark:text-foreground/60 text-sm leading-relaxed">
                        {course.description}
                      </p>
                      {course.tags && course.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mt-3">
                          {course.tags.map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant="secondary"
                              className="text-xs bg-blue-100/80 dark:bg-blue-900/40 
                                         text-blue-900 dark:text-blue-200 
                                         border-blue-200/50 dark:border-blue-700/50 
                                         cursor-default hover:bg-blue-100/80 dark:hover:bg-blue-900/40 
                                         shimmer"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 rounded-full 
                                   border-blue-300 dark:border-blue-700 
                                   hover:bg-blue-600 dark:hover:bg-blue-600 
                                   hover:text-white dark:hover:text-white 
                                   hover:border-blue-600 dark:hover:border-blue-600 
                                   transition-all duration-200"
                        asChild
                      >
                        <a href={course.link} target="_blank" rel="noopener noreferrer">
                          Visit Course
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AICoursesSection;

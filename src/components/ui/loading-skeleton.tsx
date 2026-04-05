import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'circle' | 'video';
  lines?: number;
}

export function LoadingSkeleton({ 
  className, 
  variant = 'default',
  lines = 1 
}: LoadingSkeletonProps) {
  const baseClasses = "relative overflow-hidden bg-muted/50 dark:bg-muted rounded border border-border/30 animate-pulse";

  const shimmerClasses = "absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-shimmer";

  if (variant === 'card') {
    return (
      <div className={cn("space-y-4 p-6", className)}>
        <div className={cn(baseClasses, "h-48 rounded-lg")}>
          <div className={shimmerClasses} />
        </div>
        <div className="space-y-2">
          <div className={cn(baseClasses, "h-6 w-3/4")}>
            <div className={shimmerClasses} />
          </div>
          <div className={cn(baseClasses, "h-4 w-1/2")}>
            <div className={shimmerClasses} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={cn(baseClasses, "h-4", {
            "w-full": i === 0,
            "w-4/5": i === 1,
            "w-3/5": i === 2,
            "w-3/4": i > 2,
          })}>
            <div className={shimmerClasses} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div className={cn(baseClasses, "h-12 w-12 rounded-full", className)}>
        <div className={shimmerClasses} />
      </div>
    );
  }

  if (variant === 'video') {
    return (
      <div className={cn(baseClasses, "aspect-video rounded-lg", className)}>
        <div className={shimmerClasses} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-background/20 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-6 border-r-0 border-t-4 border-b-4 border-l-foreground/40 border-t-transparent border-b-transparent ml-1" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(baseClasses, "h-4", className)}>
      <div className={shimmerClasses} />
    </div>
  );
}
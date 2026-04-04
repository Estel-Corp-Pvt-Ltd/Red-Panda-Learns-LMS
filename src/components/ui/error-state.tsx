import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
  variant?: 'default' | 'network' | 'empty' | 'minimal';
  title?: string;
  description?: string;
}

export function ErrorState({ 
  error, 
  onRetry, 
  className,
  variant = 'default',
  title,
  description
}: ErrorStateProps) {
  const getErrorContent = () => {
    if (variant === 'network') {
      return {
        icon: WifiOff,
        title: title || "Connection Error",
        description: description || "Please check your internet connection and try again.",
      };
    }

    if (variant === 'empty') {
      return {
        icon: AlertTriangle,
        title: title || "No Data Available",
        description: description || "There's nothing to show here yet.",
      };
    }

    if (variant === 'minimal') {
      return {
        icon: AlertTriangle,
        title: title || "Something went wrong",
        description: description || error?.message || "An unexpected error occurred.",
      };
    }

    // Default variant
    return {
      icon: AlertTriangle,
      title: title || "Something went wrong",
      description: description || error?.message || "We encountered an error while loading this content. Please try again.",
    };
  };

  const { icon: Icon, title: errorTitle, description: errorDescription } = getErrorContent();

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Icon className="h-4 w-4" />
        <span className="text-sm">{errorTitle}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-auto p-1 text-primary hover:text-primary-hover"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 space-y-4",
      "min-h-[200px] bg-card rounded-lg border border-dashed",
      className
    )}>
      <div className="flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
        <Icon className="h-8 w-8 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-foreground">{errorTitle}</h3>
        <p className="text-muted-foreground text-sm max-w-md">{errorDescription}</p>
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-4 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}
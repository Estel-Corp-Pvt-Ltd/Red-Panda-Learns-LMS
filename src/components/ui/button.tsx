// @/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 select-none",
  {
    variants: {
      variant: {
        default: "rounded-md bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        nohover: "rounded-md border border-input bg-background",
        secondary: "rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "rounded-md hover:bg-accent hover:text-accent-foreground",
        link: "rounded-none text-primary underline-offset-4 hover:underline",

        // Neon pill (matches screenshot)
        pill:
          "rounded-md bg-[#ff00f7] text-white shadow-sm " +
          "hover:bg-[#e100d9] active:bg-[#bf00b7] " +
          "focus-visible:ring-2 focus-visible:ring-[#ffc1ff] focus-visible:ring-offset-2 " +
          "gap-3 font-bold",
      },
      // inside buttonVariants
      size: {
        default: "px-4 py-3 text-sm", // was h-10 px-4
        sm: "px-3 py-2.5 text-xs sm:text-sm", // was h-8 px-3
        lg: "px-6 py-3.5 text-base", // was h-11 px-6
        icon: "h-10 w-10", // keep icon square
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

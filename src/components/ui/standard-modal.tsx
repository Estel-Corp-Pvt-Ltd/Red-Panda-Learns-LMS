import * as React from "react";
import { CheckCircle2, CircleAlert, Info, OctagonAlert, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type StandardModalTone = "failure" | "error" | "warning" | "success" | "info";

type StandardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  tone?: StandardModalTone;
  actionLabel?: string;
  onAction?: () => void;
};

const toneConfig = {
  failure: {
    icon: OctagonAlert,
    iconClassName: "bg-[#ff3d1f] text-white shadow-[0_18px_40px_rgba(255,61,31,0.28)]",
    haloClassName: "bg-[#ff3d1f]/10",
  },
  error: {
    icon: CircleAlert,
    iconClassName: "bg-[#ff5a1f] text-white shadow-[0_18px_40px_rgba(255,90,31,0.25)]",
    haloClassName: "bg-[#ff5a1f]/10",
  },
  warning: {
    icon: TriangleAlert,
    iconClassName: "bg-[#f59e0b] text-white shadow-[0_18px_40px_rgba(245,158,11,0.25)]",
    haloClassName: "bg-[#f59e0b]/12",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "bg-[#16a34a] text-white shadow-[0_18px_40px_rgba(22,163,74,0.22)]",
    haloClassName: "bg-[#16a34a]/10",
  },
  info: {
    icon: Info,
    iconClassName: "bg-[#2563eb] text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)]",
    haloClassName: "bg-[#2563eb]/10",
  },
};

export function StandardModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  tone = "info",
  actionLabel = "Got it",
  onAction,
}: StandardModalProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  const handleAction = () => {
    onAction?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[364px] gap-0 overflow-hidden rounded-[16px] border border-[#ffd7c8] bg-[#fffaf7] p-0 text-[#0f172a] shadow-[0_24px_84px_rgba(0,0,0,0.32)] sm:rounded-[20px] [&>button]:right-4 [&>button]:top-4 [&>button]:grid [&>button]:h-8 [&>button]:w-8 [&>button]:place-items-center [&>button]:rounded-full [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white/70 [&>button]:text-slate-600 [&>button]:opacity-100 [&>button]:shadow-sm [&>button_svg]:h-4 [&>button_svg]:w-4">
        <div className="relative px-5 pb-7 pt-14 sm:px-8 sm:pb-8 sm:pt-16">
          <div className="pointer-events-none absolute left-[31%] top-[22%] h-2 w-2 rounded-full bg-[#a78bfa]/70" />
          <div className="pointer-events-none absolute right-[30%] top-[25%] h-2 w-2 rounded-full bg-[#fecaca]" />
          <div className="pointer-events-none absolute left-[37%] top-[18%] h-5 w-5">
            <span className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 rounded-full bg-[#facc15]" />
            <span className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[#facc15]" />
          </div>
          <div className="pointer-events-none absolute right-[35%] top-[18%] h-6 w-5 rotate-[-20deg] border-r-[3px] border-t-[3px] border-[#ffb199]/70" />

          <DialogHeader className="items-center space-y-5 text-center">
            <div className={cn("grid h-20 w-20 place-items-center rounded-full", config.haloClassName)}>
              <span
                className={cn(
                  "grid h-[50px] w-[50px] place-items-center rounded-[16px]",
                  config.iconClassName
                )}
              >
                <Icon className="h-6 w-6 stroke-[2.6]" aria-hidden="true" />
              </span>
            </div>

            <div className="max-w-[280px] space-y-2">
              <DialogTitle className="text-center text-[22px] font-black leading-tight tracking-normal text-[#111827]">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="text-center text-sm font-semibold leading-6 text-[#667085]">
                  {description}
                </DialogDescription>
              )}
            </div>
          </DialogHeader>

          {children && <div className="mt-4 text-center text-sm text-[#667085]">{children}</div>}
        </div>

        <DialogFooter className="border-t border-[#f3ded5] bg-white/45 px-5 py-4 sm:justify-center sm:space-x-0">
          <Button
            type="button"
            onClick={handleAction}
            className="min-w-[136px] rounded-lg bg-[#ff3d1f] px-6 py-3 text-sm font-black text-white shadow-[0_10px_21px_rgba(255,61,31,0.24)] hover:bg-[#ef3519]"
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

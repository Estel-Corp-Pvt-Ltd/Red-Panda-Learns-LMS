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
      <DialogContent className="w-[calc(100%-2rem)] max-w-[520px] gap-0 overflow-hidden rounded-[22px] border border-[#ffd7c8] bg-[#fffaf7] p-0 text-[#0f172a] shadow-[0_34px_120px_rgba(0,0,0,0.38)] sm:rounded-[28px] [&>button]:right-6 [&>button]:top-6 [&>button]:grid [&>button]:h-11 [&>button]:w-11 [&>button]:place-items-center [&>button]:rounded-full [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white/70 [&>button]:text-slate-600 [&>button]:opacity-100 [&>button]:shadow-sm [&>button_svg]:h-6 [&>button_svg]:w-6">
        <div className="relative px-7 pb-10 pt-20 sm:px-12 sm:pb-12 sm:pt-24">
          <div className="pointer-events-none absolute left-[31%] top-[22%] h-3 w-3 rounded-full bg-[#a78bfa]/70" />
          <div className="pointer-events-none absolute right-[30%] top-[25%] h-3 w-3 rounded-full bg-[#fecaca]" />
          <div className="pointer-events-none absolute left-[37%] top-[18%] h-7 w-7">
            <span className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 rounded-full bg-[#facc15]" />
            <span className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[#facc15]" />
          </div>
          <div className="pointer-events-none absolute right-[35%] top-[18%] h-9 w-7 rotate-[-20deg] border-r-4 border-t-4 border-[#ffb199]/70" />

          <DialogHeader className="items-center space-y-7 text-center">
            <div className={cn("grid h-28 w-28 place-items-center rounded-full", config.haloClassName)}>
              <span
                className={cn(
                  "grid h-[70px] w-[70px] place-items-center rounded-[22px]",
                  config.iconClassName
                )}
              >
                <Icon className="h-9 w-9 stroke-[2.6]" aria-hidden="true" />
              </span>
            </div>

            <div className="max-w-[360px] space-y-3">
              <DialogTitle className="text-center text-[28px] font-black leading-tight tracking-normal text-[#111827]">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="text-center text-base font-semibold leading-7 text-[#667085]">
                  {description}
                </DialogDescription>
              )}
            </div>
          </DialogHeader>

          {children && <div className="mt-5 text-center text-sm text-[#667085]">{children}</div>}
        </div>

        <DialogFooter className="border-t border-[#f3ded5] bg-white/45 px-7 py-6 sm:justify-center sm:space-x-0">
          <Button
            type="button"
            onClick={handleAction}
            className="min-w-[190px] rounded-xl bg-[#ff3d1f] px-8 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(255,61,31,0.28)] hover:bg-[#ef3519]"
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

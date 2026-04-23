import { Lock, CheckCircle2, Wrench, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusVariant = "live" | "building" | "ready" | "locked" | "not_started";

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

const VARIANTS: Record<StatusVariant, { label: string; cls: string; icon: React.ElementType | null }> = {
  live: {
    label: "Live",
    cls: "bg-success/15 text-success border-success/30",
    icon: CheckCircle2,
  },
  building: {
    label: "Building",
    cls: "bg-secondary/15 text-secondary border-secondary/30 animate-pulse-subtle",
    icon: Wrench,
  },
  ready: {
    label: "Ready to Publish",
    cls: "bg-accent/15 text-accent border-accent/30",
    icon: CheckCircle2,
  },
  locked: {
    label: "Locked",
    cls: "bg-muted text-muted-foreground border-border",
    icon: Lock,
  },
  not_started: {
    label: "Ready to Build",
    cls: "bg-primary/5 text-primary border-primary/20 dark:bg-primary/10 dark:text-primary-foreground/80",
    icon: Circle,
  },
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const cfg = VARIANTS[variant];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        cfg.cls,
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label || cfg.label}
    </span>
  );
}

export default StatusBadge;

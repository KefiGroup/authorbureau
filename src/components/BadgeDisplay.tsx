import { Shield, ShieldCheck, Star, Award } from "lucide-react";

export type BadgeLevel = "listed" | "verified" | "featured" | "publishnow-verified";

const badgeConfig: Record<BadgeLevel, {
  label: string;
  icon: typeof Shield;
  className: string;
}> = {
  listed: {
    label: "Listed",
    icon: Shield,
    className: "bg-muted text-muted-foreground border border-border",
  },
  verified: {
    label: "Verified Author",
    icon: ShieldCheck,
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200/50",
  },
  featured: {
    label: "Featured Author",
    icon: Star,
    className: "bg-secondary/10 text-secondary border border-secondary/20",
  },
  "publishnow-verified": {
    label: "PublishNow Verified",
    icon: Award,
    className: "bg-gradient-to-r from-secondary/10 to-secondary/5 text-secondary border border-secondary/20",
  },
};

interface BadgeDisplayProps {
  level: BadgeLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function BadgeDisplay({ level, size = "md", showLabel = true }: BadgeDisplayProps) {
  const config = badgeConfig[level];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses[size]}`}>
      <Icon className={iconSizes[size]} />
      {showLabel && config.label}
    </span>
  );
}

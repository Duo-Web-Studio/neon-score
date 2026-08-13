import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  variant?: "default" | "destructive" | "cyan" | "purple" | "success";
}

const variantStyles: Record<string, { glow: string; iconBg: string; iconColor: string }> = {
  default: {
    glow: "",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  destructive: {
    glow: "hover:shadow-[0_0_25px_-5px_hsl(0_84%_60%/0.3)]",
    iconBg: "bg-destructive/15",
    iconColor: "text-destructive",
  },
  cyan: {
    glow: "hover:shadow-[0_0_25px_-5px_hsl(33_100%_50%/0.3)]",
    iconBg: "bg-secondary/15",
    iconColor: "text-secondary",
  },
  purple: {
    glow: "hover:shadow-[0_0_25px_-5px_hsl(50_100%_50%/0.3)]",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  success: {
    glow: "hover:shadow-[0_0_25px_-5px_hsl(142_71%_45%/0.3)]",
    iconBg: "bg-success/15",
    iconColor: "text-success",
  },
};

export function KPICard({ title, value, change, icon: Icon, variant = "default" }: KPICardProps) {
  const styles = variantStyles[variant];
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={`glass-card p-5 transition-all duration-300 hover:-translate-y-0.5 ${styles.glow}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={`text-xs font-medium ${
                  isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {isPositive ? "+" : ""}
                {change}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={`rounded-xl p-2.5 ${styles.iconBg}`}>
          <Icon className={`h-5 w-5 ${styles.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

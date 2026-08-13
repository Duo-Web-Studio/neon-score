interface GoalProgressBarProps {
  percentage: number;
  label?: string;
}

export function GoalProgressBar({ percentage, label }: GoalProgressBarProps) {
  const clampedPct = Math.min(100, Math.max(0, percentage));

  return (
    <div className="glass-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {label ?? "Progresso da Meta"}
        </h3>
        <span className="text-sm font-bold text-foreground">{clampedPct}%</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full gradient-yellow-orange transition-all duration-1000 ease-out animate-progress-glow"
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

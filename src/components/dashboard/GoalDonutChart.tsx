import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface GoalDonutChartProps {
  percentage: number;
  goal: number;
  current: number;
}

import { memo } from "react";

export const GoalDonutChart = memo(function GoalDonutChart({ percentage, goal, current }: GoalDonutChartProps) {
  const hasGoal = goal > 0;
  const data = [
    { name: "Atingido", value: hasGoal ? percentage : 0 },
    { name: "Restante", value: hasGoal ? Math.max(0, 100 - percentage) : 100 },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Meta do Mês
      </h3>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <div className="relative h-32 w-32 sm:h-40 sm:w-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={68}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill={hasGoal ? "url(#donutGradient)" : "hsl(220, 16%, 14%)"} />
                <Cell fill="hsl(220, 16%, 14%)" />
              </Pie>
              <defs>
                <linearGradient id="donutGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFD600" />
                  <stop offset="100%" stopColor="#FF8F00" />
                </linearGradient>
              </defs>
            </PieChart>
          </ResponsiveContainer>
          {hasGoal && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{percentage}%</span>
              <span className="text-[10px] text-muted-foreground">atingido</span>
            </div>
          )}
        </div>
        {hasGoal ? (
          <div className="space-y-3 text-center sm:text-left">
            <div>
              <p className="text-xs text-muted-foreground">Meta</p>
              <p className="text-lg font-bold text-foreground">
                R$ {goal.toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atual</p>
              <p className="text-lg font-bold text-secondary">
                R$ {current.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-center sm:text-left max-w-[220px]">
            <p className="text-sm font-semibold text-foreground">Nenhuma meta definida</p>
            <p className="text-xs text-muted-foreground">
              Peça ao admin para cadastrar uma meta em Admin → Metas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

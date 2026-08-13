import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface PerformanceBarChartProps {
  data: { name: string; value: number }[];
}

import { memo } from "react";

export const PerformanceBarChart = memo(function PerformanceBarChart({ data }: PerformanceBarChartProps) {
  return (
    <div className="glass-card p-6 h-full">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Desempenho Semanal
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={24}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 16%, 14%)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 8%)",
                border: "1px solid hsl(0, 0%, 16%)",
                borderRadius: "12px",
                color: "hsl(0, 0%, 100%)",
              }}
            />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFD600" />
                <stop offset="100%" stopColor="#FF8F00" />
              </linearGradient>
            </defs>
            <Bar dataKey="value" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

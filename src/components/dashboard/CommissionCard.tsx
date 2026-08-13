import { DollarSign } from "lucide-react";

interface CommissionCardProps {
  value: number;
}

import { memo } from "react";

export const CommissionCard = memo(function CommissionCard({ value }: CommissionCardProps) {
  return (
    <div className="glass-card glow-orange p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Comissão Atual
          </p>
          <p className="text-3xl font-bold text-secondary">
            {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">Acumulado este mês</p>
        </div>
        <div className="rounded-xl bg-secondary/15 p-2.5">
          <DollarSign className="h-5 w-5 text-secondary" />
        </div>
      </div>
    </div>
  );
});

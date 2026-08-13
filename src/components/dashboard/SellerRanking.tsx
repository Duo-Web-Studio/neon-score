import { Trophy } from "lucide-react";

interface Seller {
  name: string;
  value: number;
  position: number;
}

interface SellerRankingProps {
  sellers: Seller[];
}

const positionColors = [
  "text-yellow-400",
  "text-gray-300",
  "text-amber-600",
];

import { memo } from "react";

export const SellerRanking = memo(function SellerRanking({ sellers }: SellerRankingProps) {
  return (
    <div className="glass-card p-6 h-full">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Ranking de Vendedores
      </h3>
      <div className="space-y-3">
        {sellers.map((seller) => (
          <div
            key={seller.position}
            className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                seller.position <= 3
                  ? "gradient-yellow-orange"
                  : "bg-muted"
              }`}
            >
              {seller.position <= 3 ? (
                <Trophy
                  className={`h-4 w-4 ${positionColors[seller.position - 1] ?? "text-white"}`}
                />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">
                  {seller.position}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{seller.name}</p>
            </div>
            <p className="text-sm font-bold text-secondary">
              R$ {seller.value.toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

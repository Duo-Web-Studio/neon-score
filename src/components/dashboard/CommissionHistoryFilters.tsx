import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface CommissionHistoryFiltersProps {
  availableYears: number[];
  selectedYear: number;
  selectedMonth: number | "all";
  onYearChange: (y: number) => void;
  onMonthChange: (m: number | "all") => void;
  summary?: string;
}

export function CommissionHistoryFilters({
  availableYears,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  summary,
}: CommissionHistoryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3">
      <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedMonth === "all" ? "all" : String(selectedMonth)}
        onValueChange={(v) => onMonthChange(v === "all" ? "all" : Number(v))}
      >
        <SelectTrigger className="h-9 w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={i} value={String(i)}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {summary && (
        <span className="text-xs text-muted-foreground ml-auto">{summary}</span>
      )}
    </div>
  );
}

export const formatBRL = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Compact axis-only formatter for charts (e.g. "2.8k"). Never use for headline values.
export const formatBRLCompactAxis = (v: number) =>
  v >= 1000
    ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
    : `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;

/**
 * Smart parser for pasted/typed BRL strings.
 * Returns the numeric value in reais (e.g. 2850.5).
 *
 * Examples:
 *  "2850"        -> 2850        (pure digits = reais inteiros)
 *  "2.850"       -> 2850        (ponto como milhar)
 *  "2850,00"     -> 2850
 *  "R$ 2.850,50" -> 2850.5
 *  "2850.50"     -> 2850.5      (ponto decimal anglo)
 *  "1.234.567,89"-> 1234567.89
 */
export function parseBRLInput(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;
  if (hasComma) {
    // BR padrão: vírgula é decimal, ponto é milhar
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const lastDot = cleaned.lastIndexOf(".");
    const decimals = cleaned.length - lastDot - 1;
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount === 1 && (decimals === 1 || decimals === 2)) {
      // "2850.5" / "2850.50" — ponto decimal
      normalized = cleaned;
    } else {
      // "2.850" / "1.234.567" — pontos são milhar
      normalized = cleaned.replace(/\./g, "");
    }
  }
  // sem ponto nem vírgula: dígitos puros = reais inteiros
  const n = Number(normalized);
  return isNaN(n) ? 0 : n;
}

/** Formata um número como "1.234,56" (sem prefixo R$). */
export const formatBRLNumber = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

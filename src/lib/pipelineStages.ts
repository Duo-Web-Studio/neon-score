export interface PipelineStage {
  id: string;
  title: string;
  color: string;
}

export const stages: PipelineStage[] = [
  { id: "lead", title: "Lead", color: "hsl(var(--primary))" },
  { id: "contato", title: "Contato", color: "hsl(var(--accent))" },
  { id: "proposta", title: "Proposta", color: "hsl(210, 80%, 55%)" },
  { id: "fechamento", title: "Fechamento", color: "hsl(280, 60%, 55%)" },
];

/** Etapas finais — não aparecem como colunas no board */
export const finalStages = [
  { id: "fechado_ganho", title: "Fechado Ganho", color: "hsl(var(--success))" },
  { id: "fechado_perdido", title: "Fechado Perdido", color: "hsl(var(--destructive))" },
];

export const allStages = [...stages, ...finalStages];

export const stageLabels: Record<string, string> = Object.fromEntries(
  allStages.map((s) => [s.id, s.title]),
);

export const nextStageMap: Record<string, string> = {
  lead: "contato",
  contato: "proposta",
  proposta: "fechamento",
  fechamento: "fechado_ganho",
};

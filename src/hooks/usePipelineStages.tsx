import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";

import {
  stages as fallbackStages,
  finalStages as fallbackFinalStages,
  type PipelineStage,
} from "@/lib/pipelineStages";

export interface DbPipelineStage {
  id: string;
  key: string;
  title: string;
  color: string;
  sort_order: number;
  is_final: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const toPipelineStage = (stage: DbPipelineStage): PipelineStage => ({
  id: stage.key,
  title: stage.title,
  color: stage.color,
});

export function usePipelineStages() {
  const { user } = useAuth();
  const [dbStages, setDbStages] = useState<DbPipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStages = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!options?.silent) setLoading(true);
    try {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("id, key, title, color, sort_order, is_final, is_active, created_by, created_at, updated_at")
        .order("sort_order", { ascending: true });

      setDbStages((data as DbPipelineStage[]) ?? []);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [user]);

  const refreshSilently = useCallback(() => {
    fetchStages({ silent: true });
  }, [fetchStages]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  useRealtimeTables(["pipeline_stages"], refreshSilently, !!user);


  const activeDbStages = useMemo(
    () => dbStages.filter((stage) => stage.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [dbStages],
  );

  const stages = useMemo(() => {
    const openStages = activeDbStages.filter((stage) => !stage.is_final).map(toPipelineStage);
    return openStages.length > 0 ? openStages : fallbackStages;
  }, [activeDbStages]);

  const finalStages = useMemo(() => {
    const finals = activeDbStages.filter((stage) => stage.is_final).map(toPipelineStage);
    return finals.length > 0 ? finals : fallbackFinalStages;
  }, [activeDbStages]);

  const allStages = useMemo(() => [...stages, ...finalStages], [stages, finalStages]);

  const stageLabels = useMemo(
    () => Object.fromEntries(allStages.map((stage) => [stage.id, stage.title])) as Record<string, string>,
    [allStages],
  );

  const nextStageMap = useMemo(() => {
    const map: Record<string, string> = {};
    stages.forEach((stage, index) => {
      const next = stages[index + 1]?.id ?? "fechado_ganho";
      map[stage.id] = next;
    });
    return map;
  }, [stages]);

  const createStage = useCallback(async (title: string, color: string) => {
    if (!user) return { error: "Not authenticated" };
    const cleanTitle = title.trim();
    const slug = cleanTitle
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "etapa";
    const maxOrder = dbStages.filter((stage) => !stage.is_final).reduce((max, stage) => Math.max(max, stage.sort_order), 0);

    const { error } = await supabase.from("pipeline_stages").insert({
      key: `${slug}_${Date.now().toString(36)}`,
      title: cleanTitle,
      color,
      sort_order: maxOrder + 10,
      is_final: false,
      is_active: true,
      created_by: user.id,
    });

    if (!error) await fetchStages({ silent: true });
    return { error: error?.message ?? null };
  }, [dbStages, fetchStages, user]);

  const updateStage = useCallback(async (id: string, updates: Partial<Pick<DbPipelineStage, "title" | "color" | "sort_order" | "is_active">>) => {
    const { error } = await supabase.from("pipeline_stages").update(updates).eq("id", id);
    if (!error) await fetchStages({ silent: true });
    return { error: error?.message ?? null };
  }, [fetchStages]);

  const moveStage = useCallback(async (stage: DbPipelineStage, direction: -1 | 1) => {
    const editable = dbStages.filter((item) => item.is_active && !item.is_final).sort((a, b) => a.sort_order - b.sort_order);
    const index = editable.findIndex((item) => item.id === stage.id);
    const swap = editable[index + direction];
    if (!swap) return { error: null };

    const [first, second] = await Promise.all([
      supabase.from("pipeline_stages").update({ sort_order: swap.sort_order }).eq("id", stage.id),
      supabase.from("pipeline_stages").update({ sort_order: stage.sort_order }).eq("id", swap.id),
    ]);

    const error = first.error?.message ?? second.error?.message ?? null;
    if (!error) await fetchStages({ silent: true });
    return { error };
  }, [dbStages, fetchStages]);

  const reorderStages = useCallback(async (orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((id, index) => [id, (index + 1) * 10]));

    setDbStages((current) =>
      current
        .map((stage) => ({ ...stage, sort_order: orderMap.get(stage.id) ?? stage.sort_order }))
        .sort((a, b) => a.sort_order - b.sort_order),
    );

    const updates = orderedIds.map((id, index) =>
      supabase
        .from("pipeline_stages")
        .update({ sort_order: (index + 1) * 10 })
        .eq("id", id),
    );

    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error?.message ?? null;
    await fetchStages({ silent: true });
    return { error };
  }, [fetchStages]);

  return {
    dbStages,
    stages,
    finalStages,
    allStages,
    stageLabels,
    nextStageMap,
    loading,
    fetchStages,
    createStage,
    updateStage,
    moveStage,
    reorderStages,
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";

export interface DbSection {
  id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

export function useSections() {
  const { user } = useAuth();
  const [sections, setSections] = useState<DbSection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("sections")
        .select("*")
        .order("name", { ascending: true });
      setSections((data as DbSection[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useRealtimeTables(["sections"], fetchSections);


  const createSection = async (section: { name: string; color: string }) => {
    if (!user) return { id: null, error: "Not authenticated" };
    const { data, error } = await supabase
      .from("sections")
      .insert({ ...section, created_by: user.id })
      .select("id")
      .single();
    if (!error) await fetchSections();
    return { id: (data as { id: string } | null)?.id ?? null, error: error?.message ?? null };
  };

  const updateSection = async (id: string, updates: Partial<Pick<DbSection, "name" | "color">>) => {
    const { error } = await supabase.from("sections").update(updates).eq("id", id);
    if (!error) await fetchSections();
    return { error: error?.message ?? null };
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (!error) await fetchSections();
    return { error: error?.message ?? null };
  };

  return { sections, loading, fetchSections, createSection, updateSection, deleteSection };
}

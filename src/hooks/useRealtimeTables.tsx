import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Assina mudanças (INSERT/UPDATE/DELETE) em uma ou mais tabelas e dispara
 * o callback informado. O callback é lido via ref, então mudanças de
 * identidade dele não recriam as subscriptions.
 *
 * Os canais são sempre removidos no cleanup, evitando listeners órfãos.
 */
export function useRealtimeTables(
  tables: readonly string[],
  onChange: () => void,
  enabled: boolean = true,
) {
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  const tableKey = tables.join(",");

  useEffect(() => {
    if (!enabled || !tableKey) return;

    const suffix = Math.random().toString(36).slice(2);
    const channels = tableKey.split(",").map((table) =>
      supabase
        .channel(`${table}-realtime-${suffix}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => handlerRef.current(),
        )
        .subscribe(),
    );

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [tableKey, enabled]);
}

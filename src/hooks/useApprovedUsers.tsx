import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ApprovedUser {
  id: string;
  full_name: string;
}

export function useApprovedUsers() {
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("status", "approved")
        .order("full_name", { ascending: true });
      if (!cancelled) {
        if (!error && data) setUsers(data as ApprovedUser[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading };
}

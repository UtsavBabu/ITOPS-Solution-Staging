import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../api/supabaseClient";
import { useAuth } from "../context/AuthContext";

/**
 * Subscribes to Postgres changes (over Supabase Realtime/WebSockets) for the
 * given tables, scoped to the current organization, and invalidates the
 * given react-query keys whenever a row changes — so the dashboard and
 * monitor list update live instead of waiting for the next poll.
 */
export function useRealtimeInvalidate(tables: string[], queryKeys: string[][]) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organization) return;

    const channel = supabase.channel(`org-${organization.id}-changes`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `organization_id=eq.${organization.id}` },
        () => {
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization, queryClient, tables, queryKeys]);
}

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../api/supabaseClient";
import { useAuth } from "../context/AuthContext";

/**
 * Subscribes to Postgres changes (over Supabase Realtime/WebSockets) for the
 * given tables, scoped to the current organization, and invalidates the
 * given react-query keys whenever a row changes.
 *
 * tables/queryKeys are passed as module-level constants so their references
 * are stable — the effect only re-runs when the organization changes.
 */
export function useRealtimeInvalidate(tables, queryKeys) {
  const {
    organization
  } = useAuth();
  const queryClient = useQueryClient();
  // Keep latest values accessible inside the effect without re-subscribing.
  const tablesRef = useRef(tables);
  const keysRef = useRef(queryKeys);
  tablesRef.current = tables;
  keysRef.current = queryKeys;
  useEffect(() => {
    if (!organization) return;
    const channel = supabase.channel(`org-${organization.id}-rt-${Date.now()}`);
    for (const table of tablesRef.current) {
      channel.on("postgres_changes", {
        event: "*",
        schema: "public",
        table,
        filter: `organization_id=eq.${organization.id}`
      }, () => {
        for (const key of keysRef.current) {
          queryClient.invalidateQueries({
            queryKey: key
          });
        }
      });
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, queryClient]);
}
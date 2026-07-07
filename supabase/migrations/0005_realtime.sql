-- Powers live dashboard/monitor updates over Supabase Realtime (WebSockets)
-- instead of relying solely on client polling. RLS is enforced by Realtime
-- for authenticated clients, and the frontend additionally filters by
-- organization_id per subscription as defense in depth.
alter publication supabase_realtime add table monitors;
alter publication supabase_realtime add table incidents;

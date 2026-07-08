-- Enable realtime for check_results so the monitor detail page
-- receives live updates when new check results are written by the scheduler.
alter publication supabase_realtime add table check_results;

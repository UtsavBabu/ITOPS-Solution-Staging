-- DNS checks already perform real resolution over DNS-over-HTTPS and receive
-- the actual answer records (resolved value + TTL), but the check function
-- discarded them right after computing pass/fail. This column lets a DNS
-- check result carry that real data through to the UI, so DNS monitoring can
-- show what actually resolved (like a lookup tool), not just up/down.
alter table check_results
  add column if not exists dns_answers jsonb;

comment on column check_results.dns_answers is
  'For DNS checks only: the matching answer records from the resolver, as [{"data": "<resolved value>", "ttl": <seconds>}]. Null for non-DNS checks or when no records were found.';

-- Footer newsletter signups reuse the waitlist capture table; allow the new
-- product value so the insert passes the check constraint.
alter table waitlist_signups drop constraint if exists waitlist_signups_product_check;
alter table waitlist_signups add constraint waitlist_signups_product_check
  check (product in ('cybersachet', 'infrastructure-monitor', 'devops-monitor', 'upgrade-request', 'newsletter'));

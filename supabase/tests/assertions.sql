-- Real assertions against the real functions (no mocking) — each one
-- raises a clear exception on failure, so `run.sh` reports a nonzero exit
-- and the specific broken invariant, not a silent pass.

create schema if not exists test;

create or replace function test.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then
    raise exception 'FAILED: %', msg;
  else
    raise notice 'ok - %', msg;
  end if;
end;
$$;

do $$
declare
  v_org uuid; v_admin uuid; v_trainmgr uuid; v_bob uuid; v_sec_course uuid; v_aca_course uuid;
begin
  select value into v_org from test_ids where key = 'org';
  select value into v_admin from test_ids where key = 'admin';
  select value into v_trainmgr from test_ids where key = 'trainmgr';
  select value into v_bob from test_ids where key = 'bob';
  select value into v_sec_course from test_ids where key = 'sec_course';
  select value into v_aca_course from test_ids where key = 'aca_course';

  -- 1. Product licensing separation: org has 'cybersachet' only.
  perform set_config('test.current_user_id', v_bob::text, false);
  perform test.assert(_cybersachet_course_allowed(v_sec_course), 'security course allowed when only cybersachet is licensed');
  perform test.assert(not _cybersachet_course_allowed(v_aca_course), 'academy course BLOCKED when academy is not licensed');

  begin
    perform enroll_in_course(v_aca_course);
    perform test.assert(false, 'enroll_in_course on an unlicensed-product course should have raised');
  exception when others then
    perform test.assert(sqlerrm ilike '%Academy%', format('enroll_in_course error names the right product, got: %s', sqlerrm));
  end;

  -- 2. Granting the academy product actually unlocks it, and only it.
  insert into organization_products (organization_id, product_key, status) values (v_org, 'academy', 'active');
  perform test.assert(_cybersachet_course_allowed(v_aca_course), 'academy course allowed once academy product is granted');
  perform enroll_in_course(v_aca_course); -- bob enrolls, should not raise

  -- 3. Training Manager: real least-privilege grant.
  perform set_config('test.current_user_id', v_trainmgr::text, false);
  perform test.assert(has_org_permission(v_org, 'training', 'manage'), 'training_manager can manage training');
  perform test.assert(not has_org_permission(v_org, 'team', 'manage'), 'training_manager CANNOT manage team roster/billing');
  perform assign_cybersachet_course(v_bob, v_sec_course, null); -- should succeed, no team:manage needed

  begin
    perform remove_organization_member(v_bob);
    perform test.assert(false, 'training_manager removing a member should have been denied');
  exception when others then
    perform test.assert(sqlerrm ilike '%training management%' or sqlerrm ilike '%not authorized%', format('denied for the right reason, got: %s', sqlerrm));
  end;

  -- 4. Organization Administrator: real team:manage grant, self-removal guard.
  perform set_config('test.current_user_id', v_admin::text, false);
  perform test.assert(has_org_permission(v_org, 'team', 'manage'), 'organization_administrator can manage team');
  perform remove_organization_member(v_bob); -- should succeed (2 members remain: admin, trainmgr)
  perform test.assert(not exists (select 1 from memberships where user_id = v_bob and organization_id = v_org), 'bob was actually removed');

  begin
    perform remove_organization_member(v_admin);
    perform test.assert(false, 'self-removal should have been denied');
  exception when others then
    perform test.assert(sqlerrm ilike '%cannot remove yourself%', format('self-removal denied for the right reason, got: %s', sqlerrm));
  end;

  -- 5. Certificate issuance round trip (the bug fixed alongside the
  -- product split) — both first-issue and re-issue paths must complete
  -- without error, for a real enrollment belonging to the CURRENT user.
  perform enroll_in_course(v_aca_course); -- admin enrolls (already has academy access)
  update cybersachet_enrollments set completed_at = now(), quiz_score = 95 where user_id = v_admin and course_id = v_aca_course;
  perform issue_course_certificate(v_aca_course);
  perform issue_course_certificate(v_aca_course); -- re-issue path
  perform test.assert(
    (select count(*) from cybersachet_certificates where user_id = v_admin and course_id = v_aca_course) = 1,
    'certificate re-issue updates the existing row, does not duplicate it'
  );

  raise notice '=== ALL ASSERTIONS PASSED ===';
end $$;

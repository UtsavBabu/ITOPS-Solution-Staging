-- Real test fixture data: one organization, three members with distinct
-- real roles, one course per track, and a department/team — just enough
-- to exercise every assertion in assertions.sql.

do $$
declare
  v_org uuid;
  v_admin uuid := '11111111-1111-1111-1111-111111111111';
  v_trainmgr uuid := '22222222-2222-2222-2222-222222222222';
  v_bob uuid := '33333333-3333-3333-3333-333333333333';
  v_dept uuid;
  v_sec_course uuid;
  v_aca_course uuid;
begin
  insert into organizations (id, name) values (gen_random_uuid(), 'RBAC Test Org') returning id into v_org;
  insert into auth.users (id, email) values
    (v_admin, 'admin@test.com'),
    (v_trainmgr, 'trainmgr@test.com'),
    (v_bob, 'bob@test.com');

  insert into memberships (user_id, organization_id, role) values
    (v_admin, v_org, 'organization_administrator'),
    (v_trainmgr, v_org, 'training_manager'),
    (v_bob, v_org, 'MEMBER');

  insert into departments (id, organization_id, name) values (gen_random_uuid(), v_org, 'Engineering') returning id into v_dept;
  update memberships set department_id = v_dept where user_id = v_bob;

  -- Only 'cybersachet' licensed, deliberately NOT 'academy' — the core
  -- thing this whole suite exists to verify stays properly separated.
  insert into organization_products (organization_id, product_key, status) values (v_org, 'cybersachet', 'active');

  insert into cybersachet_courses (slug, title, level, estimated_minutes, published, sort_order, category, min_plan, free_tier, track) values
    ('test-phishing', 'Test Phishing Course', 'beginner', 15, true, 1, 'email-security', 'STARTER', true, 'security') returning id into v_sec_course;
  -- min_plan deliberately STARTER (same as the org's default plan) so
  -- assertions 1-2 isolate the product-licensing variable alone; plan-tier
  -- gating itself is already covered by planTiers.test.js.
  insert into cybersachet_courses (slug, title, level, estimated_minutes, published, sort_order, category, min_plan, free_tier, track) values
    ('test-linux', 'Test Linux Course', 'beginner', 20, true, 100, 'infrastructure', 'STARTER', false, 'academy') returning id into v_aca_course;

  -- Persist ids for assertions.sql via a settings table (simpler than
  -- re-querying by slug/email in every assertion).
  create table test_ids (key text primary key, value uuid);
  insert into test_ids values
    ('org', v_org), ('admin', v_admin), ('trainmgr', v_trainmgr), ('bob', v_bob),
    ('dept', v_dept), ('sec_course', v_sec_course), ('aca_course', v_aca_course);
end $$;

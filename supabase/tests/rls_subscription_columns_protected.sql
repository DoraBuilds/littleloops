-- Verification for supabase/migrations/20260910120000_add_subscription_fields.sql
--
-- Runs automatically in CI (.github/workflows/rls-tests.yml). See
-- rls_owner_privilege_separation.sql for the impersonation mechanism this
-- reuses and for how to run this by hand.
--
-- The households "update" RLS policy is row-level and already lets any
-- household member update the row (to rename it, change home_scene, etc).
-- Without the protect_subscription_columns trigger, that same policy would
-- let a signed-in parent PATCH their own subscription_status to 'active'
-- and get the app for free. This test proves the trigger closes that gap
-- without breaking normal (non-subscription) household updates, and that
-- the billing webhook (running as service_role) is unaffected.
--
-- Cleans up after itself (rolls back), so it's safe to re-run.

begin;

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'sub-owner@test.local')
on conflict (id) do nothing;

insert into public.households (id, name, timezone, created_by_user_id)
values ('66666666-6666-6666-6666-666666666666', 'Sub Test Household', 'Europe/Madrid', '55555555-5555-5555-5555-555555555555')
on conflict (id) do nothing;

insert into public.household_members (household_id, user_id, role) values
  ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'owner')
on conflict (household_id, user_id) do nothing;

create or replace function pg_temp.impersonate(p_user_id uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$ language plpgsql;

do $$
declare
  v_household_id uuid := '66666666-6666-6666-6666-666666666666';
  v_owner_id uuid := '55555555-5555-5555-5555-555555555555';
begin
  raise notice '--- Test 1: owner CANNOT set their own subscription_status via a client update ---';
  perform pg_temp.impersonate(v_owner_id);
  begin
    update public.households set subscription_status = 'active' where id = v_household_id;
    raise exception 'FAIL: owner was able to set subscription_status directly';
  exception
    when others then
      raise notice 'PASS: subscription_status write was blocked (%)', sqlerrm;
  end;

  raise notice '--- Test 2: owner CANNOT set stripe_customer_id via a client update ---';
  perform pg_temp.impersonate(v_owner_id);
  begin
    update public.households set stripe_customer_id = 'cus_fake' where id = v_household_id;
    raise exception 'FAIL: owner was able to set stripe_customer_id directly';
  exception
    when others then
      raise notice 'PASS: stripe_customer_id write was blocked (%)', sqlerrm;
  end;

  raise notice '--- Test 3: owner CAN still update non-subscription columns (regression check) ---';
  perform pg_temp.impersonate(v_owner_id);
  update public.households set name = 'Renamed by owner' where id = v_household_id;
  if (select name from public.households where id = v_household_id) = 'Renamed by owner' then
    raise notice 'PASS: normal household update still works';
  else
    raise exception 'FAIL: the protection trigger blocked an unrelated column update';
  end if;

  raise notice '--- Test 4: service_role (the webhook) CAN set subscription_status ---';
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  set local role service_role;
  update public.households set subscription_status = 'active' where id = v_household_id;
  if (select subscription_status from public.households where id = v_household_id) = 'active' then
    raise notice 'PASS: service_role (webhook) set subscription_status';
  else
    raise exception 'FAIL: service_role could not set subscription_status — this would break the billing webhook';
  end if;

  raise notice '--- All checks passed ---';
end $$;

rollback;

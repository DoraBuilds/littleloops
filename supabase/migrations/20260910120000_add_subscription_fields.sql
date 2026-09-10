alter table public.households
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column subscription_status text not null default 'none',
  add column current_period_end timestamptz;

alter table public.households
  add constraint households_subscription_status_check
  check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'));

create index if not exists households_stripe_customer_id_idx
  on public.households (stripe_customer_id);

-- The existing "household members can update households" policy lets any
-- parent in the household update the row, which would let a client set
-- their own subscription_status via a normal PATCH request. RLS is
-- row-level, not column-level, so this trigger is the enforcement point:
-- only the billing webhook (running as service_role, which bypasses RLS
-- entirely but still fires triggers) may change these four columns.
create or replace function public.protect_subscription_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    if new.subscription_status is distinct from old.subscription_status
       or new.stripe_customer_id is distinct from old.stripe_customer_id
       or new.stripe_subscription_id is distinct from old.stripe_subscription_id
       or new.current_period_end is distinct from old.current_period_end then
      raise exception 'subscription fields can only be changed by the billing webhook';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists households_protect_subscription_columns on public.households;
create trigger households_protect_subscription_columns
before update on public.households
for each row execute procedure public.protect_subscription_columns();

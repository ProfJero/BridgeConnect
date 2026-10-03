-- =============================================================================
-- Bootstrap: make an existing account the first Platform Owner.
-- -----------------------------------------------------------------------------
-- Run ONCE per environment from the Supabase SQL editor (which runs as the
-- database owner). Afterwards, owners grant all other roles from the admin
-- console, where every grant is permission-checked and audited.
--
-- 1. The person signs up normally in the app and confirms their email.
-- 2. Replace the email below and run this script.
-- =============================================================================
do $$
declare
  target_email text := 'replace-me@example.com';
  target uuid;
begin
  select id into target from auth.users where lower(email) = lower(target_email);
  if target is null then
    raise exception 'No account with email %', target_email;
  end if;

  insert into public.user_role_assignments (user_id, role_id)
  select target, r.id from public.roles r where r.key = 'platform_owner'
  on conflict do nothing;

  insert into public.audit_logs (action, target_table, target_id, metadata)
  values ('roles.bootstrap_owner', 'profiles', target::text,
          jsonb_build_object('email', target_email, 'via', 'grant_platform_owner.sql'));
  raise notice 'Granted platform_owner to %', target_email;
end;
$$;

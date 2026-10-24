-- =============================================================================
-- BridgeConnect · 0003c · Platform settings
-- Typed key/value configuration managed by administrators with
-- `settings.manage`. Public settings are readable by everyone; the rest only by
-- administrators. Values are validated per key by a CHECK on the JSON type.
-- =============================================================================

create table public.platform_settings (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)*$'),
  value jsonb not null,
  description text not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger platform_settings_set_updated_at before update on public.platform_settings
  for each row execute function private.set_updated_at();
create trigger audit_platform_settings after insert or update or delete on public.platform_settings
  for each row execute function private.audit_row_change();

create or replace function private.setting(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select value from public.platform_settings where key = p_key;
$$;
grant execute on function private.setting(text) to anon, authenticated;

-- Keep the stored JSON type stable for a key (prevents breaking consumers).
create or replace function private.validate_setting_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and jsonb_typeof(new.value) <> jsonb_typeof(old.value) then
    raise exception 'Setting % must remain of type %', new.key, jsonb_typeof(old.value)
      using errcode = '22023';
  end if;
  new.updated_by := (select auth.uid());
  return new;
end;
$$;
create trigger platform_settings_validate before update on public.platform_settings
  for each row execute function private.validate_setting_type();

alter table public.platform_settings enable row level security;
grant select on public.platform_settings to anon, authenticated;
grant update (value) on public.platform_settings to authenticated;

create policy "Public settings are readable"
  on public.platform_settings for select to anon, authenticated
  using (is_public);
create policy "Settings managers read all settings"
  on public.platform_settings for select to authenticated
  using (private.has_permission('settings.manage'));
create policy "Settings managers update settings"
  on public.platform_settings for update to authenticated
  using (private.has_permission('settings.manage'))
  with check (private.has_permission('settings.manage'));

insert into public.platform_settings (key, value, description, is_public) values
  ('community.posts_require_approval', 'false',
   'When true, resident community posts are held for moderator approval before publishing.', true),
  ('community.max_posts_per_hour', '10',
   'Maximum community posts a single account may create per hour.', false),
  ('community.max_comments_per_hour', '40',
   'Maximum comments a single account may create per hour.', false),
  ('reports.auto_hide_threshold', '5',
   'Open reports from distinct users after which a post is automatically hidden pending review.', false),
  ('marketplace.currency', '"GHS"', 'Currency used for marketplace prices.', true),
  ('platform.support_email', '"support@digitalbridge.example"',
   'Public support contact shown in the app.', true);

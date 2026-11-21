-- =============================================================================
-- BridgeConnect · 0017 · Public engagement flags for an entity
-- -----------------------------------------------------------------------------
-- Anonymous visitors need to know whether a listing accepts messages, bookings
-- and reviews (to show "sign in to message/book/review"). entity_capabilities()
-- stays signed-in only; this exposes just three booleans for ACTIVE entities.
-- SECURITY INVOKER: it relies on helpers already executable by anon.
-- =============================================================================
create or replace function public.entity_public_features(p_entity uuid)
returns table (messages boolean, bookings boolean, reviews boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    private.entity_has_capability(p_entity, 'messages'),
    private.entity_has_capability(p_entity, 'bookings'),
    private.entity_has_capability(p_entity, 'reviews')
  where private.entity_is_public(p_entity);
$$;
revoke all on function public.entity_public_features(uuid) from public;
grant execute on function public.entity_public_features(uuid) to anon, authenticated;

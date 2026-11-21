-- =============================================================================
-- BridgeConnect · 0015 · New enum values for the engagement release
-- -----------------------------------------------------------------------------
-- Kept in their own migration: a value added with ALTER TYPE … ADD VALUE cannot
-- be used in the same transaction that adds it.
-- =============================================================================

-- Workspace modules: resident ↔ entity inbox, service bookings, reviews.
alter type public.entity_capability add value if not exists 'messages';
alter type public.entity_capability add value if not exists 'bookings';
alter type public.entity_capability add value if not exists 'reviews';

-- Community post kinds: polls and mutual aid.
alter type public.post_kind add value if not exists 'poll';
alter type public.post_kind add value if not exists 'help_request';
alter type public.post_kind add value if not exists 'help_offer';

-- Reviews can be moderated like other content.
alter type public.moderation_target add value if not exists 'review';

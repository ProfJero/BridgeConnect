-- =============================================================================
-- BridgeConnect · 0018 · Enum values for rentals moderation
-- (Own migration: a new enum value can't be used in the transaction that adds it.)
-- =============================================================================
alter type public.moderation_target add value if not exists 'rental';

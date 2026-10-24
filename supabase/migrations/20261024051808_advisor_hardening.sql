-- Address Supabase advisor findings (security 0028, performance 0001).

-- my_access / my_workspaces / entity_capabilities are only meaningful for a signed-in user. Supabase's default
-- privileges grant EXECUTE to anon on new public functions, so revoke it explicitly. record_ad_click stays
-- callable by anon on purpose (public ad click-through counting).
revoke execute on function public.my_access() from public, anon;
revoke execute on function public.my_workspaces() from public, anon;
revoke execute on function public.entity_capabilities(uuid) from public, anon;

-- Covering indexes for foreign keys (faster joins, and cascades/`on delete set null` no longer scan the table).
create index if not exists advertisements_created_by_fk_idx on public.advertisements (created_by);
create index if not exists advertisements_reviewed_by_fk_idx on public.advertisements (reviewed_by);
create index if not exists advertisements_target_community_id_fk_idx on public.advertisements (target_community_id);
create index if not exists advertisements_target_district_id_fk_idx on public.advertisements (target_district_id);
create index if not exists advertisements_target_region_id_fk_idx on public.advertisements (target_region_id);
create index if not exists application_documents_uploaded_by_fk_idx on public.application_documents (uploaded_by);
create index if not exists application_events_actor_id_fk_idx on public.application_events (actor_id);
create index if not exists audit_logs_community_id_fk_idx on public.audit_logs (community_id);
create index if not exists audit_logs_district_id_fk_idx on public.audit_logs (district_id);
create index if not exists audit_logs_region_id_fk_idx on public.audit_logs (region_id);
create index if not exists emergency_alerts_issued_by_fk_idx on public.emergency_alerts (issued_by);
create index if not exists emergency_alerts_issuing_entity_id_fk_idx on public.emergency_alerts (issuing_entity_id);
create index if not exists emergency_contacts_region_id_fk_idx on public.emergency_contacts (region_id);
create index if not exists entities_verified_by_fk_idx on public.entities (verified_by);
create index if not exists entity_applications_entity_id_fk_idx on public.entity_applications (entity_id);
create index if not exists entity_applications_reviewer_id_fk_idx on public.entity_applications (reviewer_id);
create index if not exists entity_capability_overrides_set_by_fk_idx on public.entity_capability_overrides (set_by);
create index if not exists entity_memberships_invited_by_fk_idx on public.entity_memberships (invited_by);
create index if not exists events_category_id_fk_idx on public.events (category_id);
create index if not exists events_created_by_fk_idx on public.events (created_by);
create index if not exists favourites_entity_id_fk_idx on public.favourites (entity_id);
create index if not exists favourites_event_id_fk_idx on public.favourites (event_id);
create index if not exists favourites_job_id_fk_idx on public.favourites (job_id);
create index if not exists favourites_product_id_fk_idx on public.favourites (product_id);
create index if not exists favourites_service_id_fk_idx on public.favourites (service_id);
create index if not exists jobs_category_id_fk_idx on public.jobs (category_id);
create index if not exists jobs_created_by_fk_idx on public.jobs (created_by);
create index if not exists moderation_actions_community_id_fk_idx on public.moderation_actions (community_id);
create index if not exists moderation_actions_moderator_id_fk_idx on public.moderation_actions (moderator_id);
create index if not exists moderation_actions_report_id_fk_idx on public.moderation_actions (report_id);
create index if not exists order_status_history_actor_id_fk_idx on public.order_status_history (actor_id);
create index if not exists platform_settings_updated_by_fk_idx on public.platform_settings (updated_by);
create index if not exists products_created_by_fk_idx on public.products (created_by);
create index if not exists reports_comment_id_fk_idx on public.reports (comment_id);
create index if not exists reports_entity_id_fk_idx on public.reports (entity_id);
create index if not exists reports_event_id_fk_idx on public.reports (event_id);
create index if not exists reports_handled_by_fk_idx on public.reports (handled_by);
create index if not exists reports_job_id_fk_idx on public.reports (job_id);
create index if not exists reports_product_id_fk_idx on public.reports (product_id);
create index if not exists reports_profile_id_fk_idx on public.reports (profile_id);
create index if not exists reports_service_id_fk_idx on public.reports (service_id);
create index if not exists services_created_by_fk_idx on public.services (created_by);
create index if not exists user_role_assignments_community_id_fk_idx on public.user_role_assignments (community_id);
create index if not exists user_role_assignments_district_id_fk_idx on public.user_role_assignments (district_id);
create index if not exists user_role_assignments_granted_by_fk_idx on public.user_role_assignments (granted_by);
create index if not exists user_role_assignments_region_id_fk_idx on public.user_role_assignments (region_id);

import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const JOB_CARD_FIELDS =
  "id, title, slug, employment_type, salary_min, salary_max, salary_period, currency, application_deadline, published_at, status, community_id, communities(name), entities!inner(name, slug, logo_path)" as const;

export async function listJobs(filters: {
  q?: string;
  communityId?: string;
  categoryId?: string;
  employmentType?: Database["public"]["Enums"]["employment_type"];
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 12;
  const page = filters.page ?? 1;
  let query = supabase.from("jobs").select(JOB_CARD_FIELDS, { count: "exact" }).eq("status", "open");
  if (filters.communityId) query = query.eq("community_id", filters.communityId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.employmentType) query = query.eq("employment_type", filters.employmentType);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "simple" });
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export type JobCardData = Awaited<ReturnType<typeof listJobs>>["items"][number];

export async function getJobBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, listing_categories(name), communities(name), entities!inner(id, name, slug, logo_path, entity_type)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyApplicationForJob(jobId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_applications")
    .select("id, status, created_at")
    .eq("job_id", jobId)
    .eq("applicant_id", userId)
    .maybeSingle();
  return data;
}

export async function listMyJobApplications() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select("id, status, created_at, jobs(title, slug, entities(name))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

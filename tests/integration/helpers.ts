import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
/** Local development seed password (supabase/seed.sql). Never valid in production. */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "BridgeDemo#2026";

export const USERS = {
  owner: "owner@demo.bridgeconnect.test",
  districtAdmin: "district.admin@demo.bridgeconnect.test",
  moderator: "moderator@demo.bridgeconnect.test",
  verifier: "verifier@demo.bridgeconnect.test",
  business: "business@demo.bridgeconnect.test",
  ngo: "ngo@demo.bridgeconnect.test",
  resident: "resident@demo.bridgeconnect.test",
  capeCoast: "capecoast@demo.bridgeconnect.test",
} as const;

export const IDS = {
  freshFarms: "e0000000-0000-4000-8000-000000000001",
  youthFoundation: "e0000000-0000-4000-8000-000000000002",
  resident: "a0000000-0000-4000-8000-000000000007",
  capeCoast: "a0000000-0000-4000-8000-000000000008",
  kwamankese: "30000000-0000-4000-8000-000000000001",
};

export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
}

export async function signedIn(email: string): Promise<SupabaseClient<Database>> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}. Is the local stack seeded (npm run db:reset)?`);
  return client;
}

export const pdf = () => new Blob([`%PDF-1.4\n% test ${Date.now()}\n`], { type: "application/pdf" });
export const png = () =>
  new Blob([Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))], { type: "image/png" });

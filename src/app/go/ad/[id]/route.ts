import { NextResponse, type NextRequest } from "next/server";

import { isUuid } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/** Records an ad click, then redirects to the ad's in-app destination only. */
export async function GET(request: NextRequest, ctx: RouteContext<"/go/ad/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.redirect(new URL("/", request.url));
  const supabase = await createClient();
  const { data: ad } = await supabase.from("advertisements").select("link_path").eq("id", id).maybeSingle();
  if (ad) await supabase.rpc("record_ad_click", { p_ad: id });
  return NextResponse.redirect(new URL(safeRedirectPath(ad?.link_path, "/"), request.url));
}

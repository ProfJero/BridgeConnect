import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Download a copy of the signed-in user's data (right of access). Every query
 * runs as the user, so RLS guarantees only their own rows are included.
 */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const supabase = await createClient();
  const uid = viewer.id;
  const [profile, posts, comments, reviews, favourites, follows, orders, bookings, applications, conversations, tickets, notifications] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name, username, bio, home_community_id, account_status, created_at").eq("id", uid).maybeSingle(),
      supabase.from("posts").select("id, kind, title, body, status, created_at").eq("author_id", uid),
      supabase.from("post_comments").select("id, post_id, body, status, created_at").eq("author_id", uid),
      supabase.from("entity_reviews").select("id, entity_id, rating, title, body, status, created_at").eq("author_id", uid),
      supabase.from("favourites").select("*").eq("user_id", uid),
      supabase.from("entity_follows").select("entity_id, created_at").eq("user_id", uid),
      supabase.from("orders").select("id, order_number, status, subtotal, currency, created_at, order_items(*)").eq("buyer_id", uid),
      supabase.from("service_bookings").select("id, booking_number, service_id, requested_date, requested_time, status, created_at").eq("customer_id", uid),
      supabase.from("job_applications").select("id, job_id, status, created_at").eq("applicant_id", uid),
      supabase.from("conversations").select("id, entity_id, subject, created_at, conversation_messages(sender_side, body, created_at)").eq("user_id", uid),
      supabase.from("support_tickets").select("id, ticket_number, subject, status, created_at, support_ticket_messages(is_staff, body, created_at)").eq("requester_id", uid),
      supabase.from("notifications").select("type, title, body, created_at, read_at").eq("recipient_id", uid).limit(1000),
    ]);

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: viewer.email },
    profile: profile.data,
    posts: posts.data ?? [],
    comments: comments.data ?? [],
    reviews: reviews.data ?? [],
    favourites: favourites.data ?? [],
    following: follows.data ?? [],
    orders: orders.data ?? [],
    bookings: bookings.data ?? [],
    job_applications: applications.data ?? [],
    conversations: conversations.data ?? [],
    support_tickets: tickets.data ?? [],
    notifications: notifications.data ?? [],
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bridgeconnect-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const rsvpSchema = z.object({
  eventId: z.uuid(),
  status: z.enum(["going", "interested"]).nullable(),
  slug: z.string().max(120),
});

export async function setRsvpAction(input: unknown): Promise<ActionResult> {
  const parsed = rsvpSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid request.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { eventId, status } = parsed.data;
  const { error } = status
    ? await supabase.from("event_rsvps").upsert({ event_id: eventId, status }, { onConflict: "event_id,user_id" })
    : await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", auth.viewer.id);
  if (error) return dbFailure(error, "events.rsvp");
  revalidatePath(`/events/${parsed.data.slug}`);
  return success(status === "going" ? "You're going!" : status ? "Marked as interested." : "RSVP removed.");
}

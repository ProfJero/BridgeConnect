"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";

import { FAVOURITE_COLUMN, favouriteTargetSchema, type FavouriteTarget } from "./types";

export async function toggleFavouriteAction(target: FavouriteTarget, favourite: boolean): Promise<ActionResult> {
  const parsed = favouriteTargetSchema.safeParse(target);
  if (!parsed.success || !z.boolean().safeParse(favourite).success) return failure("Invalid item.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;

  const column = FAVOURITE_COLUMN[parsed.data.kind];
  const supabase = await createClient();
  if (favourite) {
    const row: TablesInsert<"favourites"> = {};
    row[column] = parsed.data.id;
    const { error } = await supabase.from("favourites").insert(row);
    if (error && error.code !== "23505") return dbFailure(error, "favourites.add");
  } else {
    const { error } = await supabase.from("favourites").delete().eq(column, parsed.data.id).eq("user_id", auth.viewer.id);
    if (error) return dbFailure(error, "favourites.remove");
  }
  revalidatePath("/favourites");
  return success(favourite ? "Saved to favourites." : "Removed from favourites.");
}

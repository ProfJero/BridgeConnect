type MediaJoin = { position: number; media_assets: { storage_path: string; alt_text: string | null } | null }[] | null;

/** Ordered media for a listing (product_media / post_media joins). */
export function orderedMedia(media: MediaJoin) {
  return (media ?? [])
    .filter((m) => m.media_assets)
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ path: m.media_assets!.storage_path, alt: m.media_assets!.alt_text ?? "" }));
}

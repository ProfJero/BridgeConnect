"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";
import { controlProps, Field, FormError } from "@/components/forms/field";
import { StatusBadge } from "@/components/shared/status-badge";
import { ImageUpload, type UploadedImage } from "@/components/widgets/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useActionForm } from "@/hooks/use-action-form";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate, humanize } from "@/lib/format";

import { saveAdAction, setAdStatusAction } from "../actions";
import { adSchema } from "../schemas";

type Ad = { id: string; title: string; status: string; placement: string; starts_on: string; ends_on: string; clicks: number; review_note: string | null };

export function AdList({ entityId, ads }: { entityId: string; ads: Ad[] }) {
  const { pending, run } = useServerAction();
  if (ads.length === 0) return <p className="text-sm text-muted-foreground">No advertisements yet.</p>;
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {ads.map((ad) => (
        <li key={ad.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <span>
            <span className="block font-semibold">{ad.title}</span>
            <span className="block text-sm text-muted-foreground">{humanize(ad.placement)} · {formatDate(ad.starts_on)} – {formatDate(ad.ends_on)} · {ad.clicks} clicks</span>
            {ad.review_note ? <span className="block text-sm text-muted-foreground">Reviewer: {ad.review_note}</span> : null}
          </span>
          <span className="flex items-center gap-2">
            <StatusBadge status={ad.status} />
            {ad.status === "approved" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setAdStatusAction({ entityId, adId: ad.id, status: "paused" }))}>Pause</Button> : null}
            {ad.status === "paused" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setAdStatusAction({ entityId, adId: ad.id, status: "approved" }))}>Resume</Button> : null}
            {ad.status !== "archived" ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setAdStatusAction({ entityId, adId: ad.id, status: "archived" }))}>Archive</Button> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AdForm({ entityId, communities, defaultLink }: { entityId: string; communities: CommunityChoice[]; defaultLink: string }) {
  const router = useRouter();
  const [image, setImage] = useState<UploadedImage[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(adSchema, saveAdAction, {
    defaultValues: { entityId, title: "", body: "", linkPath: defaultLink, placement: "home_feed", targetCommunityId: "", startsOn: today, endsOn: today, submit: true },
    onSuccess: () => {
      form.reset();
      setImage([]);
      router.refresh();
    },
  });
  const reg = (name: Parameters<typeof form.register>[0], hint = false) => ({ ...controlProps(name, errorFor(name), hint), ...form.register(name) });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="title" label="Headline" required error={errorFor("title")}><Input maxLength={80} {...reg("title")} /></Field>
      <Field id="body" label="Short message" error={errorFor("body")}><Input maxLength={200} {...reg("body")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="placement" label="Placement" required error={errorFor("placement")}>
          <NativeSelect {...reg("placement")}><option value="home_feed">Home feed</option><option value="explore">Explore</option><option value="marketplace">Marketplace</option></NativeSelect>
        </Field>
        <Field id="targetCommunityId" label="Target community" hint="Leave blank to show everywhere." error={errorFor("targetCommunityId")}>
          <CommunitySelect options={communities} placeholder="All communities" {...reg("targetCommunityId", true)} />
        </Field>
        <Field id="startsOn" label="Start date" required error={errorFor("startsOn")}><Input type="date" {...reg("startsOn")} /></Field>
        <Field id="endsOn" label="End date" required hint="Up to 180 days." error={errorFor("endsOn")}><Input type="date" {...reg("endsOn", true)} /></Field>
      </div>
      <Field id="linkPath" label="Link to" hint="A page on BridgeConnect, such as your profile." error={errorFor("linkPath")}><Input {...reg("linkPath", true)} /></Field>
      <ImageUpload ownerFolder={`entities/${entityId}`} entityId={entityId} max={1} value={image} label="Add image" onChange={(i) => { setImage(i); form.setValue("imagePath", i[0]?.path ?? null); }} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} onClick={() => form.setValue("submit", true)}>Submit for review</Button>
        <Button type="submit" variant="outline" disabled={pending} onClick={() => form.setValue("submit", false)}>Save draft</Button>
      </div>
    </form>
  );
}

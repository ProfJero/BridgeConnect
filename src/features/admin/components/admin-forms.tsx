"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { useServerAction } from "@/hooks/use-server-action";
import { humanize } from "@/lib/format";

import {
  broadcastAction,
  closeAlertActionProxy,
  saveCommunityAction,
  saveContactAction,
  saveDistrictAction,
  saveRegionAction,
  toggleContactAction,
  updateSettingAction,
} from "./admin-form-actions";
import { broadcastSchema, communitySchema, contactSchema, districtSchema, regionSchema } from "../schemas";
import { ScopeSelect, type LocationOptions } from "./scope-picker";

const toSlug = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function BroadcastForm({ locations, allowPlatform }: { locations: LocationOptions; allowPlatform: boolean }) {
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(broadcastSchema, broadcastAction, {
    defaultValues: { title: "", body: "", link: "", scope: allowPlatform ? "platform" : "district", scopeId: "" },
    onSuccess: () => form.reset(),
  });
  const scope = form.watch("scope");
  const reg = (n: Parameters<typeof form.register>[0]) => ({ ...controlProps(n, errorFor(n)), ...form.register(n) });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="scope" label="Send to" required error={errorFor("scope")}>
          <NativeSelect {...reg("scope")}>
            {allowPlatform ? <option value="platform">Everyone on BridgeConnect</option> : null}
            <option value="region">Residents of a region</option>
            <option value="district">Residents of a district</option>
            <option value="community">Residents of a community</option>
          </NativeSelect>
        </Field>
        {scope !== "platform" ? (
          <Field id="scopeId" label="Area" required error={errorFor("scopeId")}><ScopeSelect scope={scope} locations={locations} {...reg("scopeId")} /></Field>
        ) : null}
      </div>
      <Field id="title" label="Title" required error={errorFor("title")}><Input maxLength={140} {...reg("title")} /></Field>
      <Field id="body" label="Message" error={errorFor("body")}><Textarea rows={3} maxLength={1000} {...reg("body")} /></Field>
      <Field id="link" label="Link" hint="Optional page on BridgeConnect, e.g. /events" error={errorFor("link")}><Input {...reg("link")} /></Field>
      <Button type="submit" disabled={pending} className="sm:w-fit">{pending ? "Sending…" : "Send notification"}</Button>
    </form>
  );
}

export function ContactForm({ locations }: { locations: LocationOptions }) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(contactSchema, saveContactAction, {
    defaultValues: { name: "", service: "police", phone: "", notes: "", scope: "district", scopeId: "" },
    onSuccess: () => { form.reset(); router.refresh(); },
  });
  const scope = form.watch("scope");
  const reg = (n: Parameters<typeof form.register>[0]) => ({ ...controlProps(n, errorFor(n)), ...form.register(n) });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormError message={formError} /></div>
      <Field id="name" label="Name" required error={errorFor("name")}><Input {...reg("name")} /></Field>
      <Field id="phone" label="Phone" required error={errorFor("phone")}><Input type="tel" {...reg("phone")} /></Field>
      <Field id="service" label="Service" required error={errorFor("service")}>
        <NativeSelect {...reg("service")}>{["police", "fire", "ambulance", "hospital", "disaster_management", "utility", "community_leader", "other"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</NativeSelect>
      </Field>
      <Field id="contactScope" label="Applies to" required error={errorFor("scope")}>
        <NativeSelect {...controlProps("contactScope", errorFor("scope"))} {...form.register("scope")}>
          <option value="national">Whole country</option><option value="region">A region</option><option value="district">A district</option><option value="community">A community</option>
        </NativeSelect>
      </Field>
      {scope !== "national" ? <Field id="contactScopeId" label="Area" required error={errorFor("scopeId")}><ScopeSelect scope={scope} locations={locations} {...controlProps("contactScopeId", errorFor("scopeId"))} {...form.register("scopeId")} /></Field> : null}
      <Field id="notes" label="Notes" error={errorFor("notes")}><Input maxLength={300} {...reg("notes")} /></Field>
      <Button type="submit" disabled={pending} className="sm:w-fit">Add contact</Button>
    </form>
  );
}

export function ContactToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const { pending, run } = useServerAction();
  return <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => toggleContactAction(id, !isActive))}>{isActive ? "Hide" : "Show"}</Button>;
}

export function CloseAlertButtons({ alertId }: { alertId: string }) {
  const { pending, run } = useServerAction();
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="green" disabled={pending} onClick={() => run(() => closeAlertActionProxy(alertId, "resolved"))}>Resolve</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => closeAlertActionProxy(alertId, "cancelled"))}>Cancel alert</Button>
    </div>
  );
}

type Loc = { id?: string; name: string; slug: string; isActive: boolean };

export function LocationForm({ kind, parents, initial, onDone }: { kind: "region" | "district" | "community"; parents?: { id: string; name: string }[]; initial?: Loc & { parentId?: string; description?: string }; onDone?: () => void }) {
  const router = useRouter();
  const schema = kind === "region" ? regionSchema : kind === "district" ? districtSchema : communitySchema;
  const action = kind === "region" ? saveRegionAction : kind === "district" ? saveDistrictAction : saveCommunityAction;
  const parentKey = kind === "district" ? "regionId" : "districtId";
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(schema as typeof communitySchema, action, {
    defaultValues: { id: initial?.id, name: initial?.name ?? "", slug: initial?.slug ?? "", isActive: initial?.isActive ?? true, [parentKey]: initial?.parentId ?? "", description: initial?.description ?? "" } as never,
    onSuccess: () => { if (!initial) form.reset(); onDone?.(); router.refresh(); },
  });
  const prefix = `${kind}-${initial?.id ?? "new"}`;
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <div className="sm:col-span-4"><FormError message={formError} /></div>
      {parents ? (
        <Field id={`${prefix}-parent`} label={kind === "district" ? "Region" : "District"} required error={errorFor(parentKey)}>
          <NativeSelect {...controlProps(`${prefix}-parent`, errorFor(parentKey))} {...form.register(parentKey as "districtId")}>
            <option value="">Choose…</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </Field>
      ) : null}
      <Field id={`${prefix}-name`} label="Name" required error={errorFor("name")}>
        <Input {...controlProps(`${prefix}-name`, errorFor("name"))} {...form.register("name", { onChange: (e) => { if (!slugTouched) form.setValue("slug", toSlug(e.target.value)); } })} />
      </Field>
      <Field id={`${prefix}-slug`} label="URL slug" required error={errorFor("slug")}>
        <Input {...controlProps(`${prefix}-slug`, errorFor("slug"))} {...form.register("slug", { onChange: () => setSlugTouched(true) })} />
      </Field>
      <div className="flex items-center gap-3 pb-2">
        <Label className="font-normal"><Checkbox checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v === true)} /> Active</Label>
        <Button type="submit" size="sm" disabled={pending}>{initial ? "Save" : `Add ${kind}`}</Button>
      </div>
    </form>
  );
}

export function SettingEditor({ settingKey, value, description }: { settingKey: string; value: string; description: string }) {
  const [draft, setDraft] = useState(value);
  const { pending, run } = useServerAction();
  const id = `setting-${settingKey}`;
  return (
    <div className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
      <div>
        <Label htmlFor={id} className="font-mono text-xs">{settingKey}</Label>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Input id={id} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono" />
      <Button size="sm" disabled={pending || draft === value} onClick={() => run(() => updateSettingAction({ key: settingKey, value: draft }))}>Save</Button>
    </div>
  );
}

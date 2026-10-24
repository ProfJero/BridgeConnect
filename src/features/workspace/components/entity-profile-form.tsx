"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { EntityAvatar } from "@/components/shared/avatars";
import { ImageUpload, type UploadedImage } from "@/components/widgets/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";

import { updateEntityProfileAction } from "../actions";
import { DAYS, entityProfileSchema } from "../schemas";

const DAY_LABEL = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" } as const;
type Hours = Partial<Record<(typeof DAYS)[number], { open: string; close: string } | null>>;

export type EntityProfileInitial = {
  entityId: string;
  name: string;
  isBusiness: boolean;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  logoPath: string | null;
  coverPath: string | null;
  openingHours: Hours | null;
  yearEstablished: number | "";
  deliveryAvailable: boolean;
  acceptsMobileMoney: boolean;
  mission: string;
  beneficiaries: string;
};

export function EntityProfileForm({ initial }: { initial: EntityProfileInitial }) {
  const router = useRouter();
  const [logo, setLogo] = useState<UploadedImage[]>([]);
  const [cover, setCover] = useState<UploadedImage[]>([]);
  const [hours, setHours] = useState<Hours>(initial.openingHours ?? {});
  const [useHours, setUseHours] = useState(initial.openingHours !== null);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(entityProfileSchema, updateEntityProfileAction, {
    defaultValues: { ...initial, openingHours: initial.openingHours ?? null },
    onSuccess: () => router.refresh(),
  });
  const reg = (name: Parameters<typeof form.register>[0]) => ({ ...controlProps(name, errorFor(name)), ...form.register(name) });
  const folder = `entities/${initial.entityId}`;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    const complete = Object.fromEntries(DAYS.map((d) => [d, hours[d] ?? null]));
    form.setValue("openingHours", useHours ? (complete as never) : null);
    void onSubmit(e);
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <FormError message={formError} />
      <Card>
        <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Logo</span>
            <div className="flex items-center gap-3">
              <EntityAvatar name={initial.name} path={logo[0]?.path ?? initial.logoPath} className="size-14" />
              <ImageUpload ownerFolder={folder} entityId={initial.entityId} max={1} value={logo} label="Upload logo" onChange={(i) => { setLogo(i); form.setValue("logoPath", i[0]?.path ?? initial.logoPath); }} />
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Cover image</span>
            <ImageUpload ownerFolder={folder} entityId={initial.entityId} max={1} value={cover} label="Upload cover" onChange={(i) => { setCover(i); form.setValue("coverPath", i[0]?.path ?? initial.coverPath); }} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>About</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">Your verified name, type and community can only be changed by DBI.</p>
          <Field id="tagline" label="Tagline" error={errorFor("tagline")}><Input maxLength={160} {...reg("tagline")} /></Field>
          <Field id="description" label="Description" error={errorFor("description")}><Textarea rows={5} maxLength={5000} {...reg("description")} /></Field>
          {initial.isBusiness ? (
            <div className="flex flex-wrap gap-6">
              <Label className="font-normal"><Checkbox defaultChecked={initial.deliveryAvailable} onCheckedChange={(v) => form.setValue("deliveryAvailable", v === true)} /> We offer delivery</Label>
              <Label className="font-normal"><Checkbox defaultChecked={initial.acceptsMobileMoney} onCheckedChange={(v) => form.setValue("acceptsMobileMoney", v === true)} /> We accept mobile money</Label>
            </div>
          ) : (
            <>
              <Field id="mission" label="Mission" error={errorFor("mission")}><Textarea rows={3} maxLength={2000} {...reg("mission")} /></Field>
              <Field id="beneficiaries" label="Who you serve" error={errorFor("beneficiaries")}><Input maxLength={500} {...reg("beneficiaries")} /></Field>
            </>
          )}
          <Field id="yearEstablished" label="Year established" error={errorFor("yearEstablished")}><Input type="number" inputMode="numeric" {...reg("yearEstablished")} /></Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="phone" label="Phone" error={errorFor("phone")}><Input type="tel" {...reg("phone")} /></Field>
          <Field id="whatsapp" label="WhatsApp" error={errorFor("whatsapp")}><Input type="tel" {...reg("whatsapp")} /></Field>
          <Field id="email" label="Email" error={errorFor("email")}><Input type="email" {...reg("email")} /></Field>
          <Field id="website" label="Website" error={errorFor("website")}><Input type="url" placeholder="https://" {...reg("website")} /></Field>
          <Field id="address" label="Address" className="sm:col-span-2" error={errorFor("address")}><Input maxLength={300} {...reg("address")} /></Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Opening hours</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <Label className="font-normal"><Checkbox checked={useHours} onCheckedChange={(v) => setUseHours(v === true)} /> Show opening hours</Label>
          {useHours ? (
            <div className="grid gap-2">
              {DAYS.map((d) => {
                const value = hours[d];
                return (
                  <div key={d} className="grid grid-cols-[3rem_auto_1fr_1fr] items-center gap-2">
                    <span className="text-sm font-medium">{DAY_LABEL[d]}</span>
                    <Checkbox aria-label={`Open on ${DAY_LABEL[d]}`} checked={Boolean(value)} onCheckedChange={(v) => setHours({ ...hours, [d]: v === true ? { open: "08:00", close: "17:00" } : null })} />
                    <Input type="time" aria-label={`${DAY_LABEL[d]} opening time`} disabled={!value} value={value?.open ?? ""} onChange={(e) => setHours({ ...hours, [d]: { open: e.target.value, close: value?.close ?? "17:00" } })} />
                    <Input type="time" aria-label={`${DAY_LABEL[d]} closing time`} disabled={!value} value={value?.close ?? ""} onChange={(e) => setHours({ ...hours, [d]: { open: value?.open ?? "08:00", close: e.target.value } })} />
                  </div>
                );
              })}
              {errorFor("openingHours") ? <p role="alert" className="text-xs text-destructive">{errorFor("openingHours")}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Button type="submit" size="lg" disabled={pending} className="sm:w-fit">{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

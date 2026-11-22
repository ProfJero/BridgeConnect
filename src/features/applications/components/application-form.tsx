"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";
import { controlProps, Field, FormError } from "@/components/forms/field";
import { LocationPicker } from "@/components/forms/location-picker";
import { SocialLinksFields } from "@/components/forms/social-links-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ENTITY_TYPE_LABEL, SECTOR_LABEL } from "@/features/directory/constants";
import { useActionForm } from "@/hooks/use-action-form";
import type { SocialLinks } from "@/lib/contact";

import { submitApplicationAction } from "../actions";
import { applicationSchema, ENTITY_TYPES, SECTORS } from "../schemas";

export function ApplicationForm({ communities }: { communities: CommunityChoice[] }) {
  const router = useRouter();
  const [socials, setSocials] = useState<SocialLinks>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(applicationSchema, submitApplicationAction, {
    defaultValues: { proposedName: "", description: "", contactPhone: "", whatsapp: "", contactEmail: "", website: "", address: "", registrationNumber: "", applicantPosition: "", communityId: "" },
    onSuccess: ({ data }) => data && router.push(data.entityId ? `/workspace/${data.entityId}` : `/apply/${data.id}`),
  });
  const reg = (name: Parameters<typeof form.register>[0], hint = false) => ({
    ...controlProps(name, errorFor(name), hint),
    ...form.register(name),
  });

  return (
    <form
      onSubmit={(e) => {
        form.setValue("socialLinks", socials);
        form.setValue("location", location);
        void onSubmit(e);
      }}
      noValidate
      className="grid gap-5"
    >
      <FormError message={formError} />
      <fieldset className="grid gap-4">
        <legend className="mb-1 font-semibold">About the organisation</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="entityType" label="Type" required error={errorFor("entityType")}>
            <NativeSelect defaultValue="" {...reg("entityType")}>
              <option value="" disabled>Choose a type</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{ENTITY_TYPE_LABEL[t]}</option>)}
            </NativeSelect>
          </Field>
          <Field id="sector" label="Sector" required error={errorFor("sector")}>
            <NativeSelect defaultValue="" {...reg("sector")}>
              <option value="" disabled>Choose a sector</option>
              {SECTORS.map((s) => <option key={s} value={s}>{SECTOR_LABEL[s]}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <Field id="proposedName" label="Official name" required error={errorFor("proposedName")}>
          <Input maxLength={120} {...reg("proposedName")} />
        </Field>
        <Field id="description" label="What do you do?" required error={errorFor("description")}>
          <Textarea rows={4} maxLength={5000} {...reg("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="communityId" label="Community" required error={errorFor("communityId")}>
            <CommunitySelect options={communities} {...reg("communityId")} />
          </Field>
          <Field id="address" label="Address or landmark" error={errorFor("address")}>
            <Input maxLength={300} {...reg("address")} />
          </Field>
        </div>
      </fieldset>
      <fieldset className="grid gap-4">
        <legend className="mb-1 font-semibold">Contact and verification</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="contactPhone" label="Phone" required error={errorFor("contactPhone")}>
            <Input type="tel" placeholder="+233 24 123 4567" {...reg("contactPhone")} />
          </Field>
          <Field id="whatsapp" label="WhatsApp number" hint="Leave empty if you don't use WhatsApp for business." error={errorFor("whatsapp")}>
            <Input type="tel" placeholder="+233 55 123 4567" {...reg("whatsapp", true)} />
          </Field>
          <Field id="contactEmail" label="Email" error={errorFor("contactEmail")}>
            <Input type="email" {...reg("contactEmail")} />
          </Field>
          <Field id="website" label="Website" error={errorFor("website")}>
            <Input type="url" inputMode="url" placeholder="https://…" {...reg("website")} />
          </Field>
          <Field id="registrationNumber" label="Registration number" hint="Kept private — used only for verification." error={errorFor("registrationNumber")}>
            <Input maxLength={80} {...reg("registrationNumber", true)} />
          </Field>
          <Field id="applicantPosition" label="Your role" hint="e.g. Owner, Director, Head teacher" error={errorFor("applicantPosition")}>
            <Input maxLength={80} {...reg("applicantPosition", true)} />
          </Field>
        </div>
      </fieldset>
      <SocialLinksFields value={socials} onChange={setSocials} error={errorFor("socialLinks")} />
      <LocationPicker value={location} onChange={setLocation} label="Where are you? Pin your location" />
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Submitting…" : "Submit application"}</Button>
    </form>
  );
}

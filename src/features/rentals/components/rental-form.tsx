"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";
import { controlProps, Field, FormError } from "@/components/forms/field";
import { ImageUpload, type UploadedImage } from "@/components/widgets/image-upload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { cn } from "@/lib/utils";

import { saveRentalAction } from "../actions";
import { AMENITY_SUGGESTIONS, RENTAL_TYPE_LABEL, RENTAL_TYPES, rentalSchema } from "../schemas";

export type RentalFormInitial = {
  rentalId: string;
  communityId: string;
  rentalType: (typeof RENTAL_TYPES)[number];
  title: string;
  description: string;
  price: number;
  period: "day" | "week" | "month" | "year";
  advanceMonths: number | "";
  bedrooms: number | "";
  bathrooms: number | "";
  furnished: boolean;
  amenities: string[];
  locationNote: string;
  contactPhone: string;
  whatsapp: string;
  availableFrom: string;
  status: "draft" | "available" | "rented" | "archived";
  images: UploadedImage[];
};

export function RentalForm({
  userId,
  communities,
  defaultCommunityId,
  initial,
}: {
  userId: string;
  communities: CommunityChoice[];
  defaultCommunityId?: string;
  initial?: RentalFormInitial;
}) {
  const router = useRouter();
  const [images, setImages] = useState<UploadedImage[]>(initial?.images ?? []);
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? []);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(rentalSchema, saveRentalAction, {
    defaultValues: initial
      ? { ...initial }
      : {
          communityId: defaultCommunityId ?? "",
          rentalType: "self_contain",
          title: "",
          description: "",
          period: "month",
          advanceMonths: "",
          bedrooms: "",
          bathrooms: "",
          furnished: false,
          locationNote: "",
          contactPhone: "",
          whatsapp: "",
          availableFrom: "",
          status: "available",
        },
    onSuccess: ({ data }) => router.push(data ? `/rentals/${data.slug}` : "/rentals/mine"),
  });
  const reg = (name: Parameters<typeof form.register>[0], hint = false) => ({ ...controlProps(name, errorFor(name), hint), ...form.register(name) });
  const toggleAmenity = (a: string) => setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a].slice(0, 20)));

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        form.setValue("mediaIds", images.map((i) => i.id));
        form.setValue("amenities", amenities);
        void onSubmit(e);
      }}
    >
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="rentalType" label="Property type" required error={errorFor("rentalType")}>
          <NativeSelect {...reg("rentalType")}>
            {RENTAL_TYPES.map((t) => <option key={t} value={t}>{RENTAL_TYPE_LABEL[t]}</option>)}
          </NativeSelect>
        </Field>
        <Field id="communityId" label="Community" required error={errorFor("communityId")}>
          <CommunitySelect options={communities} {...reg("communityId")} />
        </Field>
      </div>
      <Field id="title" label="Title" required error={errorFor("title")} hint="e.g. Two-bedroom apartment near the market">
        <Input maxLength={140} {...reg("title", true)} />
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field id="price" label="Rent (GHS)" required error={errorFor("price")} className="col-span-2 sm:col-span-1">
          <Input type="number" inputMode="decimal" min="1" step="0.01" {...reg("price")} />
        </Field>
        <Field id="period" label="Per" required error={errorFor("period")}>
          <NativeSelect {...reg("period")}>
            <option value="month">Month</option>
            <option value="year">Year</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </NativeSelect>
        </Field>
        <Field id="advanceMonths" label="Advance (months)" error={errorFor("advanceMonths")}>
          <Input type="number" inputMode="numeric" min="0" max="36" {...reg("advanceMonths")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field id="bedrooms" label="Bedrooms" error={errorFor("bedrooms")}>
          <Input type="number" inputMode="numeric" min="0" max="20" {...reg("bedrooms")} />
        </Field>
        <Field id="bathrooms" label="Bathrooms" error={errorFor("bathrooms")}>
          <Input type="number" inputMode="numeric" min="0" max="20" {...reg("bathrooms")} />
        </Field>
        <Field id="availableFrom" label="Available from" error={errorFor("availableFrom")} className="col-span-2">
          <Input type="date" {...reg("availableFrom")} />
        </Field>
      </div>
      <Label className="font-normal">
        <Checkbox defaultChecked={initial?.furnished} onCheckedChange={(v) => form.setValue("furnished", v === true)} /> Furnished
      </Label>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Amenities</legend>
        <div className="flex flex-wrap gap-2">
          {[...new Set([...AMENITY_SUGGESTIONS, ...amenities])].map((a) => {
            const on = amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => toggleAmenity(a)}
                className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition active:scale-95", on ? "border-primary bg-primary-soft font-medium text-primary-soft-foreground" : "bg-card hover:bg-accent")}
              >
                {on ? <Check aria-hidden className="size-3.5" /> : null}{a}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Field id="description" label="Description" required error={errorFor("description")}>
        <Textarea rows={5} maxLength={5000} {...reg("description")} />
      </Field>
      <Field id="locationNote" label="Location / landmark" error={errorFor("locationNote")} hint="A landmark is enough — don't post your exact house number.">
        <Input maxLength={300} {...reg("locationNote", true)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="contactPhone" label="Contact phone" required error={errorFor("contactPhone")} hint="Shown on the listing.">
          <Input type="tel" autoComplete="tel" {...reg("contactPhone", true)} />
        </Field>
        <Field id="whatsapp" label="WhatsApp" error={errorFor("whatsapp")}>
          <Input type="tel" {...reg("whatsapp")} />
        </Field>
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Photos <span className="text-xs font-normal text-muted-foreground">(up to 8)</span></span>
        <ImageUpload ownerFolder={`users/${userId}`} value={images} onChange={setImages} max={8} />
      </div>
      <Field id="status" label="Status" required error={errorFor("status")}>
        <NativeSelect {...reg("status")}>
          <option value="available">Available (visible)</option>
          <option value="rented">Rented (visible, no enquiries)</option>
          <option value="draft">Draft (hidden)</option>
          <option value="archived">Archived (hidden)</option>
        </NativeSelect>
      </Field>
      <p className="text-xs text-muted-foreground">Never ask tenants to pay before they have viewed the property. Fake listings are removed.</p>
      <Button type="submit" size="lg" className="rounded-full" disabled={pending}>{pending ? "Saving…" : initial ? "Save changes" : "Publish listing"}</Button>
    </form>
  );
}

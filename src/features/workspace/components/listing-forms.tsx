"use client";

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
import { EMPLOYMENT_TYPES } from "@/features/jobs/schemas";
import { useActionForm } from "@/hooks/use-action-form";
import { humanize } from "@/lib/format";

import { saveEventAction, saveJobAction, saveProductAction, saveServiceAction } from "../actions";
import { eventSchema, jobSchema, productSchema, serviceSchema } from "../schemas";

type Category = { id: string; name: string };

function CategorySelect({ categories, ...props }: React.ComponentProps<"select"> & { categories: Category[] }) {
  return (
    <NativeSelect {...props}>
      <option value="">Uncategorised</option>
      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </NativeSelect>
  );
}

export function ProductForm({
  entityId,
  categories,
  initial,
  initialImages = [],
}: {
  entityId: string;
  categories: Category[];
  initial?: Partial<{ productId: string; name: string; categoryId: string; description: string; price: number; unit: string; stockQuantity: number | ""; status: "draft" | "active" | "out_of_stock" | "archived" }>;
  initialImages?: UploadedImage[];
}) {
  const router = useRouter();
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(productSchema, saveProductAction, {
    defaultValues: { entityId, name: "", categoryId: "", description: "", unit: "", stockQuantity: "", status: "active", ...initial },
    onSuccess: () => router.push(`/workspace/${entityId}/products`),
  });
  const reg = (name: Parameters<typeof form.register>[0], hint = false) => ({ ...controlProps(name, errorFor(name), hint), ...form.register(name) });
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    form.setValue("mediaIds", images.map((i) => i.id));
    void onSubmit(e);
  };
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="name" label="Product name" required error={errorFor("name")}><Input maxLength={120} {...reg("name")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="categoryId" label="Category" error={errorFor("categoryId")}><CategorySelect categories={categories} {...reg("categoryId")} /></Field>
        <Field id="status" label="Status" required error={errorFor("status")}>
          <NativeSelect {...reg("status")}>
            <option value="active">Active (visible)</option>
            <option value="draft">Draft (hidden)</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="archived">Archived</option>
          </NativeSelect>
        </Field>
        <Field id="price" label="Price (GHS)" required error={errorFor("price")}><Input type="number" inputMode="decimal" step="0.01" min="0" {...reg("price")} /></Field>
        <Field id="unit" label="Unit" hint="e.g. per bag, per kg" error={errorFor("unit")}><Input maxLength={30} {...reg("unit", true)} /></Field>
        <Field id="stockQuantity" label="Stock quantity" hint="Leave blank if you don't track stock." error={errorFor("stockQuantity")}><Input type="number" inputMode="numeric" min="0" {...reg("stockQuantity", true)} /></Field>
      </div>
      <Field id="description" label="Description" error={errorFor("description")}><Textarea rows={4} maxLength={5000} {...reg("description")} /></Field>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Photos</span>
        <ImageUpload ownerFolder={`entities/${entityId}`} entityId={entityId} value={images} onChange={setImages} max={6} />
      </div>
      <Button type="submit" disabled={pending} className="sm:w-fit">{pending ? "Saving…" : initial?.productId ? "Save changes" : "Create product"}</Button>
    </form>
  );
}

export function ServiceForm({
  entityId,
  categories,
  initial,
}: {
  entityId: string;
  categories: Category[];
  initial?: Partial<{ serviceId: string; name: string; categoryId: string; description: string; priceFrom: number | ""; priceNote: string; serviceArea: string; status: "draft" | "active" | "archived" }>;
}) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(serviceSchema, saveServiceAction, {
    defaultValues: { entityId, name: "", categoryId: "", description: "", priceFrom: "", priceNote: "", serviceArea: "", status: "active", ...initial },
    onSuccess: () => router.push(`/workspace/${entityId}/services`),
  });
  const reg = (name: Parameters<typeof form.register>[0], hint = false) => ({ ...controlProps(name, errorFor(name), hint), ...form.register(name) });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="name" label="Service name" required error={errorFor("name")}><Input maxLength={120} {...reg("name")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="categoryId" label="Category" error={errorFor("categoryId")}><CategorySelect categories={categories} {...reg("categoryId")} /></Field>
        <Field id="status" label="Status" required error={errorFor("status")}>
          <NativeSelect {...reg("status")}>
            <option value="active">Active (visible)</option>
            <option value="draft">Draft (hidden)</option>
            <option value="archived">Archived</option>
          </NativeSelect>
        </Field>
        <Field id="priceFrom" label="Price from (GHS)" error={errorFor("priceFrom")}><Input type="number" inputMode="decimal" step="0.01" min="0" {...reg("priceFrom")} /></Field>
        <Field id="priceNote" label="Price note" hint="e.g. Free, Negotiable" error={errorFor("priceNote")}><Input maxLength={120} {...reg("priceNote", true)} /></Field>
      </div>
      <Field id="serviceArea" label="Area served" error={errorFor("serviceArea")}><Input maxLength={200} {...reg("serviceArea")} /></Field>
      <Field id="description" label="Description" error={errorFor("description")}><Textarea rows={4} maxLength={5000} {...reg("description")} /></Field>
      <Button type="submit" disabled={pending} className="sm:w-fit">{pending ? "Saving…" : initial?.serviceId ? "Save changes" : "Create service"}</Button>
    </form>
  );
}

export function JobForm({
  entityId,
  categories,
  communities,
  defaultCommunityId,
  initial,
}: {
  entityId: string;
  categories: Category[];
  communities: CommunityChoice[];
  defaultCommunityId: string;
  initial?: Partial<{
    jobId: string; title: string; categoryId: string; communityId: string; description: string; requirements: string;
    employmentType: (typeof EMPLOYMENT_TYPES)[number]; locationNote: string; salaryMin: number | ""; salaryMax: number | "";
    salaryPeriod: "hour" | "day" | "week" | "month" | "year" | "fixed" | ""; applicationDeadline: string; status: "draft" | "open" | "closed" | "archived";
  }>;
}) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(jobSchema, saveJobAction, {
    defaultValues: {
      entityId, title: "", categoryId: "", communityId: defaultCommunityId, description: "", requirements: "",
      employmentType: "full_time", locationNote: "", salaryMin: "", salaryMax: "", salaryPeriod: "month", applicationDeadline: "", status: "open", ...initial,
    },
    onSuccess: () => router.push(`/workspace/${entityId}/jobs`),
  });
  const reg = (name: Parameters<typeof form.register>[0], hint = false) => ({ ...controlProps(name, errorFor(name), hint), ...form.register(name) });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="title" label="Job title" required error={errorFor("title")}><Input maxLength={140} {...reg("title")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="employmentType" label="Employment type" required error={errorFor("employmentType")}>
          <NativeSelect {...reg("employmentType")}>{EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</NativeSelect>
        </Field>
        <Field id="categoryId" label="Category" error={errorFor("categoryId")}><CategorySelect categories={categories} {...reg("categoryId")} /></Field>
        <Field id="communityId" label="Location" required error={errorFor("communityId")}>
          <CommunitySelect options={communities} disabled={Boolean(initial?.jobId)} {...reg("communityId")} />
        </Field>
        <Field id="locationNote" label="Location details" error={errorFor("locationNote")}><Input maxLength={200} {...reg("locationNote")} /></Field>
        <Field id="salaryMin" label="Salary from (GHS)" error={errorFor("salaryMin")}><Input type="number" min="0" step="0.01" {...reg("salaryMin")} /></Field>
        <Field id="salaryMax" label="Salary to (GHS)" error={errorFor("salaryMax")}><Input type="number" min="0" step="0.01" {...reg("salaryMax")} /></Field>
        <Field id="salaryPeriod" label="Paid per" error={errorFor("salaryPeriod")}>
          <NativeSelect {...reg("salaryPeriod")}>
            <option value="">Not specified</option>
            {["hour", "day", "week", "month", "year", "fixed"].map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
          </NativeSelect>
        </Field>
        <Field id="applicationDeadline" label="Application deadline" error={errorFor("applicationDeadline")}><Input type="date" {...reg("applicationDeadline")} /></Field>
        <Field id="status" label="Status" required error={errorFor("status")}>
          <NativeSelect {...reg("status")}>
            <option value="open">Open (accepting applications)</option>
            <option value="draft">Draft (hidden)</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </NativeSelect>
        </Field>
      </div>
      <Field id="description" label="Description" required error={errorFor("description")}><Textarea rows={6} maxLength={8000} {...reg("description")} /></Field>
      <Field id="requirements" label="Requirements" error={errorFor("requirements")}><Textarea rows={4} maxLength={4000} {...reg("requirements")} /></Field>
      <Button type="submit" disabled={pending} className="sm:w-fit">{pending ? "Saving…" : initial?.jobId ? "Save changes" : "Publish job"}</Button>
    </form>
  );
}

export function EventForm({
  entityId,
  categories,
  communities,
  defaultCommunityId,
  initial,
}: {
  entityId: string;
  categories: Category[];
  communities: CommunityChoice[];
  defaultCommunityId: string;
  initial?: Partial<{
    eventId: string; title: string; categoryId: string; communityId: string; description: string; isOnline: boolean; venue: string;
    onlineUrl: string; startsAt: string; endsAt: string; capacity: number | ""; coverPath: string | null; status: "draft" | "published" | "cancelled";
  }>;
}) {
  const router = useRouter();
  const [cover, setCover] = useState<UploadedImage[]>([]);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(eventSchema, saveEventAction, {
    defaultValues: {
      entityId, title: "", categoryId: "", communityId: defaultCommunityId, description: "", isOnline: false, venue: "",
      onlineUrl: "", startsAt: "", endsAt: "", capacity: "", status: "published", ...initial,
    },
    onSuccess: () => router.push(`/workspace/${entityId}/events`),
  });
  const reg = (name: Parameters<typeof form.register>[0]) => ({ ...controlProps(name, errorFor(name)), ...form.register(name) });
  const isOnline = form.watch("isOnline");
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="title" label="Event title" required error={errorFor("title")}><Input maxLength={140} {...reg("title")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="startsAt" label="Starts" required error={errorFor("startsAt")}><Input type="datetime-local" {...reg("startsAt")} /></Field>
        <Field id="endsAt" label="Ends" error={errorFor("endsAt")}><Input type="datetime-local" {...reg("endsAt")} /></Field>
        <Field id="categoryId" label="Category" error={errorFor("categoryId")}><CategorySelect categories={categories} {...reg("categoryId")} /></Field>
        <Field id="communityId" label="Community" required error={errorFor("communityId")}>
          <CommunitySelect options={communities} disabled={Boolean(initial?.eventId)} {...reg("communityId")} />
        </Field>
      </div>
      <Label className="font-normal">
        <Checkbox checked={isOnline} onCheckedChange={(v) => form.setValue("isOnline", v === true)} /> This is an online event
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="venue" label="Venue" required={!isOnline} error={errorFor("venue")}><Input maxLength={200} {...reg("venue")} /></Field>
        {isOnline ? <Field id="onlineUrl" label="Online link" hint="Shown only to people who RSVP." error={errorFor("onlineUrl")}><Input type="url" placeholder="https://" {...reg("onlineUrl")} /></Field> : null}
        <Field id="capacity" label="Capacity" error={errorFor("capacity")}><Input type="number" min="1" {...reg("capacity")} /></Field>
        <Field id="status" label="Status" required error={errorFor("status")}>
          <NativeSelect {...reg("status")}>
            <option value="published">Published</option>
            <option value="draft">Draft (hidden)</option>
            <option value="cancelled">Cancelled</option>
          </NativeSelect>
        </Field>
      </div>
      <Field id="description" label="Description" required error={errorFor("description")}><Textarea rows={5} maxLength={8000} {...reg("description")} /></Field>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Cover image</span>
        <ImageUpload ownerFolder={`entities/${entityId}`} entityId={entityId} max={1} value={cover} label="Upload cover" onChange={(i) => { setCover(i); form.setValue("coverPath", i[0]?.path ?? initial?.coverPath ?? null); }} />
      </div>
      <Button type="submit" disabled={pending} className="sm:w-fit">{pending ? "Saving…" : initial?.eventId ? "Save changes" : "Create event"}</Button>
    </form>
  );
}

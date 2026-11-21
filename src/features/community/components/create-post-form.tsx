"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";
import { controlProps, Field, FormError } from "@/components/forms/field";
import { ImageUpload, type UploadedImage } from "@/components/widgets/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";

import { createPostAction } from "../actions";
import { createPostSchema, POST_KIND_LABEL, POST_KINDS, RESIDENT_POST_KINDS } from "../schemas";

export function CreatePostForm({
  userId,
  communities,
  defaultCommunityId,
  defaultEntityId,
  workspaces,
}: {
  defaultEntityId?: string;
  userId: string;
  communities: CommunityChoice[];
  defaultCommunityId?: string;
  /** Workspaces where the user may post (editor+ with the posts capability). */
  workspaces: { entityId: string; name: string; communityId: string }[];
}) {
  const router = useRouter();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(createPostSchema, createPostAction, {
    defaultValues: { communityId: defaultCommunityId ?? "", kind: defaultEntityId ? "announcement" : "general", title: "", body: "", entityId: defaultEntityId ?? "" },
    onSuccess: ({ data }) => router.push(data ? `/community/posts/${data.id}` : "/community"),
  });
  const entityId = form.watch("entityId");
  const kinds = entityId ? POST_KINDS : RESIDENT_POST_KINDS;
  const body = form.watch("body") ?? "";
  const kind = form.watch("kind");

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    form.setValue("mediaIds", images.map((i) => i.id));
    form.setValue("pollOptions", kind === "poll" ? options : undefined);
    void onSubmit(e);
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormError message={formError} />
      {workspaces.length > 0 ? (
        <Field id="entityId" label="Post as" error={errorFor("entityId")}>
          <NativeSelect
            {...controlProps("entityId", errorFor("entityId"))}
            {...form.register("entityId", {
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                const ws = workspaces.find((w) => w.entityId === e.target.value);
                if (ws) form.setValue("communityId", ws.communityId);
                else form.setValue("kind", "general");
              },
            })}
          >
            <option value="">Myself</option>
            {workspaces.map((w) => (
              <option key={w.entityId} value={w.entityId}>{w.name}</option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="communityId" label="Community" required error={errorFor("communityId")}>
          <CommunitySelect options={communities} disabled={Boolean(entityId)} {...controlProps("communityId", errorFor("communityId"))} {...form.register("communityId")} />
        </Field>
        <Field id="kind" label="Type of post" required error={errorFor("kind")}>
          <NativeSelect {...controlProps("kind", errorFor("kind"))} {...form.register("kind")}>
            {kinds.map((k) => (
              <option key={k} value={k}>{POST_KIND_LABEL[k]}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field id="title" label="Title" error={errorFor("title")}>
        <Input maxLength={140} {...controlProps("title", errorFor("title"))} {...form.register("title")} />
      </Field>
      <Field id="body" label="What would you like to share?" required error={errorFor("body")} hint={`${body.length}/5000`}>
        <Textarea rows={6} maxLength={5000} {...controlProps("body", errorFor("body"), true)} {...form.register("body")} />
      </Field>
      {kind === "poll" ? (
        <fieldset className="grid gap-2 rounded-xl border p-3" aria-describedby={errorFor("pollOptions") ? "pollOptions-error" : undefined}>
          <legend className="px-1 text-sm font-medium">Poll options</legend>
          {options.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label={`Option ${i + 1}`}
                maxLength={100}
                value={value}
                placeholder={`Option ${i + 1}`}
                onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
              />
              {options.length > 2 ? (
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}>
                  <X aria-hidden />
                </Button>
              ) : null}
            </div>
          ))}
          {options.length < 6 ? (
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setOptions((prev) => [...prev, ""])}>
              <Plus aria-hidden /> Add option
            </Button>
          ) : null}
          <Field id="pollDays" label="Poll stays open for" required>
            <NativeSelect {...controlProps("pollDays")} {...form.register("pollDays")} defaultValue="7">
              {[1, 3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>
              ))}
            </NativeSelect>
          </Field>
          {errorFor("pollOptions") ? (
            <p id="pollOptions-error" role="alert" className="text-xs font-medium text-destructive">{errorFor("pollOptions")}</p>
          ) : null}
        </fieldset>
      ) : null}
      <div className="grid gap-2">
        <span className="text-sm font-medium">Photos <span className="text-xs font-normal text-muted-foreground">(optional)</span></span>
        <ImageUpload ownerFolder={`users/${userId}`} value={images} onChange={setImages} max={4} />
      </div>
      <p className="text-xs text-muted-foreground">
        Keep it respectful and truthful. Posts that break community guidelines may be hidden by moderators.
      </p>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Posting…" : "Post to community"}
      </Button>
    </form>
  );
}

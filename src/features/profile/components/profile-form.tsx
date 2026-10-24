"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";
import { controlProps, Field, FormError } from "@/components/forms/field";
import { UserAvatar } from "@/components/shared/avatars";
import { ImageUpload, type UploadedImage } from "@/components/widgets/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";

import { updateProfileAction } from "../actions";
import { profileSchema } from "../schemas";

export function ProfileForm({
  userId,
  communities,
  initial,
}: {
  userId: string;
  communities: CommunityChoice[];
  initial: { displayName: string; username: string; bio: string; homeCommunityId: string; avatarPath: string | null };
}) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<UploadedImage[]>([]);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(profileSchema, updateProfileAction, {
    defaultValues: initial,
    onSuccess: () => router.push("/profile"),
  });
  const currentAvatar = avatar[0]?.path ?? initial.avatarPath;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <div className="flex items-center gap-4">
        <UserAvatar name={initial.displayName} path={currentAvatar} className="size-16" />
        <ImageUpload
          ownerFolder={`users/${userId}`}
          max={1}
          value={avatar}
          label="Change photo"
          onChange={(imgs) => {
            setAvatar(imgs);
            form.setValue("avatarPath", imgs[0]?.path ?? initial.avatarPath);
          }}
        />
      </div>
      <Field id="displayName" label="Name" required error={errorFor("displayName")}>
        <Input autoComplete="name" {...controlProps("displayName", errorFor("displayName"))} {...form.register("displayName")} />
      </Field>
      <Field id="username" label="Username" hint="Lowercase letters, numbers and underscores." error={errorFor("username")}>
        <Input autoCapitalize="none" {...controlProps("username", errorFor("username"), true)} {...form.register("username")} />
      </Field>
      <Field id="homeCommunityId" label="Home community" hint="Used for your feed and emergency alerts." error={errorFor("homeCommunityId")}>
        <CommunitySelect options={communities} {...controlProps("homeCommunityId", errorFor("homeCommunityId"), true)} {...form.register("homeCommunityId")} />
      </Field>
      <Field id="bio" label="About you" error={errorFor("bio")}>
        <Textarea rows={3} maxLength={500} {...controlProps("bio", errorFor("bio"))} {...form.register("bio")} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

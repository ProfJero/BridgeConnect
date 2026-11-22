"use client";

import { Input } from "@/components/ui/input";
import { SOCIAL_NETWORKS, type SocialLinks } from "@/lib/contact";

/** Social profile inputs (https links). */
export function SocialLinksFields({ value, onChange, error }: { value: SocialLinks; onChange: (v: SocialLinks) => void; error?: string }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-medium">Social media <span className="text-xs font-normal text-muted-foreground">(optional)</span></legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_NETWORKS.map((n) => (
          <div key={n.key} className="grid gap-1">
            <label htmlFor={`social-${n.key}`} className="text-xs font-medium text-muted-foreground">{n.label}</label>
            <Input
              id={`social-${n.key}`}
              type="url"
              inputMode="url"
              placeholder={n.placeholder}
              value={value[n.key] ?? ""}
              maxLength={300}
              onChange={(e) => onChange({ ...value, [n.key]: e.target.value.trim() || undefined })}
            />
          </div>
        ))}
      </div>
      {error ? <p role="alert" className="text-xs font-medium text-destructive">{error}</p> : null}
    </fieldset>
  );
}

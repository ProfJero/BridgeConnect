import { Building2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  path,
  className,
}: {
  name: string;
  path?: string | null;
  className?: string;
}) {
  const src = publicMediaUrl(path);
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function EntityAvatar({
  name,
  path,
  className,
}: {
  name: string;
  path?: string | null;
  className?: string;
}) {
  const src = publicMediaUrl(path);
  return (
    <Avatar className={cn("rounded-xl", className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className="rounded-xl bg-brand-green-soft text-brand-green-soft-foreground">
        {initials(name) || <Building2 aria-hidden className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

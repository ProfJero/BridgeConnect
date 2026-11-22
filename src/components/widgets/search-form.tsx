import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

/** Plain GET form: works without JavaScript and keeps results shareable. */
export function SearchForm({
  action,
  defaultValue,
  placeholder = "Search",
  hidden,
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} role="search" className="relative flex-1">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 rounded-2xl bg-card pl-11 shadow-xs"
        maxLength={100}
      />
    </form>
  );
}

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
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" name="q" defaultValue={defaultValue} placeholder={placeholder} aria-label={placeholder} className="pl-9" maxLength={100} />
    </form>
  );
}

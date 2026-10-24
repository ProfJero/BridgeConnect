import { ShieldCheck } from "lucide-react";

const TIPS = [
  "Meet in a public place and inspect the item before you pay.",
  "Pay with mobile money only after you've received what you ordered.",
  "Never share your MoMo PIN or one-time codes — BridgeConnect will never ask for them.",
  "Report anything suspicious with the Report button.",
];

/** Buyer safety guidance shown beside marketplace and service listings. */
export function SafetyTips() {
  return (
    <aside aria-labelledby="safety-tips" className="rounded-xl border bg-card p-4 text-sm">
      <h2 id="safety-tips" className="mb-2 flex items-center gap-2 font-semibold">
        <ShieldCheck aria-hidden className="size-4 text-brand-green" /> Stay safe
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </aside>
  );
}

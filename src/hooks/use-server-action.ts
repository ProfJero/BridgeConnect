"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/action-result";

/** Run a one-off Server Action (button click) with pending state and toasts. */
export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    opts: { onSuccess?: (data?: T) => void; refresh?: boolean } = {},
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (result.message) toast.success(result.message);
          opts.onSuccess?.(result.data);
          if (opts.refresh !== false) router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("We couldn't reach BridgeConnect. Check your connection and try again.");
      }
    });
  }

  return { pending, run };
}

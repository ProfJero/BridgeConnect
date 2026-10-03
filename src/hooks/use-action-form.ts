"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import type { ActionResult } from "@/lib/action-result";

type Options<TOut, TData> = {
  defaultValues?: DefaultValues<TOut & FieldValues>;
  onSuccess?: (result: { message?: string; data?: TData }) => void;
  successToast?: boolean;
};

/**
 * React Hook Form + Zod on the client, bound to a Server Action that
 * re-validates with the same schema. Server field errors are mapped back onto
 * the form; the server's verdict is always authoritative.
 */
export function useActionForm<TSchema extends z.ZodType<FieldValues, FieldValues>, TData = undefined>(
  schema: TSchema,
  action: (values: z.output<TSchema>) => Promise<ActionResult<TData>>,
  options: Options<z.input<TSchema>, TData> = {},
) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    // The generic schema type erases zodResolver's inference; the cast restores it.
    resolver: zodResolver(schema) as unknown as Resolver<z.input<TSchema>, unknown, z.output<TSchema>>,
    defaultValues: options.defaultValues,
    mode: "onTouched",
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await action(values);
        if (result.ok) {
          if (options.successToast !== false && result.message) toast.success(result.message);
          options.onSuccess?.({ message: result.message, data: result.data });
          return;
        }
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as Path<z.input<TSchema>>, { message: messages[0] });
        }
      } catch {
        setFormError("We couldn't reach BridgeConnect. Check your connection and try again.");
      }
    });
  });

  const errorFor = (name: string): string | undefined => {
    const parts = name.split(".");
    let node: unknown = form.formState.errors;
    for (const part of parts) node = (node as Record<string, unknown> | undefined)?.[part];
    return (node as { message?: string } | undefined)?.message;
  };

  return { form, onSubmit, pending, formError, errorFor };
}

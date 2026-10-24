"use client";

import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { placeOrderAction } from "@/features/orders/actions";
import { placeOrderSchema } from "@/features/orders/schemas";
import { useActionForm } from "@/hooks/use-action-form";
import { formatMoney } from "@/lib/format";

export function OrderForm({
  entityId,
  productId,
  price,
  currency,
  maxQuantity,
  deliveryAvailable,
}: {
  entityId: string;
  productId: string;
  price: number;
  currency: string;
  maxQuantity: number | null;
  deliveryAvailable: boolean;
}) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(placeOrderSchema, placeOrderAction, {
    defaultValues: { entityId, productId, quantity: 1, fulfilment: "pickup", contactPhone: "", deliveryAddress: "", note: "" },
    onSuccess: ({ data }) => data && router.push(`/orders/${data.orderId}`),
  });
  const quantity = Number(form.watch("quantity")) || 0;
  const fulfilment = form.watch("fulfilment");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="quantity" label="Quantity" required error={errorFor("quantity")} hint={maxQuantity != null ? `${maxQuantity} available` : undefined}>
        <Input type="number" inputMode="numeric" min={1} max={maxQuantity ?? 1000} {...controlProps("quantity", errorFor("quantity"), maxQuantity != null)} {...form.register("quantity")} />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">How would you like to receive it?</legend>
        <div className="flex gap-4">
          <Label className="font-normal">
            <input type="radio" value="pickup" {...form.register("fulfilment")} className="accent-primary" /> Pickup
          </Label>
          {deliveryAvailable ? (
            <Label className="font-normal">
              <input type="radio" value="delivery" {...form.register("fulfilment")} className="accent-primary" /> Delivery
            </Label>
          ) : null}
        </div>
      </fieldset>
      {fulfilment === "delivery" ? (
        <Field id="deliveryAddress" label="Delivery address" required error={errorFor("deliveryAddress")}>
          <Textarea rows={2} {...controlProps("deliveryAddress", errorFor("deliveryAddress"))} {...form.register("deliveryAddress")} />
        </Field>
      ) : null}
      <Field id="contactPhone" label="Phone number" required hint="The seller will use this to arrange your order." error={errorFor("contactPhone")}>
        <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+233 24 123 4567" {...controlProps("contactPhone", errorFor("contactPhone"), true)} {...form.register("contactPhone")} />
      </Field>
      <Field id="note" label="Note to seller" error={errorFor("note")}>
        <Textarea rows={2} maxLength={500} {...controlProps("note", errorFor("note"))} {...form.register("note")} />
      </Field>
      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span>Estimated total</span>
        <strong>{formatMoney(price * quantity, currency)}</strong>
      </div>
      <p className="text-xs text-muted-foreground">Final price is confirmed by BridgeConnect when you order. Pay the seller on pickup or delivery.</p>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}

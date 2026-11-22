"use client";

import { Phone, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useServerAction } from "@/hooks/use-server-action";

import { deleteRentalAction, setInquiryStatusAction } from "../actions";

export function DeleteRentalButton({ rentalId }: { rentalId: string }) {
  const { pending, run } = useServerAction();
  return (
    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending}
      onClick={() => { if (window.confirm("Delete this listing permanently?")) run(() => deleteRentalAction(rentalId)); }}>
      <Trash2 aria-hidden /> Delete
    </Button>
  );
}

export function InquiryControls({ id, status, phone }: { id: string; status: "new" | "contacted" | "closed"; phone: string }) {
  const { pending, run } = useServerAction();
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="green" size="sm" className="rounded-full"><a href={`tel:${phone.replace(/\s/g, "")}`}><Phone aria-hidden /> Call</a></Button>
      <label className="sr-only" htmlFor={`inq-${id}`}>Enquiry status</label>
      <NativeSelect id={`inq-${id}`} value={status} disabled={pending} className="h-8 w-auto text-xs"
        onChange={(e) => run(() => setInquiryStatusAction(id, e.target.value as "new" | "contacted" | "closed"))}>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="closed">Closed</option>
      </NativeSelect>
    </div>
  );
}

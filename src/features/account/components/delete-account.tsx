"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { deleteAccountAction } from "../actions";

export function DeleteAccount() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive"><Trash2 aria-hidden /> Delete my account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your profile, posts, comments, reviews, messages and saved items are removed. Orders you placed are kept for the
            seller&apos;s records but no longer linked to your name. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
          <Input id="confirm-delete" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={confirm !== "DELETE" || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAccountAction(confirm);
                if (result.ok) {
                  toast.success(result.message ?? "Account deleted.");
                  router.replace("/");
                  router.refresh();
                } else toast.error(result.error);
              })
            }
          >
            {pending ? "Deleting…" : "Permanently delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

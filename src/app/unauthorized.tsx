import { LockKeyhole } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <main id="main">
      <ErrorState
        icon={LockKeyhole}
        code="401"
        title="Please sign in"
        description="You need to be signed in to continue."
      >
        <Button asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sign-up">Create an account</Link>
        </Button>
      </ErrorState>
    </main>
  );
}

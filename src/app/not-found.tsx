import { MapPinOff } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main">
      <ErrorState
        icon={MapPinOff}
        code="404"
        title="We couldn't find that page"
        description="It may have been moved, removed, or you may not have access to it."
      >
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">Search BridgeConnect</Link>
        </Button>
      </ErrorState>
    </main>
  );
}

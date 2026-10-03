import { ShieldX } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main id="main">
      <ErrorState
        icon={ShieldX}
        code="403"
        title="You don't have access to this"
        description="Your account doesn't have permission for this area. If you think this is a mistake, contact your administrator or the Digital Bridge Initiative support team."
      >
        <Button asChild>
          <Link href="/">Back to BridgeConnect</Link>
        </Button>
      </ErrorState>
    </main>
  );
}

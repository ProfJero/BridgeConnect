import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary-soft/60 to-background">
      <header className="mx-auto flex w-full max-w-md items-center justify-center px-4 pt-10 pb-6">
        <Link href="/" aria-label="BridgeConnect home">
          <Logo showTagline />
        </Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pb-12">
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          A Digital Bridge Initiative platform
        </p>
      </main>
    </div>
  );
}

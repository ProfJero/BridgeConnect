import { Download, LifeBuoy, LockKeyhole, Palette, ShieldAlert, UserPen } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { parseTheme, THEME_COOKIE } from "@/components/theme/theme";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccount } from "@/features/account/components/delete-account";
import { requireViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Settings", robots: noIndex };

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" description={`Signed in as ${viewer.email ?? viewer.profile.display_name}`} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette aria-hidden className="size-4" /> Appearance</CardTitle>
          <CardDescription>Choose light, dark, or follow your device.</CardDescription>
        </CardHeader>
        <CardContent><ThemeSwitcher initial={theme} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UserPen aria-hidden className="size-4" /> Profile & security</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/profile/edit"><UserPen aria-hidden /> Edit profile</Link></Button>
          <Button asChild variant="outline"><Link href="/reset-password"><LockKeyhole aria-hidden /> Change password</Link></Button>
          <Button asChild variant="outline"><Link href="/support"><LifeBuoy aria-hidden /> Help & support</Link></Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Download aria-hidden className="size-4" /> Your data</CardTitle>
          <CardDescription>
            Download everything BridgeConnect holds about you as a JSON file (Ghana Data Protection Act, 2012 — right of access).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline"><a href="/account/export" download><Download aria-hidden /> Download my data</a></Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive"><ShieldAlert aria-hidden className="size-4" /> Delete account</CardTitle>
          <CardDescription>Permanently remove your account. Owners must first transfer their organisations.</CardDescription>
        </CardHeader>
        <CardContent><DeleteAccount /></CardContent>
      </Card>
    </div>
  );
}

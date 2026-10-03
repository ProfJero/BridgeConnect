import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getCommunityOptions } from "@/features/locations/queries";
import { getViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  if (await getViewer()) redirect("/");
  const communities = await getCommunityOptions();
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Join your community</h1>
        <p className="text-sm text-muted-foreground">
          Discover trusted businesses, services, jobs and events near you.
        </p>
      </div>
      <SignUpForm communities={communities} />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

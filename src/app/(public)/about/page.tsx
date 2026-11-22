import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About BridgeConnect",
  description:
    "BridgeConnect by Digital Bridge Initiative connects residents with verified businesses, services, jobs, rides, rentals and emergency information.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 pb-6">
      <header className="flex flex-col items-center gap-3 pt-2 text-center">
        <Image src="/brand/bridgeconnect-logo.webp" alt="BridgeConnect — Connecting Communities. Empowering Lives. By Digital Bridge Initiative" width={300} height={302} priority className="h-auto w-60" />
      </header>
      <section className="space-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight">About BridgeConnect</h1>
        <p className="leading-relaxed text-muted-foreground">
          BridgeConnect is the digital home of our communities, built by <strong className="text-foreground">Digital Bridge Initiative (DBI)</strong>.
          Residents find verified businesses and organisations, order from local sellers, book services, request rides and deliveries,
          rent homes and shops, find jobs and events, and receive emergency alerts — organised by region, district and community.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Every business and organisation is reviewed by a DBI verification officer for its district before it can list products,
          services or jobs. Riders and drivers are verified before they can accept trips.
        </p>
      </section>
      <section id="privacy" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold">Privacy</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>We collect what you give us (name, community, posts, orders, bookings, trips, listings) to run the service. We never sell personal data.</li>
          <li>Phone numbers you enter on an order, booking, trip or enquiry are shared only with the business, rider or landlord handling it.</li>
          <li>Rider locations are used only to sort nearby requests and are never shown to other users.</li>
          <li>Verification documents and CVs are private and viewable only by the people who need them, through short-lived links.</li>
          <li>You can download all your data or delete your account at any time from <Link href="/settings" className="font-medium text-primary underline">Settings</Link>, in line with Ghana&apos;s Data Protection Act, 2012 (Act 843).</li>
        </ul>
      </section>
      <section id="terms" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold">Community terms</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Be respectful and truthful. Harassment, hate speech, scams and prohibited items are removed and may lead to suspension.</li>
          <li>Payments for orders, services, rides and rentals are agreed directly between you and the provider. Never share a mobile-money PIN or pay a deposit for a property you have not seen.</li>
          <li>Riders and drivers must hold the licences and insurance required by law. Report unsafe behaviour through the app.</li>
          <li>In an emergency call <a href="tel:112" className="font-semibold text-foreground underline">112</a>.</li>
        </ul>
      </section>
      <p className="text-center text-sm text-muted-foreground">
        Questions? <Link href="/support" className="font-medium text-primary underline">Contact DBI support</Link>.
      </p>
    </article>
  );
}

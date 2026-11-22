import type { Metadata } from "next";

import { appCssVars } from "@/config/brand";
import { displaySerif } from "@/lib/fonts";
import { AcceptInvite } from "./accept-invite";

export const metadata: Metadata = { title: "Invitación", robots: { index: false }, referrer: "no-referrer" };

export default function InvitacionPage() {
  return (
    <div style={appCssVars()} className={`${displaySerif.variable} min-h-screen bg-base text-ink`}>
      <AcceptInvite />
    </div>
  );
}

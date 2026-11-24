import { redirect } from "next/navigation";
import { appCssVars } from "@/config/brand";
import { displaySerif } from "@/lib/fonts";
import { requireProfile } from "@/lib/portal";
import { PortalSidebar } from "@/components/portal/sidebar";
import { isDeskRole } from "@/lib/staff/context";

// Reads the session + profile per request; never statically prerendered.
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  // Shared gym computers (and legacy admin logins, which act as desks) belong
  // in the staff desk: redirect before the old portal shell ever paints.
  if (isDeskRole(profile.role)) redirect("/escritorio");

  return (
    <div
      // Only the client portal is rebranded: the legacy coach screens hard-code
      // dark-theme colours and are being replaced by /escritorio.
      style={profile.role === "client" ? appCssVars() : undefined}
      className={`${displaySerif.variable} min-h-screen bg-base text-ink lg:flex`}
    >
      <PortalSidebar role={profile.role} userName={profile.full_name} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

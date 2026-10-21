import { requireProfile } from "@/lib/portal";
import { PortalSidebar } from "@/components/portal/sidebar";

// Reads the session + profile per request; never statically prerendered.
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <div className="min-h-screen lg:flex">
      <PortalSidebar role={profile.role} userName={profile.full_name} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

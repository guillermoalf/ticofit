import { redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { requireProfile } from "@/lib/portal";
import { PlaceholderScreen } from "@/components/portal/placeholder-screen";

export const dynamic = "force-dynamic";

export default async function EvidenciasPage() {
  const { profile } = await requireProfile();
  if (profile.role === "coach") redirect("/portal/clientes");

  return (
    <PlaceholderScreen
      kicker="Tu portal"
      title="Evidencias"
      desc="Tus fotos de progreso, subidas por tu coach después de cada medición."
      icon={Camera}
    />
  );
}

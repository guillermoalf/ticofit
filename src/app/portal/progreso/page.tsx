import { redirect } from "next/navigation";
import { LineChart } from "lucide-react";
import { requireProfile } from "@/lib/portal";
import { PlaceholderScreen } from "@/components/portal/placeholder-screen";

export const dynamic = "force-dynamic";

export default async function ProgresoPage() {
  const { profile } = await requireProfile();
  if (profile.role === "coach") redirect("/portal/clientes");

  return (
    <PlaceholderScreen
      kicker="Tu portal"
      title="Mi progreso"
      desc="Tu evolución en el tiempo: peso, porcentaje de músculo y de grasa."
      icon={LineChart}
    />
  );
}

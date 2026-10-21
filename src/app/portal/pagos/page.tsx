import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { requireProfile } from "@/lib/portal";
import { PlaceholderScreen } from "@/components/portal/placeholder-screen";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "coach") redirect("/portal/inicio");

  return (
    <PlaceholderScreen
      kicker="Coach"
      title="Pagos"
      desc="Mensualidades, vencimientos y estado de pago de cada cliente."
      icon={CreditCard}
    />
  );
}

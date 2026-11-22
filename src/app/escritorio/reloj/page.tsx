import { DeskSoon } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";

export default async function Page() {
  await requireStaff();
  return <DeskSoon title="Reloj" description="Acá vas a marcar tu entrada y salida con tu PIN." />;
}

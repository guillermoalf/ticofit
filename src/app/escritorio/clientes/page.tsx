import { DeskSoon } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";

export default async function Page() {
  await requireStaff("clients.read");
  return <DeskSoon title="Clientes" description="Acá vas a crear clientes, ver su expediente y registrar mediciones." />;
}

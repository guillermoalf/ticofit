import { DeskSoon } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";

export default async function Page() {
  await requireStaff("payments.review");
  return <DeskSoon title="Comprobantes" description="Acá van a llegar los comprobantes de SINPE que suben los clientes, para aprobarlos o rechazarlos." />;
}

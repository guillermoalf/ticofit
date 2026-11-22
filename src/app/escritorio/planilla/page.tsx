import { DeskSoon } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";

export default async function Page() {
  await requireStaff("payroll.manage");
  return <DeskSoon title="Planilla" description="Acá se van a calcular y aprobar las planillas." />;
}

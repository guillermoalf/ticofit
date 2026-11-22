import { DeskSoon } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";

export default async function Page() {
  await requireStaff();
  return <DeskSoon title="Salones y clases" description="Acá van a estar los salones y el calendario de clases de cada día." />;
}

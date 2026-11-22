import { DeskSoon } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";

export default async function Page() {
  await requireStaff("clients.read");
  return <DeskSoon title="Quién está al día" description="Acá vas a ver quién está al día, quién va atrasado y quién está suspendido." />;
}

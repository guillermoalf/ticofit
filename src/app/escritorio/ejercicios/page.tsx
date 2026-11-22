import { DeskSoon } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";

export default async function Page() {
  await requireStaff("routines.write");
  return <DeskSoon title="Ejercicios y rutinas" description="Acá van a estar la biblioteca de ejercicios y el armado de rutinas." />;
}

import { redirect } from "next/navigation";

/**
 * The class list now lives on the home page (#horario). Old links keep
 * working and carry their ?servicio= filter across.
 */
export default async function ClasesPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string | string[] }>;
}) {
  const { servicio } = await searchParams;
  const slug = typeof servicio === "string" ? servicio : undefined;
  redirect(slug ? `/?sede=cafe&servicio=${encodeURIComponent(slug)}#horario` : "/#horario");
}

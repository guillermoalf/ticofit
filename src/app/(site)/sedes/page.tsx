import { redirect } from "next/navigation";

/**
 * The sedes now live on the home page (the sede picker under the hero); old
 * links to /sedes land there with the same sede chosen.
 */
export default async function SedesPage({ searchParams }: { searchParams: Promise<{ sede?: string }> }) {
  const { sede } = await searchParams;
  redirect(`/?sede=${sede === "cafe" ? "cafe" : "bellavista"}#sedes`);
}

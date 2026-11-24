import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Short-lived links to receipt files. Call it only with paths of receipt rows
 * the caller already read through their own session: RLS decided who may see
 * them, and the service role only signs.
 */
export async function signReceiptUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await createAdminClient().storage.from("receipts").createSignedUrls(paths, 600);
  return Object.fromEntries((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : [])));
}

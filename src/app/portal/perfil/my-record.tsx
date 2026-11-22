import { RecordView } from "@/components/clients/record-view";
import { CLINICAL_GROUPS, PROFILE_GROUPS } from "@/lib/clients/fields";
import { createClient } from "@/lib/supabase/server";

/** The client's own file and current clinical history, read only. */
export async function MyRecord({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: file } = await supabase.from("clients").select("*").eq("user_id", userId).maybeSingle();
  if (!file) return null;
  const { data: history } = await supabase
    .from("client_clinical_history")
    .select("*")
    .eq("client_id", file.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Mi expediente</h2>
      <p className="mt-1 mb-4 text-sm text-muted">Si algo cambió, avisale a tu coach para que lo actualice.</p>
      <RecordView groups={PROFILE_GROUPS} record={file} />
      {history && (
        <div className="mt-5">
          <RecordView groups={CLINICAL_GROUPS} record={history} />
        </div>
      )}
    </section>
  );
}

/** What a form's server action returns to RecordForm. */
export type SaveResult =
  | { ok: true; message: string; warning?: string; href?: string }
  | { ok: false; error: string };

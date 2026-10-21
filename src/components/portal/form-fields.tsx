"use client";

import { useId } from "react";

/**
 * Portal form fields.
 *
 * Two mobile rules are baked in here and must not be undone:
 *
 * 1. `text-base` (16px). Anything smaller makes iOS Safari zoom the page on
 *    focus, and the reflow that follows lands the next tap on the wrong
 *    field — the "tapping Categoría opens Nombre" bug.
 * 2. Explicit id/htmlFor instead of wrapping the input in its <label>. A
 *    wrapping label makes the whole block one hit target, so a tap that
 *    arrives mid-reflow can focus a neighbouring field.
 */

const inputBase =
  "w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-primary disabled:opacity-60";

const labelBase = "mb-1.5 block text-sm text-muted";

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  placeholder,
  disabled,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "url";
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        className={inputBase}
      />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={`${inputBase} resize-none`}
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className={`${inputBase} appearance-none`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Free-text field with suggestions from values already in use. */
export function ComboField({
  label,
  value,
  onChange,
  options,
  required,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className={inputBase}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}

/** Checkbox row used by the intake goals list. */
export function CheckboxField({
  label,
  checked,
  onChange,
  description,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-base/60 px-4 py-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-5 shrink-0 accent-primary"
      />
      <label htmlFor={id} className="min-w-0 flex-1 text-sm text-ink">
        {label}
        {description && (
          <span className="mt-0.5 block text-xs text-muted-2">{description}</span>
        )}
      </label>
    </div>
  );
}

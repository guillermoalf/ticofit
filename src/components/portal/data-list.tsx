"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Ban, Check, Filter, Loader2, Search, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DataList — the reusable ServiceNow-style list every portal screen builds on.
 *
 * Mobile-first: the toolbar is a single row — search, a funnel icon and a gear
 * icon. Every filter lives inside the funnel popover and every optional column
 * inside the gear popover, so a fresh screen shows only the handful of columns
 * that fit a phone and the coach opts into the rest.
 *
 * Props:
 * - rows       Data already fetched/authorized by the caller.
 * - rowKey     Stable id per row.
 * - columns    DataListColumn<T>[]: key, header, align?, render?(row),
 *              searchValue?(row), hiddenByDefault?, locked?. Without render()
 *              the cell shows String(row[key]). The search input only appears
 *              when at least one column provides searchValue, and searches
 *              those columns. `hiddenByDefault` keeps a column out of the
 *              initial view (still offered in the gear popover); `locked`
 *              pins a column so it can never be hidden.
 * - filters?   DataListFilter<T>[]: key, label, options, getValue(row).
 *              Each renders inside the funnel popover as a chip group with
 *              option counts plus a ServiceNow-style include/exclude toggle —
 *              "Mostrar" keeps matching rows, "Excluir" filters them out.
 * - predicate? Extra host-owned filtering (e.g. a date range) applied on top
 *              of the built-in search and chip filters.
 * - extraFilters?      Host-owned controls rendered at the top of the funnel
 *                      popover; pair with `predicate`.
 * - extraFilterCount?  How many of those host filters are active, so the
 *                      funnel badge stays accurate.
 * - onResetExtraFilters?  Called by "Limpiar filtros" so host-owned controls
 *                      clear alongside the built-in ones.
 * - summary?           Rendered above the table with the filtered rows, for
 *                      screens that show totals over the current selection.
 * - searchPlaceholder? Placeholder for the search input.
 * - emptyMessage?      Shown when no row survives search/filters.
 * - onRowClick?(row)   Makes rows interactive (e.g. push a detail route).
 * - pageSize?          Rows per page (default 15). Page controls render only
 *                      when the filtered set exceeds one page.
 *
 * Status pills: render <StatusPill tone="green|amber|red|violet|neutral">
 * inside a column's render() for the standard colored pill.
 */

export type DataListColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  render?: (row: T) => React.ReactNode;
  searchValue?: (row: T) => string;
  /** Hidden until the coach enables it from the gear popover. */
  hiddenByDefault?: boolean;
  /** Always visible — never offered in the gear popover. */
  locked?: boolean;
};

export type DataListFilter<T> = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  getValue: (row: T) => string;
};

export type PillTone = "green" | "amber" | "red" | "violet" | "neutral";

const PILL_TONES: Record<PillTone, string> = {
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  red: "border-red-400/30 bg-red-400/10 text-red-300",
  violet: "border-primary/40 bg-primary/10 text-violet-300",
  neutral: "border-border-strong bg-surface-2 text-muted",
};

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: PillTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

type FilterMode = "in" | "out";
type FilterState = Record<string, { value: string; mode: FilterMode } | undefined>;

const ALIGN: Record<NonNullable<DataListColumn<never>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary/60 bg-primary/10 text-ink"
          : "border-border text-muted hover:border-border-strong hover:text-ink",
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("tabular-nums", active ? "text-muted" : "text-muted-2")}>
          {count}
        </span>
      )}
    </button>
  );
}

/** Toolbar icon button with an optional count badge (funnel / gear). */
function ToolbarButton({
  label,
  badge,
  badgeTone = "primary",
  active,
  onClick,
  children,
}: {
  label: string;
  badge?: number;
  /** primary = active filters; muted = columns available but hidden. */
  badgeTone?: "primary" | "muted";
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={active}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        active
          ? "border-primary/60 bg-primary/10 text-ink"
          : "border-border text-muted hover:border-border-strong hover:text-ink",
      )}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
            badgeTone === "primary"
              ? "bg-primary text-white"
              : "bg-surface-2 text-muted",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/** Popover anchored under the toolbar, closed by Escape or an outside click. */
function Popover({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 z-20 cursor-default"
      />
      <div
        role="dialog"
        aria-label={title}
        className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-glow"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1 text-muted-2 transition-colors hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">{children}</div>
        {footer && (
          <div className="border-t border-border px-4 py-2.5">{footer}</div>
        )}
      </div>
    </>
  );
}

function buildPageNumbers(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (page > 4) pages.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) {
    pages.push(i);
  }
  if (page < pageCount - 3) pages.push("…");
  pages.push(pageCount);
  return pages;
}

export function DataList<T>({
  rows,
  columns,
  rowKey,
  filters = [],
  predicate,
  extraFilters,
  extraFilterCount = 0,
  onResetExtraFilters,
  summary,
  searchPlaceholder = "Buscar…",
  emptyMessage = "No hay resultados que coincidan.",
  onRowClick,
  pageSize = 15,
}: {
  rows: T[];
  columns: DataListColumn<T>[];
  rowKey: (row: T) => string;
  filters?: DataListFilter<T>[];
  predicate?: (row: T) => boolean;
  extraFilters?: React.ReactNode;
  extraFilterCount?: number;
  onResetExtraFilters?: () => void;
  summary?: (rows: T[]) => React.ReactNode;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [filterState, setFilterState] = useState<FilterState>({});
  const [page, setPage] = useState(1);
  const [openPanel, setOpenPanel] = useState<"filters" | "columns" | null>(null);
  // Opening a row is a server round-trip that can take seconds on a phone.
  // Without this the coach taps again and again on a list that looks dead.
  const [navPending, startNav] = useTransition();

  // Optional columns the coach has switched on/off. Keyed by column key so a
  // column list that changes shape (e.g. new categories) keeps its choices.
  const [columnOverrides, setColumnOverrides] = useState<Record<string, boolean>>(
    {},
  );

  const searchColumns = columns.filter((c) => c.searchValue);
  const optionalColumns = columns.filter((c) => !c.locked);

  function isVisible(col: DataListColumn<T>): boolean {
    if (col.locked) return true;
    return columnOverrides[col.key] ?? !col.hiddenByDefault;
  }

  const visibleColumns = columns.filter(isVisible);
  const hiddenCount = optionalColumns.length - visibleColumns.filter((c) => !c.locked).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searchable = columns.filter((c) => c.searchValue);
    return rows.filter((row) => {
      if (predicate && !predicate(row)) return false;
      for (const f of filters) {
        const sel = filterState[f.key];
        if (!sel) continue;
        const matches = f.getValue(row) === sel.value;
        if (sel.mode === "in" ? !matches : matches) return false;
      }
      if (q) {
        const hit = searchable.some((c) =>
          c.searchValue!(row).toLowerCase().includes(q),
        );
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, columns, filters, predicate, query, filterState]);

  // A host filter (or a shrinking data set) can strand the coach past the last
  // page; snap back so the table never renders empty with rows available.
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);
  const showPagination = filtered.length > pageSize;

  const activeFilterCount =
    filters.filter((f) => filterState[f.key]).length + extraFilterCount;

  // Clears the chip filters and hands control back to the host so its own
  // controls (a date range, say) reset in the same click.
  function resetFilters() {
    setFilterState({});
    setQuery("");
    onResetExtraFilters?.();
    setPage(1);
  }

  function selectFilter(key: string, value: string | null) {
    setFilterState((s) => ({
      ...s,
      [key]: value === null ? undefined : { value, mode: s[key]?.mode ?? "in" },
    }));
    setPage(1);
  }

  function toggleFilterMode(key: string) {
    setFilterState((s) => {
      const sel = s[key];
      if (!sel) return s;
      return { ...s, [key]: { ...sel, mode: sel.mode === "in" ? "out" : "in" } };
    });
    setPage(1);
  }

  const hasToolbar =
    searchColumns.length > 0 ||
    filters.length > 0 ||
    Boolean(extraFilters) ||
    optionalColumns.length > 1;

  return (
    // No overflow-hidden here: the toolbar popovers hang below the card and
    // would be clipped. The table block below does its own rounding instead.
    <div className="relative rounded-card border border-border bg-surface/60">
      {hasToolbar && (
        <div className="relative flex items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          {searchColumns.length > 0 && (
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-full border border-border bg-base/60 py-2 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-primary"
              />
            </label>
          )}

          <div className="ml-auto flex items-center gap-2">
            {(filters.length > 0 || extraFilters) && (
              <ToolbarButton
                label="Filtros"
                badge={activeFilterCount}
                active={openPanel === "filters"}
                onClick={() =>
                  setOpenPanel((p) => (p === "filters" ? null : "filters"))
                }
              >
                <Filter size={16} />
              </ToolbarButton>
            )}
            {optionalColumns.length > 1 && (
              <ToolbarButton
                label="Columnas"
                badge={hiddenCount}
                badgeTone="muted"
                active={openPanel === "columns"}
                onClick={() =>
                  setOpenPanel((p) => (p === "columns" ? null : "columns"))
                }
              >
                <Settings2 size={16} />
              </ToolbarButton>
            )}
          </div>

          {openPanel === "filters" && (
            <Popover
              title="Filtros"
              onClose={() => setOpenPanel(null)}
              footer={
                activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs text-muted transition-colors hover:text-ink"
                  >
                    Limpiar filtros
                  </button>
                ) : (
                  <span className="text-xs text-muted-2">Sin filtros activos</span>
                )
              }
            >
              <div className="flex flex-col gap-4">
                {extraFilters}

                {filters.map((f) => {
                  const sel = filterState[f.key];
                  return (
                    <div key={f.key} className="flex flex-col gap-2">
                      <span className="text-xs text-muted-2">{f.label}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip active={!sel} onClick={() => selectFilter(f.key, null)}>
                          Todos
                        </Chip>
                        {f.options.map((o) => (
                          <Chip
                            key={o.value}
                            active={sel?.value === o.value}
                            count={rows.filter((r) => f.getValue(r) === o.value).length}
                            onClick={() => selectFilter(f.key, o.value)}
                          >
                            {o.label}
                          </Chip>
                        ))}
                        {sel && (
                          <button
                            type="button"
                            onClick={() => toggleFilterMode(f.key)}
                            title={
                              sel.mode === "in"
                                ? "Mostrando coincidencias — clic para excluirlas"
                                : "Excluyendo coincidencias — clic para mostrarlas"
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                              sel.mode === "in"
                                ? "border-border-strong text-muted hover:text-ink"
                                : "border-red-400/40 bg-red-400/10 text-red-300",
                            )}
                          >
                            {sel.mode === "in" ? <Check size={12} /> : <Ban size={12} />}
                            {sel.mode === "in" ? "Mostrar" : "Excluir"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Popover>
          )}

          {openPanel === "columns" && (
            <Popover title="Columnas" onClose={() => setOpenPanel(null)}>
              <ul className="flex flex-col">
                {optionalColumns.map((col) => {
                  const shown = isVisible(col);
                  // Never let the coach hide the last column.
                  const isLast = shown && visibleColumns.length === 1;
                  return (
                    <li key={col.key}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-surface-hover",
                          isLast && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={shown}
                          disabled={isLast}
                          onChange={(e) =>
                            setColumnOverrides((s) => ({
                              ...s,
                              [col.key]: e.target.checked,
                            }))
                          }
                          className="size-4 shrink-0 accent-primary"
                        />
                        <span className={shown ? "text-ink" : "text-muted"}>
                          {col.header || "Acciones"}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Popover>
          )}
        </div>
      )}

      {summary && (
        <div className="border-b border-border px-3 py-3 sm:px-4">
          {summary(filtered)}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div
          className={cn(
            "overflow-x-auto",
            hasToolbar || summary ? "rounded-b-card" : "rounded-card",
          )}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap border-b border-border bg-surface-2/60 px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted sm:px-4",
                      ALIGN[col.align ?? "left"],
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={
                    onRowClick ? () => startNav(() => onRowClick(row)) : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (e) =>
                          e.key === "Enter" && startNav(() => onRowClick(row))
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    "transition-colors [&:last-child>td]:border-b-0",
                    onRowClick &&
                      "cursor-pointer hover:bg-surface-hover focus-visible:bg-surface-hover",
                  )}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "border-b border-border px-3 py-3 align-middle sm:px-4",
                        ALIGN[col.align ?? "left"],
                      )}
                    >
                      {col.render ? col.render(row) : defaultCell(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {navPending && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-card bg-base/50">
          <Loader2 size={22} className="animate-spin text-primary" />
        </div>
      )}

      {showPagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
          <span className="text-xs text-muted">
            Mostrando{" "}
            <span className="font-medium tabular-nums text-ink">
              {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, filtered.length)}
            </span>{" "}
            de <span className="font-medium tabular-nums text-ink">{filtered.length}</span>
          </span>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current <= 1}
              className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹ Anterior
            </button>
            {buildPageNumbers(current, pageCount).map((p, i) =>
              p === "…" ? (
                <span key={`e-${i}`} className="select-none px-1 text-xs text-muted-2">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === current ? "page" : undefined}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-lg border text-xs tabular-nums transition-colors",
                    p === current
                      ? "border-primary/60 bg-primary/10 text-ink"
                      : "border-border text-muted hover:border-border-strong hover:text-ink",
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount}
              className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function defaultCell<T>(row: T, key: string): React.ReactNode {
  const value = (row as Record<string, unknown>)[key];
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}

"use client";

import { useEffect, useRef, useState } from "react";

import { formatDate, formatNumber } from "@/lib/clients/body";

export type Point = { date: string; value: number };

const HEIGHT = 220;
const PAD = { top: 22, right: 16, bottom: 28, left: 44 };

/**
 * One series over time: 2px line, crosshair + tooltip (pointer or arrow keys),
 * the target as a dashed reference and a table behind a toggle. Hand-rolled
 * SVG because it is the only chart in the app (PROGRESS.md D3).
 */
export function LineChart({
  points,
  unit,
  label,
  target,
}: {
  points: Point[];
  unit: string;
  label: string;
  target?: number | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const times = points.map((p) => Date.parse(p.date));
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const all = points.map((p) => p.value).concat(target ?? []);
  const low = Math.min(...all);
  const high = Math.max(...all);
  const pad = Math.max((high - low) * 0.18, 1);
  const min = Math.max(0, low - pad);
  const max = high + pad;

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (t1 === t0 ? plotW / 2 : ((times[i] - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;

  const nearest = (clientX: number, left: number) => {
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(x(i) - (clientX - left)) < Math.abs(x(best) - (clientX - left))) best = i;
    }
    setActive(best);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const from = active ?? points.length - 1;
    setActive(Math.max(0, Math.min(points.length - 1, from + (e.key === "ArrowRight" ? 1 : -1))));
  };

  // A shorter series after switching metrics can leave `active` out of range.
  const hover = active !== null && active < points.length ? active : null;

  return (
    <figure>
      <div
        ref={box}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Usá las flechas para recorrer las mediciones.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="relative touch-pan-y"
        style={{ height: HEIGHT }}
        onPointerMove={(e) => nearest(e.clientX, e.currentTarget.getBoundingClientRect().left)}
        onPointerDown={(e) => nearest(e.clientX, e.currentTarget.getBoundingClientRect().left)}
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden="true" className="block overflow-visible">
            {[min, (min + max) / 2, max].map((v, i) => (
              <g key={i}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border)" />
                <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
                  {formatNumber(Math.round(v * 10) / 10)}
                </text>
              </g>
            ))}

            {target !== null && target !== undefined && (
              <g>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(target)}
                  y2={y(target)}
                  stroke="var(--muted)"
                  strokeDasharray="5 4"
                />
                <text x={PAD.left + 4} y={y(target) - 6} fontSize="12" fill="var(--muted)">
                  Objetivo {formatNumber(target)} {unit}
                </text>
              </g>
            )}

            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--border-strong)" />
            )}

            <polyline
              points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <circle
                key={p.date}
                cx={x(i)}
                cy={y(p.value)}
                r={i === hover ? 6 : 4.5}
                fill="var(--ink)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            ))}

            <text x={x(0)} y={HEIGHT - 6} textAnchor={points.length === 1 ? "middle" : "start"} fontSize="12" fill="var(--muted)">
              {formatDate(points[0].date)}
            </text>
            {points.length > 1 && (
              <text x={x(points.length - 1)} y={HEIGHT - 6} textAnchor="end" fontSize="12" fill="var(--muted)">
                {formatDate(points[points.length - 1].date)}
              </text>
            )}
          </svg>
        )}

        {hover !== null && width > 0 && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-center text-xs whitespace-nowrap"
            style={{ left: Math.max(52, Math.min(width - 52, x(hover))) }}
          >
            <strong className="text-sm">
              {formatNumber(points[hover].value)} {unit}
            </strong>
            <span className="ml-1.5 text-muted">{formatDate(points[hover].date)}</span>
          </div>
        )}
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer py-1 text-muted">Ver los números</summary>
        <table className="mt-1 w-full max-w-xs tabular-nums">
          <caption className="sr-only">{label}</caption>
          <tbody>
            {points.map((p) => (
              <tr key={p.date} className="border-b border-border">
                <th scope="row" className="py-1.5 text-left font-normal text-muted">
                  {formatDate(p.date)}
                </th>
                <td className="py-1.5 text-right">
                  {formatNumber(p.value)} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

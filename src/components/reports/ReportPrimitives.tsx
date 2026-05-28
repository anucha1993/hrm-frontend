"use client";

import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "info" | "warning";
}) {
  const toneClass = {
    default: "border-slate-200 bg-white",
    positive: "border-emerald-200 bg-emerald-50",
    negative: "border-rose-200 bg-rose-50",
    info: "border-sky-200 bg-sky-50",
    warning: "border-amber-200 bg-amber-50",
  }[tone];
  return (
    <div className={`rounded-xl border ${toneClass} p-4 shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function BarChart({
  data,
  labelKey,
  valueKey,
  formatter,
  color = "bg-indigo-500",
  height = 220,
}: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  formatter?: (n: number) => string;
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey] ?? 0)));
  const fmt = formatter ?? ((n) => n.toLocaleString());
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        ไม่มีข้อมูล
      </div>
    );
  }
  return (
    <div className="space-y-2" style={{ minHeight: height }}>
      {data.map((d, i) => {
        const v = Number(d[valueKey] ?? 0);
        const pct = (v / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-32 truncate text-slate-600" title={String(d[labelKey])}>
              {String(d[labelKey])}
            </div>
            <div className="relative flex-1 h-6 rounded bg-slate-100 overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${color} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-28 text-right font-medium tabular-nums text-slate-700">
              {fmt(v)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LineChart({
  data,
  labelKey,
  valueKey,
  formatter,
  color = "#6366f1",
  height = 200,
}: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  formatter?: (n: number) => string;
  color?: string;
  height?: number;
}) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        ไม่มีข้อมูล
      </div>
    );
  }
  const values = data.map((d) => Number(d[valueKey] ?? 0));
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const w = 800;
  const h = height;
  const pad = 24;
  const step = (w - pad * 2) / Math.max(1, data.length - 1);
  const points = values
    .map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const fmt = formatter ?? ((n) => n.toLocaleString());

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 600 }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
        {values.map((v, i) => {
          const x = pad + i * step;
          const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
        })}
        {data.map((d, i) => {
          const x = pad + i * step;
          return (
            <text
              key={i}
              x={x}
              y={h - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
            >
              {String(d[labelKey])}
            </text>
          );
        })}
        <text x={pad} y={pad - 8} fontSize="10" fill="#94a3b8">
          สูงสุด: {fmt(max)}
        </text>
      </svg>
    </div>
  );
}

export function ReportSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function formatTHB(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8100/api";

export async function downloadReport(path: string, filename: string): Promise<void> {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("cyc_hrm_token");
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`ดาวน์โหลดไม่สำเร็จ (${res.status})`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

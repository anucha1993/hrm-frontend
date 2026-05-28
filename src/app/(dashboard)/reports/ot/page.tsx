"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw, Search } from "lucide-react";
import Topbar from "@/components/Topbar";
import { apiFetch } from "@/lib/api";
import {
  ReportSection,
  StatCard,
  downloadReport,
  formatNumber,
  formatTHB,
} from "@/components/reports/ReportPrimitives";

type EmpRow = {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department: string | null;
  sessions: number;
  hours: number;
  amount: number;
};

type Data = {
  range: { from: string; to: string };
  totals: { records: number; total_hours: number; total_amount: number };
  by_employee: EmpRow[];
};

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

type SortKey = "employee_code" | "sessions" | "hours" | "amount";

export default function ReportOtPage() {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("hours");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<{ data: Data }>(
        `/reports/ot/summary?from=${from}&to=${to}`
      );
      setData(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const filtered = data.by_employee.filter((r) =>
      !q
        ? true
        : r.employee_code.toLowerCase().includes(q.toLowerCase()) ||
          r.employee_name.toLowerCase().includes(q.toLowerCase()) ||
          (r.department ?? "").toLowerCase().includes(q.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av;
      }
      return dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, q, sort, dir]);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(k);
      setDir("desc");
    }
  };

  const SortTh = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`cursor-pointer select-none px-3 py-2 ${align === "right" ? "text-right" : "text-left"} hover:bg-slate-100`}
    >
      {label} {sort === k ? (dir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <>
      <Topbar title="รายงาน OT" />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600">ตั้งแต่</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">ถึง</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            ค้นหา
          </button>
          <button
            onClick={() => downloadReport(`/reports/ot/export?from=${from}&to=${to}`, `ot-${from}-${to}.csv`)}
            className="inline-flex items-center gap-2 rounded border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ/รหัส/แผนก..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded border border-slate-300 pl-8 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading || !data ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {loading ? "กำลังโหลด..." : "ไม่มีข้อมูล"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard label="รายการ OT" value={formatNumber(data.totals.records)} />
              <StatCard
                label="ชั่วโมงรวม"
                value={`${formatNumber(data.totals.total_hours, 2)} ชม.`}
                tone="info"
              />
              <StatCard
                label="ค่า OT รวม"
                value={formatTHB(data.totals.total_amount)}
                tone="warning"
              />
            </div>

            <ReportSection title="รายชื่อพนักงาน" description={`${rows.length} คน`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <SortTh k="employee_code" label="รหัส" />
                      <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
                      <th className="px-3 py-2 text-left">แผนก</th>
                      <SortTh k="sessions" label="ครั้ง" align="right" />
                      <SortTh k="hours" label="ชั่วโมง" align="right" />
                      <SortTh k="amount" label="ค่า OT" align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                          ไม่พบข้อมูล
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.employee_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs">{r.employee_code}</td>
                          <td className="px-3 py-2">{r.employee_name}</td>
                          <td className="px-3 py-2 text-slate-600">{r.department ?? "-"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.sessions}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatNumber(r.hours, 2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-amber-700">
                            {formatTHB(r.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ReportSection>
          </>
        )}
      </div>
    </>
  );
}

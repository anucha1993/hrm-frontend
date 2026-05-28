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
} from "@/components/reports/ReportPrimitives";

type EmpRow = {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department: string | null;
  requests: number;
  total_days: number;
  by_type: Record<string, number>;
};

type Data = {
  range: { from: string; to: string };
  totals: { requests: number; total_days: number; employees: number };
  leave_types: string[];
  by_type: Array<{ leave_type: string; count: number; total_days: number }>;
  by_employee: EmpRow[];
};

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear(), 11, 31);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default function ReportLeavePage() {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<{ data: Data }>(
        `/reports/leave/summary?from=${from}&to=${to}`
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
    return data.by_employee.filter((r) =>
      !q
        ? true
        : r.employee_code.toLowerCase().includes(q.toLowerCase()) ||
          r.employee_name.toLowerCase().includes(q.toLowerCase()) ||
          (r.department ?? "").toLowerCase().includes(q.toLowerCase())
    );
  }, [data, q]);

  return (
    <>
      <Topbar title="รายงานการลา" />
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
            onClick={() => downloadReport(`/reports/leave/export?from=${from}&to=${to}`, `leave-${from}-${to}.csv`)}
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="ใบลาที่อนุมัติ" value={formatNumber(data.totals.requests)} />
              <StatCard
                label="วันลารวม"
                value={`${data.totals.total_days} วัน`}
                tone="info"
              />
              <StatCard
                label="พนักงานที่ลา"
                value={formatNumber(data.totals.employees)}
              />
            </div>

            <ReportSection
              title="รายชื่อพนักงาน"
              description={`${rows.length} คน — แสดงวันลาแยกตามประเภท`}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">รหัส</th>
                      <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
                      <th className="px-3 py-2 text-left">แผนก</th>
                      <th className="px-3 py-2 text-right">จำนวนใบ</th>
                      {data.leave_types.map((t) => (
                        <th key={t} className="px-3 py-2 text-right whitespace-nowrap">
                          {t}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-bold">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={5 + data.leave_types.length} className="px-3 py-6 text-center text-slate-400">
                          ไม่พบข้อมูล
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.employee_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs">{r.employee_code}</td>
                          <td className="px-3 py-2">{r.employee_name}</td>
                          <td className="px-3 py-2 text-slate-600">{r.department ?? "-"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.requests}</td>
                          {data.leave_types.map((t) => (
                            <td key={t} className="px-3 py-2 text-right tabular-nums">
                              {r.by_type[t] ? r.by_type[t] : "-"}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-indigo-700">
                            {r.total_days}
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

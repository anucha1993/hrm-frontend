"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw, Search } from "lucide-react";
import Topbar from "@/components/Topbar";
import { apiFetch, getToken } from "@/lib/api";
import {
  ReportSection,
  StatCard,
  formatNumber,
} from "@/components/reports/ReportPrimitives";

type EmpRow = {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department: string | null;
  present_days: number;
  absent_days: number;
  late_days: number;
  late_minutes: number;
  attendance_rate: number;
};

type Data = {
  range: { from: string; to: string; days: number };
  totals: {
    employees: number;
    present_days: number;
    late_days: number;
    late_minutes: number;
  };
  daily_trend: Array<{ date: string; present: number; late_count: number; late_minutes: number }>;
  by_employee: EmpRow[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8100/api";

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

type SortKey = "employee_code" | "department" | "present_days" | "late_days" | "late_minutes" | "attendance_rate";

export default function ReportAttendancePage() {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("late_days");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<{ data: Data }>(
        `/reports/attendance/summary?from=${from}&to=${to}`
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
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av;
      }
      return dir === "asc"
        ? String(av ?? "").localeCompare(String(bv ?? ""))
        : String(bv ?? "").localeCompare(String(av ?? ""));
    });
    return sorted;
  }, [data, q, sort, dir]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir("desc");
    }
  };

  const handleExport = () => {
    const token = getToken();
    fetch(`${API_URL}/reports/attendance/export?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `attendance-${from}-${to}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
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
      <Topbar title="รายงานเวลางาน" />
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
          <button
            onClick={handleExport}
            disabled={!data}
            className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
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
              <StatCard label="พนักงาน" value={data.totals.employees.toLocaleString()} />
              <StatCard
                label="วันมาทำงานรวม"
                value={formatNumber(data.totals.present_days)}
                tone="positive"
              />
              <StatCard
                label="ครั้งที่สาย"
                value={formatNumber(data.totals.late_days)}
                tone="warning"
              />
              <StatCard
                label="นาทีสายสะสม"
                value={formatNumber(data.totals.late_minutes)}
                tone="negative"
                hint={`${data.range.days} วัน`}
              />
            </div>

            <ReportSection
              title="รายชื่อพนักงาน"
              description={`${rows.length} คน — คลิกหัวคอลัมน์เพื่อจัดเรียง`}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <SortTh k="employee_code" label="รหัส" />
                      <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
                      <SortTh k="department" label="แผนก" />
                      <SortTh k="present_days" label="มาทำงาน" align="right" />
                      <th className="px-3 py-2 text-right">ขาด</th>
                      <SortTh k="late_days" label="สาย (ครั้ง)" align="right" />
                      <SortTh k="late_minutes" label="นาทีสาย" align="right" />
                      <SortTh k="attendance_rate" label="อัตรา (%)" align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                          ไม่พบข้อมูล
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.employee_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs">{r.employee_code}</td>
                          <td className="px-3 py-2">{r.employee_name}</td>
                          <td className="px-3 py-2 text-slate-600">{r.department ?? "-"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                            {r.present_days}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                            {r.absent_days}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                            {r.late_days}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-rose-600">
                            {r.late_minutes}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">
                            <span
                              className={
                                r.attendance_rate >= 90
                                  ? "text-emerald-700"
                                  : r.attendance_rate >= 70
                                    ? "text-amber-700"
                                    : "text-rose-600"
                              }
                            >
                              {r.attendance_rate.toFixed(1)}%
                            </span>
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

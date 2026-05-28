"use client";

import { useEffect, useMemo, useState } from "react";
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
  employment_type: string | null;
  status: string;
  hire_date: string | null;
  resign_date: string | null;
  tenure_years: number;
};

type Data = {
  totals: {
    total: number;
    active: number;
    resigned: number;
    avg_tenure_years: number;
  };
  by_employee: EmpRow[];
};

const STATUS_LABEL: Record<string, string> = {
  active: "ทำงานอยู่",
  resigned: "ลาออก",
  terminated: "เลิกจ้าง",
  suspended: "พักงาน",
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  resigned: "bg-slate-100 text-slate-600",
  terminated: "bg-rose-100 text-rose-700",
  suspended: "bg-amber-100 text-amber-700",
};

type SortKey = "employee_code" | "department" | "tenure_years" | "hire_date" | "status";

export default function ReportEmployeesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [sort, setSort] = useState<SortKey>("employee_code");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<{ data: Data }>("/reports/employees/summary");
      setData(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const filtered = data.by_employee.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const needle = q.toLowerCase();
      return (
        r.employee_code.toLowerCase().includes(needle) ||
        r.employee_name.toLowerCase().includes(needle) ||
        (r.department ?? "").toLowerCase().includes(needle) ||
        (r.employment_type ?? "").toLowerCase().includes(needle)
      );
    });
    return [...filtered].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av;
      }
      return dir === "asc"
        ? String(av ?? "").localeCompare(String(bv ?? ""))
        : String(bv ?? "").localeCompare(String(av ?? ""));
    });
  }, [data, q, statusFilter, sort, dir]);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(k);
      setDir("asc");
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
      <Topbar title="รายงานพนักงาน" />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600">สถานะ</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">ทั้งหมด</option>
              <option value="active">ทำงานอยู่</option>
              <option value="resigned">ลาออก</option>
              <option value="terminated">เลิกจ้าง</option>
              <option value="suspended">พักงาน</option>
            </select>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            รีเฟรช
          </button>
          <button
            onClick={() => downloadReport(`/reports/employees/export`, `employees-${new Date().toISOString().slice(0,10)}.csv`)}
            className="inline-flex items-center gap-2 rounded border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ/รหัส/แผนก/ประเภทการจ้าง..."
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
              <StatCard label="พนักงานทั้งหมด" value={formatNumber(data.totals.total)} />
              <StatCard
                label="ทำงานอยู่"
                value={formatNumber(data.totals.active)}
                tone="positive"
              />
              <StatCard
                label="ลาออก/เลิกจ้าง"
                value={formatNumber(data.totals.resigned)}
                tone="negative"
              />
              <StatCard
                label="อายุงานเฉลี่ย"
                value={`${data.totals.avg_tenure_years} ปี`}
                tone="info"
              />
            </div>

            <ReportSection title="รายชื่อพนักงาน" description={`${rows.length} คน`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <SortTh k="employee_code" label="รหัส" />
                      <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
                      <SortTh k="department" label="แผนก" />
                      <th className="px-3 py-2 text-left">ประเภทการจ้าง</th>
                      <SortTh k="hire_date" label="วันเริ่มงาน" />
                      <SortTh k="tenure_years" label="อายุงาน (ปี)" align="right" />
                      <SortTh k="status" label="สถานะ" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                          ไม่พบข้อมูล
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.employee_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs">{r.employee_code}</td>
                          <td className="px-3 py-2">{r.employee_name}</td>
                          <td className="px-3 py-2 text-slate-600">{r.department ?? "-"}</td>
                          <td className="px-3 py-2 text-slate-600">{r.employment_type ?? "-"}</td>
                          <td className="px-3 py-2 text-slate-600 tabular-nums">
                            {r.hire_date ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {r.tenure_years}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {STATUS_LABEL[r.status] ?? r.status}
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw, Search } from "lucide-react";
import Topbar from "@/components/Topbar";
import { apiFetch, getToken } from "@/lib/api";
import {
  ReportSection,
  StatCard,
  formatTHB,
} from "@/components/reports/ReportPrimitives";

type Period = {
  id: number;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

type Totals = {
  employees: number;
  base_pay: number;
  ot_pay: number;
  allowances_total: number;
  bonus_total: number;
  gross_pay: number;
  deductions_total: number;
  late_deduction: number;
  absent_deduction: number;
  ssf_employee: number;
  tax: number;
  net_pay: number;
};

type DeptRow = {
  department: string;
  employees: number;
  gross_pay: number;
  net_pay: number;
  deductions: number;
};

type EmpRow = {
  slip_id: number;
  employee_code: string;
  employee_name: string;
  department: string | null;
  base_salary: number;
  ot_pay: number;
  bonus_total: number;
  late_deduction: number;
  absent_deduction: number;
  other_deductions: number;
  deductions_total: number;
  tax: number;
  ssf: number;
  gross_pay: number;
  net_pay: number;
  status: string;
};

type SummaryData = {
  period: Period;
  totals: Totals;
  by_department: DeptRow[];
  by_employee: EmpRow[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8100/api";

export default function ReportPayrollPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    apiFetch<{ data: Period[] }>("/reports/payroll/periods")
      .then((r) => {
        setPeriods(r.data);
        if (r.data.length > 0) setPeriodId(r.data[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const load = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<{ data: SummaryData }>(
        `/reports/payroll/summary?period_id=${periodId}`
      );
      setData(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    if (periodId) load();
  }, [periodId, load]);

  const handleExport = () => {
    if (!periodId) return;
    const token = getToken();
    const url = `${API_URL}/reports/payroll/export?period_id=${periodId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `payroll-${data?.period.code ?? periodId}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  return (
    <>
      <Topbar title="รายงานเงินเดือน" />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              งวดจ่ายเงิน
            </label>
            <select
              className="mt-1 min-w-[240px] rounded border border-slate-300 px-3 py-2 text-sm"
              value={periodId ?? ""}
              onChange={(e) => setPeriodId(Number(e.target.value))}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — {p.status}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={load}
            disabled={loading || !periodId}
            className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            รีเฟรช
          </button>
          <button
            onClick={handleExport}
            disabled={!data}
            className="ml-auto inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            ดาวน์โหลด CSV
          </button>
        </div>

        {error ? (
          <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading || !data ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {loading ? "กำลังโหลด..." : "ยังไม่มีข้อมูล"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              <StatCard
                label="จำนวนพนักงาน"
                value={data.totals.employees.toLocaleString()}
                hint="ในงวดนี้"
              />
              <StatCard
                label="รายได้รวม (Gross)"
                value={formatTHB(data.totals.gross_pay)}
                tone="info"
              />
              <StatCard
                label="หักรวม"
                value={formatTHB(data.totals.deductions_total)}
                tone="negative"
              />
              <StatCard
                label="จ่ายสุทธิ (Net)"
                value={formatTHB(data.totals.net_pay)}
                tone="positive"
              />
              <StatCard
                label="เงินเดือนฐาน"
                value={formatTHB(data.totals.base_pay)}
              />
              <StatCard label="OT" value={formatTHB(data.totals.ot_pay)} />
              <StatCard
                label="เบี้ย/โบนัส"
                value={formatTHB(
                  data.totals.allowances_total + data.totals.bonus_total
                )}
              />
              <StatCard
                label="ภาษี + SSF"
                value={formatTHB(data.totals.tax + data.totals.ssf_employee)}
                tone="warning"
              />
            </div>

            <ReportSection
              title="รายชื่อพนักงาน"
              description={`${data.by_employee.length} คน`}
              action={
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหา..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full rounded border border-slate-300 pl-8 pr-3 py-1.5 text-sm"
                  />
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">รหัส</th>
                      <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
                      <th className="px-3 py-2 text-left">แผนก</th>
                      <th className="px-3 py-2 text-right">เงินเดือน</th>
                      <th className="px-3 py-2 text-right">OT</th>
                      <th className="px-3 py-2 text-right">โบนัส</th>
                      <th className="px-3 py-2 text-right">หักรวม</th>
                      <th className="px-3 py-2 text-right">สุทธิ</th>
                      <th className="px-3 py-2 text-center">สถานะ</th>
                      <th className="px-3 py-2 text-center">สลิป</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.by_employee
                      .filter(
                        (r) =>
                          !q ||
                          r.employee_code.toLowerCase().includes(q.toLowerCase()) ||
                          r.employee_name.toLowerCase().includes(q.toLowerCase()) ||
                          (r.department ?? "").toLowerCase().includes(q.toLowerCase())
                      )
                      .map((r) => (
                      <tr key={r.slip_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs">
                          {r.employee_code}
                        </td>
                        <td className="px-3 py-2">{r.employee_name}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.department ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatTHB(r.base_salary)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatTHB(r.ot_pay)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatTHB(r.bonus_total)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-600">
                          {formatTHB(r.deductions_total)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">
                          {formatTHB(r.net_pay)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <a
                            href={`/payslips/${r.slip_id}`}
                            target="_blank"
                            rel="noopener"
                            className="text-xs text-sky-600 hover:underline"
                          >
                            พิมพ์
                          </a>
                        </td>
                      </tr>
                    ))}
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

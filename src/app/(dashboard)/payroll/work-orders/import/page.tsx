"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Download, Search } from "lucide-react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtMoney, fmtDate, type PayrollPeriod } from "@/lib/payroll";

type SummaryRow = {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  work_orders_count: number;
  total_amount: string;
};

type SummaryResp = {
  data: {
    rows: SummaryRow[];
    totals: { leaders: number; amount: number };
  };
};

export default function ImportWorkOrdersPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [periodId, setPeriodId] = useState<number | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [totals, setTotals] = useState<{ leaders: number; amount: number }>({ leaders: 0, amount: 0 });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await apiFetch<{ data: { data: PayrollPeriod[] } }>("/payroll/periods?per_page=50");
      setPeriods(res.data.data);
    })();
  }, []);

  // ตั้งค่า from/to อัตโนมัติจาก period ที่เลือก
  useEffect(() => {
    if (!periodId) return;
    const p = periods.find((x) => x.id === periodId);
    if (p) {
      setFrom(p.start_date.slice(0, 10));
      setTo(p.end_date.slice(0, 10));
    }
  }, [periodId, periods]);

  const period = useMemo(() => periods.find((p) => p.id === periodId) ?? null, [periods, periodId]);

  async function loadSummary() {
    if (!from || !to) { setErr("กรุณาเลือกวันที่"); return; }
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const params = new URLSearchParams({ from, to, status: "completed" });
      const res = await apiFetch<SummaryResp>(`/payroll/work-orders/summary?${params}`);
      setRows(res.data.rows);
      setTotals(res.data.totals);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "โหลดสรุปไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function doImport() {
    if (!periodId) { setErr("กรุณาเลือกงวดเงินเดือน"); return; }
    if (rows.length === 0) { setErr("ไม่มีข้อมูลให้นำเข้า"); return; }
    if (!confirm(`นำเข้าค่าจ้างการผลิตของ ${rows.length} หัวหน้าทีม รวม ${fmtMoney(totals.amount)} บาท?`)) return;
    setImporting(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch<{ message: string; imported: number; skipped: number }>("/payroll/work-orders/import-to-payroll", {
        method: "POST",
        body: { payroll_period_id: periodId, from, to },
      });
      setMsg(res.message);
      setRows([]);
      setTotals({ leaders: 0, amount: 0 });
    } catch (e: unknown) {
      const message = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ";
      setErr(message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Topbar title="นำเข้าค่าจ้างการผลิต → Payroll" />
      <div className="p-6 max-w-5xl space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/payroll/work-orders" className="p-2 rounded-lg hover:bg-white border border-border">
            <ArrowLeft className="w-4 h-4 text-muted" />
          </Link>
          <h3 className="text-lg font-semibold">นำเข้าค่าจ้างการผลิต</h3>
        </div>

        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">งวดเงินเดือน *</span>
              <select className="payroll-input" value={periodId}
                onChange={(e) => setPeriodId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">-- เลือก --</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} ({fmtDate(p.start_date)} → {fmtDate(p.end_date)})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">ตั้งแต่</span>
              <input type="date" className="payroll-input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">ถึง</span>
              <input type="date" className="payroll-input" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div className="flex justify-end">
            <button onClick={loadSummary} disabled={loading}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-white text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} ค้นหา
            </button>
          </div>
          {period && (
            <p className="text-xs text-muted">
              งวด: <span className="font-medium">{period.name}</span> · จ่าย {fmtDate(period.pay_date)} · สถานะ {period.status}
            </p>
          )}
        </div>

        {err && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}
        {msg && <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3">{msg}</div>}

        {rows.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-border p-4 flex gap-6 text-sm">
              <div><span className="text-muted">หัวหน้าทีม:</span> <span className="font-semibold">{totals.leaders} คน</span></div>
              <div><span className="text-muted">ยอดรวม:</span> <span className="font-semibold text-green-700">{fmtMoney(totals.amount)} บาท</span></div>
            </div>
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="px-3 py-3">รหัส</th>
                    <th className="px-3 py-3">หัวหน้าทีม</th>
                    <th className="px-3 py-3 text-right">จำนวนใบงาน</th>
                    <th className="px-3 py-3 text-right">ยอดค่าจ้าง</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.employee_id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 text-xs font-mono">{r.employee_code}</td>
                      <td className="px-3 py-3 font-medium">{r.first_name} {r.last_name}</td>
                      <td className="px-3 py-3 text-right">{r.work_orders_count}</td>
                      <td className="px-3 py-3 text-right font-bold text-green-700">{fmtMoney(r.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button onClick={doImport} disabled={importing || !periodId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold disabled:opacity-50">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                นำเข้าไปงวดเงินเดือน
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

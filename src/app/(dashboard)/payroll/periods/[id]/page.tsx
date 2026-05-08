"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { apiFetch, ApiError } from "@/lib/api";
import {
  fmtDate,
  fmtMoney,
  SLIP_STATUS_COLOR,
  SLIP_STATUS_LABEL,
  type PayrollPeriod,
  type PayrollSlip,
  type SlipStatus,
} from "@/lib/payroll";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  Calculator,
  CheckSquare,
  Loader2,
  Send,
  Square,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  status: string;
}

export default function PayrollPeriodDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id);
  const { hasPermission } = useAuth();

  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCompute, setShowCompute] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [allActive, setAllActive] = useState(true);
  const [computeResult, setComputeResult] = useState<{
    computed: { employee_id: number; net_pay: string }[];
    errors: { employee_id: number; employee_code?: string; message: string }[];
  } | null>(null);
  const [selectedSlips, setSelectedSlips] = useState<number[]>([]);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  const canCompute = hasPermission("payroll.compute");
  const canApproveL1 = hasPermission("payroll.approve_l1");
  const canApproveL2 = hasPermission("payroll.approve_l2");
  const canPay = hasPermission("payroll.pay");

  async function load() {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        apiFetch<{ data: PayrollPeriod }>(`/payroll/periods/${id}`),
        apiFetch<{ data: { data: PayrollSlip[] } }>(`/payroll/slips?period_id=${id}&per_page=200`),
      ]);
      setPeriod(pRes.data);
      setSlips(sRes.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function openCompute() {
    if (employees.length === 0) {
      const res = await apiFetch<{ data: { data: Employee[] } }>("/employees?per_page=500&status=active");
      setEmployees(res.data.data.filter((e) => e.status === "active"));
    }
    setShowCompute(true);
    setComputeResult(null);
  }

  async function handleCompute() {
    setComputing(true);
    try {
      const body = allActive ? { all_active: true } : { employee_ids: picked };
      const res = await apiFetch<{
        data: {
          computed: { employee_id: number; net_pay: string }[];
          errors: { employee_id: number; employee_code?: string; message: string }[];
        };
      }>(`/payroll/periods/${id}/compute`, { method: "POST", body });
      setComputeResult(res.data);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "คำนวณไม่สำเร็จ");
    } finally {
      setComputing(false);
    }
  }

  async function bulkAction(action: string, extra: Record<string, unknown> = {}) {
    if (selectedSlips.length === 0) return;
    setSubmitting(true);
    setBulkErr(null);
    try {
      await apiFetch("/payroll/slips/bulk", {
        method: "POST",
        body: { slip_ids: selectedSlips, action, ...extra },
      });
      setSelectedSlips([]);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ";
      setBulkErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const totals = useMemo(() => {
    return slips.reduce(
      (acc, s) => {
        acc.gross += parseFloat(s.gross_pay);
        acc.tax += parseFloat(s.tax);
        acc.ssf += parseFloat(s.ssf_employee);
        acc.deductions += parseFloat(s.deductions_total);
        acc.net += parseFloat(s.net_pay);
        return acc;
      },
      { gross: 0, tax: 0, ssf: 0, deductions: 0, net: 0 },
    );
  }, [slips]);

  const allChecked = slips.length > 0 && selectedSlips.length === slips.length;

  if (loading || !period) {
    return (
      <>
        <Topbar title="งวดจ่ายเงินเดือน" />
        <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title={period.name} />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/payroll" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> กลับไปรายการงวด
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {canCompute && (
              <button
                onClick={openCompute}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
              >
                <Calculator className="w-4 h-4" /> คำนวณสลิป
              </button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="รหัสงวด" value={period.code} />
          <SummaryCard label="ช่วงงวด" value={`${fmtDate(period.start_date)} – ${fmtDate(period.end_date)}`} />
          <SummaryCard label="วันจ่าย" value={fmtDate(period.pay_date)} />
          <SummaryCard label="จำนวนสลิป" value={String(slips.length)} />
          <SummaryCard label="รวมจ่ายสุทธิ" value={fmtMoney(totals.net)} highlight />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <KV label="รวมรายได้รวม (Gross)" value={fmtMoney(totals.gross)} />
          <KV label="รวมประกันสังคม" value={fmtMoney(totals.ssf)} />
          <KV label="รวมภาษีหัก ณ ที่จ่าย" value={fmtMoney(totals.tax)} />
          <KV label="รวมรายการหักอื่น" value={fmtMoney(totals.deductions)} />
        </div>

        {/* Bulk actions */}
        {selectedSlips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-primary-50 border border-primary-200 rounded-xl p-3">
            <span className="text-sm text-primary-700 font-medium">เลือกแล้ว {selectedSlips.length} รายการ</span>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {canCompute && (
                <BulkBtn onClick={() => bulkAction("submit_l1")} disabled={submitting}>
                  <Send className="w-3.5 h-3.5" /> ส่งให้ Manager
                </BulkBtn>
              )}
              {canApproveL1 && (
                <>
                  <BulkBtn onClick={() => bulkAction("approve_l1")} disabled={submitting} variant="success">
                    อนุมัติ L1
                  </BulkBtn>
                  <BulkBtn onClick={() => bulkAction("reject_l1", { note: prompt("เหตุผล") || "" })} disabled={submitting} variant="danger">
                    ปฏิเสธ L1
                  </BulkBtn>
                </>
              )}
              {canApproveL2 && (
                <>
                  <BulkBtn onClick={() => bulkAction("approve_l2")} disabled={submitting} variant="success">
                    อนุมัติ L2
                  </BulkBtn>
                  <BulkBtn onClick={() => bulkAction("reject_l2", { note: prompt("เหตุผล") || "" })} disabled={submitting} variant="danger">
                    ปฏิเสธ L2
                  </BulkBtn>
                </>
              )}
              {canPay && (
                <BulkBtn onClick={() => bulkAction("mark_paid", { payment_reference: prompt("เลขอ้างอิงจ่ายเงิน") || "" })} disabled={submitting} variant="success">
                  ทำเครื่องหมายว่าจ่ายแล้ว
                </BulkBtn>
              )}
              {canCompute && (
                <BulkBtn onClick={() => bulkAction("cancel", { note: prompt("เหตุผลยกเลิก") || "" })} disabled={submitting} variant="danger">
                  <Trash2 className="w-3.5 h-3.5" /> ยกเลิก
                </BulkBtn>
              )}
            </div>
          </div>
        )}
        {bulkErr && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {bulkErr}
          </div>
        )}

        {/* Slips table */}
        {slips.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ยังไม่มีสลิปในงวดนี้ — กดปุ่ม &quot;คำนวณสลิป&quot; เพื่อสร้าง
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3 w-10">
                    <button
                      onClick={() =>
                        setSelectedSlips(allChecked ? [] : slips.map((s) => s.id))
                      }
                      className="text-muted hover:text-foreground"
                    >
                      {allChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-3 py-3">พนักงาน</th>
                  <th className="px-3 py-3 text-right">เงินเดือน</th>
                  <th className="px-3 py-3 text-right">OT</th>
                  <th className="px-3 py-3 text-right">เบี้ย</th>
                  <th className="px-3 py-3 text-right">หัก</th>
                  <th className="px-3 py-3 text-right">ภาษี</th>
                  <th className="px-3 py-3 text-right">สุทธิ</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {slips.map((s) => {
                  const checked = selectedSlips.includes(s.id);
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3">
                        <button
                          onClick={() =>
                            setSelectedSlips((prev) =>
                              prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                            )
                          }
                        >
                          {checked ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-muted" />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {s.employee?.first_name} {s.employee?.last_name}
                        </div>
                        <div className="text-xs text-muted font-mono">{s.employee?.employee_code}</div>
                      </td>
                      <td className="px-3 py-3 text-right">{fmtMoney(s.base_pay)}</td>
                      <td className="px-3 py-3 text-right">{fmtMoney(s.ot_pay)}</td>
                      <td className="px-3 py-3 text-right text-green-700">{fmtMoney(s.allowances_total)}</td>
                      <td className="px-3 py-3 text-right text-red-700">
                        {fmtMoney(parseFloat(s.deductions_total) + parseFloat(s.ssf_employee))}
                      </td>
                      <td className="px-3 py-3 text-right">{fmtMoney(s.tax)}</td>
                      <td className="px-3 py-3 text-right font-semibold">{fmtMoney(s.net_pay)}</td>
                      <td className="px-3 py-3">
                        <Badge label={SLIP_STATUS_LABEL[s.status]} variant={SLIP_STATUS_COLOR[s.status]} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/payroll/slips/${s.id}`} className="text-primary-600 hover:text-primary-700 text-xs font-medium">
                          ดู
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Compute modal */}
      {showCompute && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">คำนวณสลิปสำหรับงวดนี้</h3>
              <button onClick={() => setShowCompute(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                หมายเหตุ: ระบบจะคำนวณใหม่ทับสลิปเดิมที่ยังไม่อนุมัติ — สลิปที่อนุมัติ/จ่ายแล้วจะข้าม
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={allActive} onChange={() => setAllActive(true)} />
                คำนวณให้พนักงานที่ Active ทั้งหมด ({employees.length} คน)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={!allActive} onChange={() => setAllActive(false)} />
                เลือกพนักงานเอง
              </label>
              {!allActive && (
                <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                  {employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm border-b border-border last:border-0">
                      <input
                        type="checkbox"
                        checked={picked.includes(e.id)}
                        onChange={(ev) =>
                          setPicked((p) => (ev.target.checked ? [...p, e.id] : p.filter((x) => x !== e.id)))
                        }
                      />
                      <span className="font-mono text-xs">{e.employee_code}</span>
                      {e.first_name} {e.last_name}
                    </label>
                  ))}
                </div>
              )}
              {computeResult && (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    คำนวณสำเร็จ {computeResult.computed.length} คน
                  </div>
                  {computeResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                      <div className="font-medium mb-1">ข้อผิดพลาด {computeResult.errors.length} รายการ</div>
                      <ul className="space-y-1">
                        {computeResult.errors.map((er, i) => (
                          <li key={i}>• {er.employee_code ?? er.employee_id}: {er.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => setShowCompute(false)} className="px-4 py-2 text-sm rounded-lg border border-border">
                ปิด
              </button>
              <button
                onClick={handleCompute}
                disabled={computing || (!allActive && picked.length === 0)}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {computing && <Loader2 className="w-4 h-4 animate-spin" />}
                เริ่มคำนวณ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "bg-gradient-to-br from-primary-50 to-accent-50 border-primary-200" : "bg-white border-border"}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-semibold ${highlight ? "text-primary-700 text-lg" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-border px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function BulkBtn({
  children, onClick, disabled, variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "success" | "danger";
}) {
  const cls = {
    primary: "bg-primary-600 text-white hover:bg-primary-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

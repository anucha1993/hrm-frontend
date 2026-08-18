"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import EmployeeAttendanceCalendarModal from "@/components/attendance/EmployeeAttendanceCalendarModal";
import { apiFetch, ApiError } from "@/lib/api";
import {
  fmtDate,
  fmtMoney,
  SLIP_STATUS_COLOR,
  SLIP_STATUS_LABEL,
  type PayrollSlip,
  type PayrollSlipItem,
} from "@/lib/payroll";

type PayrollApproval = {
  id: number;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
  user?: { id: number; name: string };
};
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  Printer,
  Send,
  Check,
  X,
  CreditCard,
  Loader2,
  AlertCircle,
  Trash2,
  Receipt,
  RotateCcw,
  FileText,
  CalendarDays,
  Plus,
} from "lucide-react";

type WorkOrderBrief = {
  id: number;
  code: string;
  status: string;
  total_amount: string;
  start_date: string;
  end_date: string;
};

// อธิบายว่าแต่ละรายการคำนวณมาจากส่วนไหนของระบบ (source ที่ backend ใส่ไว้ตอนสร้างรายการ)
const SOURCE_LABELS: Record<string, string> = {
  base: "เงินเดือนพื้นฐาน",
  ot: "คำนวณค่าล่วงเวลา (OT)",
  component: "ค่าตอบแทน/รายการประจำตัวพนักงาน",
  rule: "กฎของโปรไฟล์ / Payroll Rules",
  attendance: "ระบบเช็คเวลา (มาสาย/ขาดงาน)",
  manual: "ระบบเพิ่ม/ปรับยอดอัตโนมัติ",
  tax_calc: "คำนวณภาษี/ประกันสังคม",
};

type DepositRow = { item_name: string; qty: string; unit_price: string; note: string };

type OutOfPeriodDeposit = { id: number; slip_no: string; deposit_date: string; total_amount: string };

function emptyDepositRow(): DepositRow {
  return { item_name: "", qty: "1", unit_price: "0", note: "" };
}

interface FullSlip extends Omit<PayrollSlip, "period"> {
  items?: PayrollSlipItem[];
  approvals?: PayrollApproval[];
  ot_sessions?: { id: number; name: string; work_date: string; pivot?: { hours: string; amount: string } }[];
  period?: { id: number; name: string; code: string; start_date?: string; end_date?: string };
  work_orders?: WorkOrderBrief[];
}

export default function SlipDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { hasPermission } = useAuth();

  const [slip, setSlip] = useState<FullSlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [depositPreview, setDepositPreview] = useState<{ count: number; total: number } | null>(null);
  const [outOfPeriodDeposits, setOutOfPeriodDeposits] = useState<OutOfPeriodDeposit[]>([]);
  const [selectedManualIds, setSelectedManualIds] = useState<number[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [deductionBusy, setDeductionBusy] = useState(false);

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositDate, setDepositDate] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositRows, setDepositRows] = useState<DepositRow[]>([emptyDepositRow()]);
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositErr, setDepositErr] = useState<string | null>(null);

  function openDepositModal() {
    const today = new Date().toISOString().slice(0, 10);
    const start = slip?.period?.start_date?.slice(0, 10);
    const end = slip?.period?.end_date?.slice(0, 10);
    const withinPeriod = start && end && today >= start && today <= end;
    setDepositDate(withinPeriod ? today : start ?? today);
    setDepositNote("");
    setDepositRows([emptyDepositRow()]);
    setDepositErr(null);
    setDepositModalOpen(true);
  }

  function updateDepositRow(idx: number, patch: Partial<DepositRow>) {
    setDepositRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addDepositRow() {
    setDepositRows((rs) => [...rs, emptyDepositRow()]);
  }

  function removeDepositRow(idx: number) {
    setDepositRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs));
  }

  async function submitDepositModal() {
    setDepositErr(null);
    if (depositRows.some((r) => !r.item_name.trim())) {
      setDepositErr("กรุณากรอกชื่อรายการทุกแถว");
      return;
    }
    setDepositSaving(true);
    try {
      await apiFetch("/goods-deposits", {
        method: "POST",
        body: {
          employee_id: slip!.employee_id,
          deposit_date: depositDate,
          note: depositNote || null,
          items: depositRows.map((r) => ({
            item_name: r.item_name.trim(),
            qty: Number(r.qty || 0),
            unit_price: Number(r.unit_price || 0),
            note: r.note || null,
          })),
        },
      });
      await applyDeposits();
      setDepositModalOpen(false);
    } catch (e) {
      setDepositErr(e instanceof ApiError ? e.message : "เพิ่มรายการหักไม่สำเร็จ");
    } finally {
      setDepositSaving(false);
    }
  }

  async function removeDeduction(itemId: number) {
    if (!confirm("ลบรายการหักนี้ออกจากสลิป?")) return;
    setDeductionBusy(true);
    setErr(null);
    try {
      await apiFetch(`/payroll/slips/${id}/deductions/${itemId}`, { method: "DELETE" });
      await load();
      await loadDepositPreview();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "ลบรายการหักไม่สำเร็จ");
    } finally {
      setDeductionBusy(false);
    }
  }

  async function loadDepositPreview() {
    try {
      const res = await apiFetch<{
        data: { id: number }[];
        total: number;
        out_of_period: OutOfPeriodDeposit[];
        out_of_period_total: number;
      }>(`/goods-deposits/preview-for-payslip/${id}`);
      setDepositPreview({ count: res.data.length, total: res.total });
      const outOfPeriod = res.out_of_period ?? [];
      setOutOfPeriodDeposits(outOfPeriod);
      setSelectedManualIds((ids) => ids.filter((i) => outOfPeriod.some((d) => d.id === i)));
    } catch {
      setDepositPreview(null);
      setOutOfPeriodDeposits([]);
    }
  }

  function toggleManualDeposit(depositId: number) {
    setSelectedManualIds((ids) => (ids.includes(depositId) ? ids.filter((i) => i !== depositId) : [...ids, depositId]));
  }

  async function applyDeposits(depositIds?: number[]) {
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/goods-deposits/apply-to-payslip/${id}`, {
        method: "POST",
        body: depositIds && depositIds.length > 0 ? { deposit_ids: depositIds } : undefined,
      });
      setSelectedManualIds([]);
      await load();
      await loadDepositPreview();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "ตัดยอดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function revokeDeposits() {
    if (!confirm("ยกเลิกการตัดยอดใบมัดจำออกจากสลิปนี้?")) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/goods-deposits/revoke-from-payslip/${id}`, { method: "POST" });
      await load();
      await loadDepositPreview();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "ยกเลิกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: FullSlip }>(`/payroll/slips/${id}`);
      setSlip(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      load();
      loadDepositPreview();
    }
  }, [id]);

  async function action(verb: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/payroll/slips/${id}/${verb}`, { method: "POST", body });
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !slip) {
    return (
      <>
        <Topbar title="สลิปเงินเดือน" />
        <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
      </>
    );
  }

  const items = slip.items ?? [];
  const earnings = items.filter((i) => i.type === "earning");
  const deductions = items.filter((i) => i.type === "deduction");
  const ssfItems = items.filter((i) => i.type === "ssf");
  const taxItems = items.filter((i) => i.type === "tax");

  const status = slip.status;
  const canCompute = hasPermission("payroll.compute");
  const canL1 = hasPermission("payroll.approve_l1");
  const canL2 = hasPermission("payroll.approve_l2");
  const canPay = hasPermission("payroll.pay");

  return (
    <>
      <Topbar title={`สลิป ${slip.slip_no}`} />
      <div className="p-6 space-y-5 max-w-5xl">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={slip.period ? `/payroll/periods/${slip.period.id}` : "/payroll"}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> กลับ
          </Link>
          <a
            href={`/payslips/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            <Printer className="w-4 h-4" /> พิมพ์สลิป / PDF
          </a>
        </div>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted">เลขที่สลิป</div>
              <div className="font-semibold text-lg">{slip.slip_no}</div>
              <div className="mt-2 text-sm">
                <span className="text-muted">งวด:</span>{" "}
                <Link href={`/payroll/periods/${slip.period?.id}`} className="text-primary-600 hover:underline">
                  {slip.period?.name}
                </Link>
              </div>
              <div className="text-sm">
                <span className="text-muted">พนักงาน:</span>{" "}
                <span className="font-medium">{slip.employee?.first_name} {slip.employee?.last_name}</span>{" "}
                <span className="text-xs text-muted font-mono">({slip.employee?.employee_code})</span>
              </div>
            </div>
            <div className="text-right">
              <Badge label={SLIP_STATUS_LABEL[status]} variant={SLIP_STATUS_COLOR[status]} />
              <div className="mt-3 text-xs text-muted">รายได้สุทธิ</div>
              <div className="text-2xl font-bold text-primary-700">{fmtMoney(slip.net_pay)}</div>
            </div>
          </div>

          {/* Workflow buttons */}
          <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 flex-wrap">
            {status === "computed" && canCompute && (
              <ActionBtn onClick={() => action("submit-l1")} busy={busy}>
                <Send className="w-4 h-4" /> ส่งให้ Manager อนุมัติ
              </ActionBtn>
            )}
            {status === "rejected" && canCompute && (
              <ActionBtn onClick={() => action("submit-l1")} busy={busy}>
                <Send className="w-4 h-4" /> ส่งใหม่
              </ActionBtn>
            )}
            {status === "pending_l1" && canL1 && (
              <>
                <ActionBtn onClick={() => action("approve-l1")} busy={busy} variant="success">
                  <Check className="w-4 h-4" /> อนุมัติ L1
                </ActionBtn>
                <ActionBtn
                  onClick={() => {
                    const note = prompt("เหตุผลที่ปฏิเสธ");
                    if (note !== null) action("reject-l1", { note });
                  }}
                  busy={busy} variant="danger"
                >
                  <X className="w-4 h-4" /> ปฏิเสธ
                </ActionBtn>
              </>
            )}
            {status === "pending_l2" && canL2 && (
              <>
                <ActionBtn onClick={() => action("approve-l2")} busy={busy} variant="success">
                  <Check className="w-4 h-4" /> อนุมัติ L2 (Owner)
                </ActionBtn>
                <ActionBtn
                  onClick={() => {
                    const note = prompt("เหตุผลที่ปฏิเสธ");
                    if (note !== null) action("reject-l2", { note });
                  }}
                  busy={busy} variant="danger"
                >
                  <X className="w-4 h-4" /> ปฏิเสธ
                </ActionBtn>
              </>
            )}
            {status === "approved" && canPay && (
              <ActionBtn
                onClick={() => {
                  const ref = prompt("เลขอ้างอิงการจ่ายเงิน (เช่น เลขที่ใบโอน)");
                  if (ref !== null) action("mark-paid", { payment_reference: ref });
                }}
                busy={busy} variant="success"
              >
                <CreditCard className="w-4 h-4" /> ทำเครื่องหมายว่าจ่ายแล้ว
              </ActionBtn>
            )}
            {status !== "paid" && status !== "cancelled" && canCompute && (
              <ActionBtn
                onClick={() => {
                  const note = prompt("เหตุผลที่ยกเลิก");
                  if (note !== null) action("cancel", { note });
                }}
                busy={busy} variant="danger"
              >
                <Trash2 className="w-4 h-4" /> ยกเลิก
              </ActionBtn>
            )}
          </div>
          {err && (
            <div className="mt-3 bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {err}
            </div>
          )}
        </div>

        {/* Summary numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <KV label="เงินเดือน/ค่าจ้างฐาน" value={fmtMoney(slip.base_pay)} />
          <KV label="ค่าล่วงเวลา (OT)" value={fmtMoney(slip.ot_pay)} />
          <KV label="ขาด/มาสาย (หัก)" value={fmtMoney(parseFloat(slip.absent_deduction) + parseFloat(slip.late_deduction))} className="text-red-700" />
          <KV label="เบี้ย/ค่าตอบแทน" value={fmtMoney(slip.allowances_total)} className="text-green-700" />
          <KV label="หักรายการอื่น" value={fmtMoney(slip.other_deductions_total)} className="text-red-700" />
          <KV label="ประกันสังคม (พนักงาน)" value={fmtMoney(slip.ssf_employee)} />
          <KV label="ภาษีหัก ณ ที่จ่าย" value={fmtMoney(slip.tax)} />
          <KV label="รายได้รวม (Gross)" value={fmtMoney(slip.gross_pay)} />
        </div>

        {/* Attendance summary */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h3 className="font-semibold">สรุปการมาทำงาน</h3>
            <button
              onClick={() => setCalendarOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
            >
              <CalendarDays className="w-3.5 h-3.5" /> ดูปฏิทินการทำงาน
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <KV label="วันทำงานในงวด" value={String(slip.working_days)} />
            <KV label="วันมาทำงาน" value={String(slip.present_days)} />
            <KV label="ขาด (วัน)" value={String(slip.absent_days)} />
            <KV label="มาสาย (ครั้ง)" value={String(slip.late_count)} />
            <KV label="ชั่วโมง OT" value={slip.ot_hours_total} />
          </div>
        </div>

        {/* Line items */}
        <ItemSection
          title="รายการรายได้ (Earnings)"
          items={earnings}
          positive
          workOrders={slip.work_orders}
          canViewWorkOrders={hasPermission("payroll.view")}
        />
        <ItemSection
          title="รายการหัก (Deductions)"
          items={deductions}
          onRemove={status === "draft" || status === "computed" ? removeDeduction : undefined}
          removeBusy={deductionBusy}
          headerActions={
            (status === "draft" || status === "computed") && canCompute ? (
              <div className="flex items-center gap-2 flex-wrap">
                <ActionBtn onClick={openDepositModal} busy={busy}>
                  <Plus className="w-4 h-4" /> เพิ่มรายการหัก
                </ActionBtn>
                {depositPreview && depositPreview.count > 0 && (
                  <ActionBtn onClick={() => applyDeposits()} busy={busy} variant="success">
                    <Check className="w-4 h-4" /> ตัดยอด {depositPreview.count} ใบ (
                    {fmtMoney(depositPreview.total)})
                  </ActionBtn>
                )}
                {deductions.some((d) => d.code === "GOODS_DEPOSIT") && (
                  <ActionBtn onClick={revokeDeposits} busy={busy} variant="danger">
                    <RotateCcw className="w-4 h-4" /> ยกเลิกการตัดยอดทั้งหมด
                  </ActionBtn>
                )}
              </div>
            ) : undefined
          }
          subtitle={
            (status === "draft" || status === "computed") && canCompute ? (
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {depositPreview === null
                  ? "กำลังตรวจสอบใบมัดจำของใช้ทั่วไปในงวดนี้..."
                  : depositPreview.count === 0 && !deductions.some((d) => d.code === "GOODS_DEPOSIT")
                    ? "ไม่มีใบมัดจำของใช้ทั่วไปที่รอตัดยอดในงวดนี้ (ระบบตัดให้อัตโนมัติตอนกดคำนวณ)"
                    : depositPreview.count === 0
                      ? "ใบมัดจำของใช้ทั่วไปในงวดนี้ตัดยอดไปแล้ว — หากผิดลบรายการนั้นออกได้ หรือกดยกเลิกการตัดยอดทั้งหมด"
                      : `พบใบมัดจำของใช้ทั่วไปเพิ่มเติมอีก ${depositPreview.count} ใบที่ยังไม่ได้ตัดยอด รวม ${fmtMoney(depositPreview.total)} บาท`}
              </span>
            ) : undefined
          }
        />

        {/* ใบมัดจำที่รอตัด แต่วันที่หยิบของอยู่นอกช่วงงวดนี้ — ต้องเลือกและกดตัดยอดเองแบบ manual เท่านั้น */}
        {(status === "draft" || status === "computed") && canCompute && outOfPeriodDeposits.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <AlertCircle className="w-4 h-4" /> พบใบมัดจำของใช้ทั่วไปนอกงวดนี้ที่ยังรอตัดยอด ({outOfPeriodDeposits.length} ใบ)
              </div>
              {selectedManualIds.length > 0 && (
                <ActionBtn onClick={() => applyDeposits(selectedManualIds)} busy={busy} variant="success">
                  <Check className="w-4 h-4" /> ตัดยอดที่เลือก {selectedManualIds.length} ใบ (Manual)
                </ActionBtn>
              )}
            </div>
            <p className="text-xs text-amber-700 mb-3">
              วันที่หยิบของไม่อยู่ในช่วงงวดนี้ ระบบจึงไม่ตัดยอดให้อัตโนมัติ — ติ๊กเลือกใบที่ต้องการแล้วกดตัดยอดเองหากต้องการนำมารวมในงวดนี้
            </p>
            <div className="divide-y divide-amber-200/70 border-t border-amber-200">
              {outOfPeriodDeposits.map((d) => (
                <label key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedManualIds.includes(d.id)}
                      onChange={() => toggleManualDeposit(d.id)}
                    />
                    <span>
                      {d.slip_no} <span className="text-xs text-muted">({fmtDate(d.deposit_date)})</span>
                    </span>
                  </span>
                  <span className="text-red-700 font-medium">-{fmtMoney(d.total_amount)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <ItemSection title="ประกันสังคม" items={ssfItems} />
        <ItemSection title="ภาษี" items={taxItems} />

        {/* OT Sessions */}
        {(slip.ot_sessions ?? []).length > 0 && (
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">รายการ OT</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted uppercase border-b border-border">
                <tr>
                  <th className="py-2">วันที่</th>
                  <th className="py-2">รายการ</th>
                  <th className="py-2 text-right">ชั่วโมง</th>
                  <th className="py-2 text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {slip.ot_sessions!.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="py-2">{fmtDate(o.work_date)}</td>
                    <td className="py-2">{o.name}</td>
                    <td className="py-2 text-right">{o.pivot?.hours ?? "-"}</td>
                    <td className="py-2 text-right">{fmtMoney(o.pivot?.amount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Approvals timeline */}
        {(slip.approvals ?? []).length > 0 && (
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">ประวัติการอนุมัติ</h3>
            <div className="space-y-2">
              {slip.approvals!.map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm border-l-2 border-primary-300 pl-3 py-1">
                  <div className="flex-1">
                    <div className="font-medium">
                      {a.action} <span className="text-xs text-muted">({a.from_status} → {a.to_status})</span>
                    </div>
                    {a.note && <div className="text-xs text-muted mt-1">หมายเหตุ: {a.note}</div>}
                    <div className="text-xs text-muted">
                      {a.user?.name && <span className="mr-2">โดย: {a.user.name}</span>}
                      {a.created_at ? new Date(a.created_at).toLocaleString("th-TH") : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <EmployeeAttendanceCalendarModal
        open={calendarOpen}
        employee={
          slip.employee
            ? { id: slip.employee_id, code: slip.employee.employee_code, name: `${slip.employee.first_name} ${slip.employee.last_name}` }
            : null
        }
        initialMonth={slip.period?.start_date ? slip.period.start_date.substring(0, 10) : undefined}
        onClose={() => setCalendarOpen(false)}
        onChanged={load}
      />

      {depositModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">เพิ่มรายการหัก — ใบมัดจำของใช้ทั่วไป</h3>
              <button onClick={() => setDepositModalOpen(false)} className="p-1 rounded hover:bg-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {depositErr && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {depositErr}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">พนักงาน</label>
                  <div className="px-3 py-2.5 rounded-xl border border-border text-sm bg-surface">
                    {slip.employee?.first_name} {slip.employee?.last_name}{" "}
                    <span className="text-xs text-muted font-mono">({slip.employee?.employee_code})</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">วันที่หยิบของ *</label>
                  <input
                    type="date"
                    value={depositDate}
                    min={slip.period?.start_date?.slice(0, 10)}
                    max={slip.period?.end_date?.slice(0, 10)}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
                  />
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <h4 className="text-sm font-semibold">รายการของที่หยิบ</h4>
                  <button
                    type="button"
                    onClick={addDepositRow}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface border-b border-border">
                        <th className="px-2 py-2 text-left text-xs font-semibold text-muted">ชื่อรายการ *</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold text-muted w-20">จำนวน</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold text-muted w-28">ราคา/หน่วย</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold text-muted w-24">รวม</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {depositRows.map((r, idx) => {
                        const subtotal = Number(r.qty || 0) * Number(r.unit_price || 0);
                        return (
                          <tr key={idx}>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={r.item_name}
                                onChange={(e) => updateDepositRow(idx, { item_name: e.target.value })}
                                placeholder="เช่น บุหรี่ / น้ำดื่ม"
                                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={r.qty}
                                onChange={(e) => updateDepositRow(idx, { qty: e.target.value })}
                                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-right"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={r.unit_price}
                                onChange={(e) => updateDepositRow(idx, { unit_price: e.target.value })}
                                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-right"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-sm text-right font-medium">{fmtMoney(subtotal)}</td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeDepositRow(idx)}
                                className="p-1 rounded text-accent-500 hover:bg-accent-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">หมายเหตุ</label>
                <textarea
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setDepositModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface"
              >
                ยกเลิก
              </button>
              <ActionBtn onClick={submitDepositModal} busy={depositSaving}>
                <Check className="w-4 h-4" /> บันทึกและตัดยอด
              </ActionBtn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ItemSection({
  title,
  items,
  positive = false,
  workOrders,
  canViewWorkOrders = false,
  onRemove,
  removeBusy = false,
  headerActions,
  subtitle,
}: {
  title: string;
  items: PayrollSlipItem[];
  positive?: boolean;
  workOrders?: WorkOrderBrief[];
  canViewWorkOrders?: boolean;
  onRemove?: (itemId: number) => void;
  removeBusy?: boolean;
  headerActions?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  if (items.length === 0 && !headerActions) return null;
  const total = items.reduce((a, i) => a + parseFloat(i.amount), 0);
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h3 className="font-semibold">{title}</h3>
        {headerActions}
      </div>
      {subtitle && <p className="text-xs text-muted mb-3">{subtitle}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-muted">ไม่มีรายการ</p>
      ) : (
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted uppercase border-b border-border">
          <tr>
            <th className="py-2">รายการ</th>
            <th className="py-2 text-right">จำนวน</th>
            {onRemove && <th className="py-2 w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const amt = parseFloat(i.amount);
            const rowPositive = positive ? amt >= 0 : amt < 0;
            return (
            <tr key={i.id} className="border-b border-border last:border-0">
              <td className="py-2">
                <div>{i.name}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  {i.code && <span className="font-mono">รหัส: {i.code}</span>}
                  {i.code && <span> · </span>}
                  <span>ที่มา: {SOURCE_LABELS[i.source] ?? i.source}</span>
                </div>
                {i.formula && <div className="text-xs text-muted">{i.formula}</div>}
                {i.code === "PRODUCTION_WAGE" && workOrders && workOrders.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {workOrders.map((wo) =>
                      canViewWorkOrders ? (
                        <Link
                          key={wo.id}
                          href={`/payroll/work-orders/${wo.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs text-primary-700 hover:bg-primary-100"
                        >
                          <FileText className="w-3 h-3" /> ใบงาน {wo.code}
                        </Link>
                      ) : (
                        <span
                          key={wo.id}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-slate-50 px-2 py-0.5 text-xs text-muted"
                        >
                          <FileText className="w-3 h-3" /> ใบงาน {wo.code}
                        </span>
                      )
                    )}
                  </div>
                )}
              </td>
              <td className={`py-2 text-right ${rowPositive ? "text-green-700" : "text-red-700"}`}>
                {rowPositive ? "+" : "-"}{fmtMoney(Math.abs(amt))}
              </td>
              {onRemove && (
                <td className="py-2 text-right">
                  {i.source === "manual" && i.code !== "CAP-ADJ" && (
                    <button
                      type="button"
                      onClick={() => onRemove(i.id)}
                      disabled={removeBusy}
                      title="ลบรายการนี้"
                      className="p-1 rounded text-accent-500 hover:bg-accent-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              )}
            </tr>
            );
          })}
          <tr className="font-semibold">
            <td className="py-2">รวม</td>
            <td className={`py-2 text-right ${(positive ? total >= 0 : total < 0) ? "text-green-700" : "text-red-700"}`}>
              {(positive ? total >= 0 : total < 0) ? "+" : "-"}{fmtMoney(Math.abs(total))}
            </td>
            {onRemove && <td className="py-2"></td>}
          </tr>
        </tbody>
      </table>
      )}
    </div>
  );
}

function KV({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-white rounded-lg border border-border px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-medium ${className ?? ""}`}>{value}</div>
    </div>
  );
}

function ActionBtn({
  children, onClick, busy, variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
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
      disabled={busy}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

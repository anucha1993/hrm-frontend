"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
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
  Send,
  Check,
  X,
  CreditCard,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";

interface FullSlip extends PayrollSlip {
  items?: PayrollSlipItem[];
  approvals?: PayrollApproval[];
  ot_sessions?: { id: number; name: string; work_date: string; pivot?: { hours: string; amount: string } }[];
  period?: { id: number; name: string; code: string };
}

export default function SlipDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { hasPermission } = useAuth();

  const [slip, setSlip] = useState<FullSlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    if (id) load();
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
        <Link
          href={slip.period ? `/payroll/periods/${slip.period.id}` : "/payroll"}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> กลับ
        </Link>

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
          <h3 className="font-semibold mb-3">สรุปการมาทำงาน</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <KV label="วันทำงานในงวด" value={String(slip.working_days)} />
            <KV label="วันมาทำงาน" value={String(slip.present_days)} />
            <KV label="ขาด (วัน)" value={String(slip.absent_days)} />
            <KV label="มาสาย (ครั้ง)" value={String(slip.late_count)} />
            <KV label="ชั่วโมง OT" value={slip.ot_hours_total} />
          </div>
        </div>

        {/* Line items */}
        <ItemSection title="รายการรายได้ (Earnings)" items={earnings} positive />
        <ItemSection title="รายการหัก (Deductions)" items={deductions} />
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
    </>
  );
}

function ItemSection({ title, items, positive = false }: { title: string; items: PayrollSlipItem[]; positive?: boolean }) {
  if (items.length === 0) return null;
  const total = items.reduce((a, i) => a + parseFloat(i.amount), 0);
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted uppercase border-b border-border">
          <tr>
            <th className="py-2">รายการ</th>
            <th className="py-2 text-right">จำนวน</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-border last:border-0">
              <td className="py-2">
                <div>{i.name}</div>
                {i.formula && <div className="text-xs text-muted">{i.formula}</div>}
              </td>
              <td className={`py-2 text-right ${positive ? "text-green-700" : "text-red-700"}`}>
                {positive ? "+" : "-"}{fmtMoney(i.amount)}
              </td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2">รวม</td>
            <td className={`py-2 text-right ${positive ? "text-green-700" : "text-red-700"}`}>
              {positive ? "+" : "-"}{fmtMoney(total)}
            </td>
          </tr>
        </tbody>
      </table>
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

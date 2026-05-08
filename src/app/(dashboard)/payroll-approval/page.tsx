"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { apiFetch, ApiError } from "@/lib/api";
import {
  fmtMoney,
  SLIP_STATUS_COLOR,
  SLIP_STATUS_LABEL,
  type PayrollSlip,
  type SlipStatus,
} from "@/lib/payroll";
import { useAuth } from "@/lib/auth-context";
import {
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

type Tab = "pending_l1" | "pending_l2" | "approved";

const TABS: { key: Tab; label: string; perm: string }[] = [
  { key: "pending_l1", label: "รออนุมัติ L1 (Manager)", perm: "payroll.approve_l1" },
  { key: "pending_l2", label: "รออนุมัติ L2 (Owner)", perm: "payroll.approve_l2" },
  { key: "approved", label: "พร้อมจ่ายเงิน", perm: "payroll.pay" },
];

export default function PayrollApprovalPage() {
  const { hasPermission } = useAuth();
  const allowed = TABS.filter((t) => hasPermission(t.perm));
  const [tab, setTab] = useState<Tab | null>(allowed[0]?.key ?? null);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  async function load() {
    if (!tab) return;
    setLoading(true);
    setPicked([]);
    try {
      const res = await apiFetch<{ data: { data: PayrollSlip[] } }>(
        `/payroll/slips?status=${tab}&per_page=200`,
      );
      setSlips(res.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tab]);

  async function bulk(action: string, extra: Record<string, unknown> = {}) {
    if (picked.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch("/payroll/slips/bulk", {
        method: "POST",
        body: { slip_ids: picked, action, ...extra },
      });
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

  const totalNet = useMemo(
    () => slips.filter((s) => picked.includes(s.id)).reduce((a, s) => a + parseFloat(s.net_pay), 0),
    [slips, picked],
  );
  const allChecked = slips.length > 0 && picked.length === slips.length;

  if (allowed.length === 0) {
    return (
      <>
        <Topbar title="อนุมัติเงินเดือน" />
        <div className="p-6 max-w-xl">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-800">ไม่มีสิทธิ์เข้าใช้งาน</div>
              <div className="text-sm text-yellow-700 mt-1">
                คุณไม่มีสิทธิ์อนุมัติหรือจ่ายเงินสลิป โปรดติดต่อผู้ดูแลระบบ
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="อนุมัติเงินเดือน" />
      <div className="p-6 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {allowed.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t.key
                  ? "border-primary-500 text-primary-700"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Bulk bar */}
        {picked.length > 0 && tab && (
          <div className="flex items-center gap-2 flex-wrap bg-primary-50 border border-primary-200 rounded-xl p-3">
            <span className="text-sm text-primary-700 font-medium">
              เลือกแล้ว {picked.length} รายการ • รวมจ่ายสุทธิ {fmtMoney(totalNet)}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {tab === "pending_l1" && (
                <>
                  <ActionBtn onClick={() => bulk("approve_l1")} busy={busy} variant="success">
                    อนุมัติทั้งหมด (L1)
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => {
                      const note = prompt("เหตุผลที่ปฏิเสธ");
                      if (note !== null) bulk("reject_l1", { note });
                    }}
                    busy={busy} variant="danger"
                  >
                    ปฏิเสธ
                  </ActionBtn>
                </>
              )}
              {tab === "pending_l2" && (
                <>
                  <ActionBtn onClick={() => bulk("approve_l2")} busy={busy} variant="success">
                    อนุมัติทั้งหมด (L2)
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => {
                      const note = prompt("เหตุผลที่ปฏิเสธ");
                      if (note !== null) bulk("reject_l2", { note });
                    }}
                    busy={busy} variant="danger"
                  >
                    ปฏิเสธ
                  </ActionBtn>
                </>
              )}
              {tab === "approved" && (
                <ActionBtn
                  onClick={() => {
                    const ref = prompt("เลขอ้างอิงการจ่ายเงิน");
                    if (ref !== null) bulk("mark_paid", { payment_reference: ref });
                  }}
                  busy={busy} variant="success"
                >
                  ทำเครื่องหมายว่าจ่ายแล้ว
                </ActionBtn>
              )}
            </div>
          </div>
        )}
        {err && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : slips.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ไม่มีรายการในสถานะนี้
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-50 border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="px-3 py-3 w-10">
                      <button
                        onClick={() => setPicked(allChecked ? [] : slips.map((s) => s.id))}
                        className="text-muted hover:text-foreground"
                      >
                        {allChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="px-3 py-3">เลขที่</th>
                    <th className="px-3 py-3">งวด</th>
                    <th className="px-3 py-3">พนักงาน</th>
                    <th className="px-3 py-3 text-right">รายได้รวม</th>
                    <th className="px-3 py-3 text-right">หัก</th>
                    <th className="px-3 py-3 text-right">สุทธิ</th>
                    <th className="px-3 py-3">สถานะ</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {slips.map((s) => {
                    const checked = picked.includes(s.id);
                    return (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                        <td className="px-3 py-3">
                          <button
                            onClick={() =>
                              setPicked((p) =>
                                p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id],
                              )
                            }
                          >
                            {checked ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-muted" />}
                          </button>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{s.slip_no}</td>
                        <td className="px-3 py-3 text-xs">{s.period?.name}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium">
                            {s.employee?.first_name} {s.employee?.last_name}
                          </div>
                          <div className="text-xs text-muted font-mono">{s.employee?.employee_code}</div>
                        </td>
                        <td className="px-3 py-3 text-right">{fmtMoney(s.gross_pay)}</td>
                        <td className="px-3 py-3 text-right text-red-700">
                          {fmtMoney(parseFloat(s.deductions_total) + parseFloat(s.tax) + parseFloat(s.ssf_employee))}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{fmtMoney(s.net_pay)}</td>
                        <td className="px-3 py-3">
                          <Badge label={SLIP_STATUS_LABEL[s.status as SlipStatus]} variant={SLIP_STATUS_COLOR[s.status as SlipStatus]} />
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
    </>
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
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

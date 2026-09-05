"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/payroll";
import {
  ADVANCE_STATUS_COLOR,
  ADVANCE_STATUS_LABEL,
  type EmployeeAdvance,
  type ProductionEligibility,
} from "@/lib/advance";
import { Plus, X, Loader2, AlertCircle, Wallet, Trash2, CheckCircle2, XCircle, Target } from "lucide-react";

type Form = {
  amount: string;
  request_date: string;
  reason: string;
};

const empty: Form = {
  amount: "",
  request_date: new Date().toISOString().slice(0, 10),
  reason: "",
};

export default function MyAdvancePage() {
  const [requests, setRequests] = useState<EmployeeAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch<{ data: { data: EmployeeAdvance[] } }>("/advances?mine=1&per_page=50");
      setRequests(r.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const [eligibility, setEligibility] = useState<ProductionEligibility | null>(null);
  useEffect(() => {
    apiFetch<{ data: ProductionEligibility }>("/advances/production-status")
      .then((r) => setEligibility(r.data))
      .catch(() => {});
  }, []);

  function openCreate() {
    setForm(empty);
    setErr(null);
    setShowForm(true);
  }

  async function submit() {
    if (!form.amount || Number(form.amount) <= 0) {
      setErr("กรุณากรอกจำนวนเงินให้ถูกต้อง");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await apiFetch("/advances", {
        method: "POST",
        body: {
          amount: Number(form.amount),
          request_date: form.request_date,
          reason: form.reason || null,
        },
      });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelReq(req: EmployeeAdvance) {
    if (!confirm(`ยกเลิกคำขอ ${req.request_no}?`)) return;
    try {
      await apiFetch(`/advances/${req.id}/cancel`, {
        method: "POST",
        body: { note: "ยกเลิกโดยพนักงาน" },
      });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="เบิกเงินล่วงหน้าของฉัน" />
      <div className="p-6 space-y-5">
        {eligibility && eligibility.rules.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Target className="w-4 h-4 text-primary-600" /> สถานะเป้าหมายผลิตวันนี้ (เงื่อนไขเบิกผ่านเครื่อง Tiger)
            </div>
            {eligibility.rules.map((r) => (
              <div
                key={r.rule_id}
                className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${
                  r.is_met ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {r.is_met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {r.name}
                </span>
                <span className="font-medium">{r.achieved_qty.toLocaleString()} / {r.target_qty.toLocaleString()} {r.unit}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">ประวัติคำขอเบิกเงินล่วงหน้า</h3>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
          >
            <Plus className="w-4 h-4" /> ยื่นคำขอเบิกเงิน
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
            ยังไม่เคยยื่นคำขอเบิกเงินล่วงหน้า
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50 border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="px-3 py-3">เลขที่</th>
                    <th className="px-3 py-3">วันที่ยื่น</th>
                    <th className="px-3 py-3 text-right">จำนวนเงิน</th>
                    <th className="px-3 py-3 text-right">หักคืนแล้ว</th>
                    <th className="px-3 py-3 text-right">คงเหลือ</th>
                    <th className="px-3 py-3">เหตุผล</th>
                    <th className="px-3 py-3">สถานะ</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3 font-mono text-xs">{r.request_no}</td>
                      <td className="px-3 py-3 text-xs">{fmtDate(r.request_date)}</td>
                      <td className="px-3 py-3 text-right font-medium">{fmtMoney(r.amount)}</td>
                      <td className="px-3 py-3 text-right text-muted">{fmtMoney(r.repaid_amount)}</td>
                      <td className="px-3 py-3 text-right">{fmtMoney(r.remaining_amount)}</td>
                      <td className="px-3 py-3 text-xs text-muted truncate max-w-xs">{r.reason ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Badge label={ADVANCE_STATUS_LABEL[r.status]} variant={ADVANCE_STATUS_COLOR[r.status]} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        {(r.status === "pending" || r.status === "approved") && (
                          <button
                            onClick={() => cancelReq(r)}
                            className="p-1.5 text-gray-500 hover:text-red-600"
                            title="ยกเลิก"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">ยื่นคำขอเบิกเงินล่วงหน้า</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="จำนวนเงินที่ขอเบิก (บาท) *">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className="payroll-input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="วันที่ยื่นคำขอ *">
                <input
                  type="date"
                  className="payroll-input"
                  value={form.request_date}
                  onChange={(e) => setForm({ ...form, request_date: e.target.value })}
                />
              </Field>
              <Field label="เหตุผล">
                <textarea
                  className="payroll-input"
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="ระบุเหตุผลในการเบิกเงินล่วงหน้า"
                />
              </Field>
              {err && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {err}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border">
                ยกเลิก
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                ส่งคำขอ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted mb-1 block">{label}</span>
      {children}
    </label>
  );
}

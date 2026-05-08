"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtDate } from "@/lib/payroll";
import {
  LEAVE_STATUS_COLOR,
  LEAVE_STATUS_LABEL,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/leave";
import { Plus, X, Loader2, AlertCircle, CalendarOff, Trash2 } from "lucide-react";

type Form = {
  leave_type_id: number | "";
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_period: "morning" | "afternoon";
  reason: string;
  contact_phone: string;
};

const empty: Form = {
  leave_type_id: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  is_half_day: false,
  half_day_period: "morning",
  reason: "",
  contact_phone: "",
};

export default function MyLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [r, b, t] = await Promise.all([
        apiFetch<{ data: { data: LeaveRequest[] } }>("/leave/requests?mine=1&per_page=50"),
        apiFetch<{ data: LeaveBalance[] }>("/leave/balances"),
        apiFetch<{ data: LeaveType[] }>("/leave/types?active_only=1"),
      ]);
      setRequests(r.data.data);
      setBalances(b.data);
      setTypes(t.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedType = useMemo(
    () => types.find((t) => t.id === form.leave_type_id),
    [types, form.leave_type_id],
  );

  function openCreate() {
    setForm({ ...empty, leave_type_id: types[0]?.id ?? "" });
    setErr(null);
    setShowForm(true);
  }

  async function submit() {
    if (!form.leave_type_id) {
      setErr("กรุณาเลือกประเภทการลา");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await apiFetch("/leave/requests", {
        method: "POST",
        body: {
          leave_type_id: form.leave_type_id,
          start_date: form.start_date,
          end_date: form.is_half_day ? form.start_date : form.end_date,
          is_half_day: form.is_half_day,
          half_day_period: form.is_half_day ? form.half_day_period : null,
          reason: form.reason || null,
          contact_phone: form.contact_phone || null,
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

  async function cancelReq(req: LeaveRequest) {
    if (!confirm(`ยกเลิกใบลา ${req.request_no}?`)) return;
    try {
      await apiFetch(`/leave/requests/${req.id}/cancel`, {
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
      <Topbar title="ใบลาของฉัน" />
      <div className="p-6 space-y-5">
        {/* Balances */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted">โควต้าวันลาคงเหลือ</h3>
          {balances.length === 0 ? (
            <div className="text-sm text-muted">ไม่มีโควต้าวันลา</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {balances.map((b) => {
                const total = b.quota_days + b.carryover_days;
                const used = b.used_days + b.pending_days;
                const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
                return (
                  <div
                    key={b.leave_type.id}
                    className="bg-white rounded-xl border p-3"
                    style={{ borderColor: b.leave_type.color + "55" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: b.leave_type.color }} />
                      <div className="text-sm font-medium">{b.leave_type.name}</div>
                    </div>
                    <div className="mt-2 text-2xl font-bold" style={{ color: b.leave_type.color }}>
                      {b.remaining}
                      <span className="text-xs text-muted font-normal ml-1">/ {total} วัน</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: b.leave_type.color }} />
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      ใช้ไปแล้ว {b.used_days} • รอนุมัติ {b.pending_days}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold">ประวัติคำขอลา</h3>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
          >
            <Plus className="w-4 h-4" /> ยื่นใบลา
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            <CalendarOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
            ยังไม่เคยยื่นใบลา
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50 border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="px-3 py-3">เลขที่</th>
                    <th className="px-3 py-3">ประเภท</th>
                    <th className="px-3 py-3">วันที่</th>
                    <th className="px-3 py-3 text-right">จำนวนวัน</th>
                    <th className="px-3 py-3">เหตุผล</th>
                    <th className="px-3 py-3">สถานะ</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3 font-mono text-xs">{r.request_no}</td>
                      <td className="px-3 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: (r.leave_type?.color ?? "#888") + "22", color: r.leave_type?.color ?? "#666" }}
                        >
                          {r.leave_type?.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {fmtDate(r.start_date)}
                        {r.start_date !== r.end_date && <> – {fmtDate(r.end_date)}</>}
                        {r.is_half_day && (
                          <span className="ml-1 text-muted">(ครึ่งวัน{r.half_day_period === "morning" ? "เช้า" : "บ่าย"})</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">{r.total_days}</td>
                      <td className="px-3 py-3 text-xs text-muted truncate max-w-xs">{r.reason ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Badge label={LEAVE_STATUS_LABEL[r.status]} variant={LEAVE_STATUS_COLOR[r.status]} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        {(r.status === "pending" || r.status === "draft") && (
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
              <h3 className="font-semibold">ยื่นใบลา</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="ประเภทการลา *">
                <select
                  className="payroll-input"
                  value={form.leave_type_id}
                  onChange={(e) => setForm({ ...form, leave_type_id: Number(e.target.value) })}
                >
                  <option value="">— เลือก —</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_paid ? "(จ่ายเงิน)" : "(ไม่จ่ายเงิน)"}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedType?.allow_half_day && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_half_day}
                    onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })}
                  />
                  ลาครึ่งวัน
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="วันที่เริ่ม *">
                  <input
                    type="date"
                    className="payroll-input"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value, end_date: form.is_half_day ? e.target.value : form.end_date })
                    }
                  />
                </Field>
                {form.is_half_day ? (
                  <Field label="ช่วง">
                    <select
                      className="payroll-input"
                      value={form.half_day_period}
                      onChange={(e) => setForm({ ...form, half_day_period: e.target.value as Form["half_day_period"] })}
                    >
                      <option value="morning">ช่วงเช้า</option>
                      <option value="afternoon">ช่วงบ่าย</option>
                    </select>
                  </Field>
                ) : (
                  <Field label="วันที่สิ้นสุด *">
                    <input
                      type="date"
                      className="payroll-input"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    />
                  </Field>
                )}
              </div>
              {selectedType && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                  {selectedType.requires_approval && <div>• ต้องได้รับการอนุมัติ</div>}
                  {selectedType.requires_attachment && <div>• ต้องแนบใบรับรอง</div>}
                  {selectedType.min_advance_notice_days > 0 && (
                    <div>• ต้องแจ้งล่วงหน้า {selectedType.min_advance_notice_days} วัน</div>
                  )}
                  {selectedType.max_consecutive_days && (
                    <div>• ลาติดกันได้ไม่เกิน {selectedType.max_consecutive_days} วัน</div>
                  )}
                </div>
              )}
              <Field label="เหตุผล">
                <textarea
                  className="payroll-input"
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </Field>
              <Field label="เบอร์ติดต่อ">
                <input
                  className="payroll-input"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="ใช้ติดต่อกรณีฉุกเฉิน"
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

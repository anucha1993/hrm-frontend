"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/payroll";
import {
  ADVANCE_STATUS_COLOR,
  ADVANCE_STATUS_LABEL,
  type AdvanceStatus,
  type DisbursementMethod,
  type EmployeeAdvance,
  type ProductionEligibility,
} from "@/lib/advance";
import { Loader2, Check, X, AlertCircle, FileText, Plus, Banknote, MinusCircle, CheckCircle2, XCircle, Ticket } from "lucide-react";

type EmployeeBrief = { id: number; employee_code: string; first_name: string; last_name: string };

const TABS: { key: AdvanceStatus; label: string }[] = [
  { key: "pending", label: "รออนุมัติ" },
  { key: "approved", label: "รอจ่ายเงิน" },
  { key: "paid", label: "กำลังหักคืน" },
  { key: "completed", label: "หักคืนครบแล้ว" },
  { key: "rejected", label: "ปฏิเสธ" },
  { key: "cancelled", label: "ยกเลิก" },
];

type CreateForm = { employee_id: number | ""; amount: string; request_date: string; reason: string };
const emptyCreate: CreateForm = {
  employee_id: "",
  amount: "",
  request_date: new Date().toISOString().slice(0, 10),
  reason: "",
};

export default function AdvanceApprovalPage() {
  const [tab, setTab] = useState<AdvanceStatus>("pending");
  const [requests, setRequests] = useState<EmployeeAdvance[]>([]);
  const [employees, setEmployees] = useState<EmployeeBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmployeeAdvance | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [repayForm, setRepayForm] = useState<{ amount: string; repaid_at: string; note: string } | null>(null);
  const [repayErr, setRepayErr] = useState<string | null>(null);

  const [payReq, setPayReq] = useState<EmployeeAdvance | null>(null);
  const [payMethod, setPayMethod] = useState<DisbursementMethod>("manual");
  const [payEligibility, setPayEligibility] = useState<ProductionEligibility | null>(null);
  const [payEligLoading, setPayEligLoading] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payBypass, setPayBypass] = useState(false);
  const [payBypassReason, setPayBypassReason] = useState("");

  const [empSearch, setEmpSearch] = useState("");
  const [createEligibility, setCreateEligibility] = useState<ProductionEligibility | null>(null);
  const [createEligLoading, setCreateEligLoading] = useState(false);
  const [createBypass, setCreateBypass] = useState(false);
  const [createBypassReason, setCreateBypassReason] = useState("");
  const [rowEligibility, setRowEligibility] = useState<Record<number, ProductionEligibility>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { data: EmployeeAdvance[] } }>(
        `/advances?status=${tab}&per_page=100`,
      );
      setRequests(res.data.data);
      const uniqueEmployeeIds = Array.from(new Set(res.data.data.map((r) => r.employee_id)));
      const pairs = await Promise.all(
        uniqueEmployeeIds.map(async (id) => {
          try {
            const r = await apiFetch<{ data: ProductionEligibility }>(`/advances/production-status?employee_id=${id}`);
            return [id, r.data] as const;
          } catch {
            return null;
          }
        }),
      );
      setRowEligibility(Object.fromEntries(pairs.filter((p): p is readonly [number, ProductionEligibility] => p !== null)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    apiFetch<{ data: { data: EmployeeBrief[] } }>("/employees?per_page=500&status=active")
      .then((res) => setEmployees(res.data.data))
      .catch(() => {});
  }, []);

  const empOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.employee_code} - ${e.first_name} ${e.last_name}` })),
    [employees],
  );

  const filteredEmpOptions = useMemo(() => {
    if (!empSearch.trim()) return empOptions;
    const q = empSearch.trim().toLowerCase();
    return empOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [empOptions, empSearch]);

  async function loadCreateEligibility(employeeId: number) {
    setCreateEligLoading(true);
    setCreateEligibility(null);
    try {
      const r = await apiFetch<{ data: ProductionEligibility }>(`/advances/production-status?employee_id=${employeeId}`);
      setCreateEligibility(r.data);
    } catch {
      // ไม่มีเงื่อนไขก็ยังยื่นคำขอได้ตามเดิม
    } finally {
      setCreateEligLoading(false);
    }
  }

  async function action(req: EmployeeAdvance, verb: "approve" | "reject") {
    let note: string | null = null;
    if (verb === "reject") {
      note = prompt("เหตุผลที่ปฏิเสธ");
      if (note === null) return;
    }
    setBusy(req.id);
    setErr(null);
    try {
      await apiFetch(`/advances/${req.id}/${verb}`, { method: "POST", body: { note } });
      setDetail(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ";
      setErr(msg);
    } finally {
      setBusy(null);
    }
  }

  async function openPay(req: EmployeeAdvance) {
    setPayReq(req);
    setPayMethod("manual");
    setPayErr(null);
    setPayEligibility(null);
    setPayBypass(false);
    setPayBypassReason("");
    setPayEligLoading(true);
    try {
      const res = await apiFetch<{ data: ProductionEligibility }>(`/advances/production-status?employee_id=${req.employee_id}`);
      setPayEligibility(res.data);
    } catch {
      // ไม่มีเงื่อนไขก็ยังจ่ายแบบโอนเงินปกติได้ตามเดิม
    } finally {
      setPayEligLoading(false);
    }
  }

  async function submitPay() {
    if (!payReq) return;
    if (payMethod === "tiger_voucher" && payEligibility && !payEligibility.eligible && payBypass && !payBypassReason.trim()) {
      setPayErr("กรุณาระบุเหตุผลการข้ามเงื่อนไข");
      return;
    }
    setPaySubmitting(true);
    setPayErr(null);
    try {
      const res = await apiFetch<{ data: EmployeeAdvance }>(`/advances/${payReq.id}/mark-paid`, {
        method: "POST",
        body: {
          disbursement_method: payMethod,
          bypass_eligibility: payBypass,
          bypass_reason: payBypass ? payBypassReason.trim() : null,
        },
      });
      setPayReq(null);
      setDetail(res.data);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "บันทึกจ่ายเงินไม่สำเร็จ";
      setPayErr(msg);
    } finally {
      setPaySubmitting(false);
    }
  }

  async function showDetail(req: EmployeeAdvance) {
    try {
      const res = await apiFetch<{ data: EmployeeAdvance }>(`/advances/${req.id}`);
      setDetail(res.data);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }

  async function submitCreate() {
    if (!createForm.employee_id) {
      setCreateErr("กรุณาเลือกพนักงาน");
      return;
    }
    if (!createForm.amount || Number(createForm.amount) <= 0) {
      setCreateErr("กรุณากรอกจำนวนเงินให้ถูกต้อง");
      return;
    }
    if (createEligibility && !createEligibility.eligible && (!createBypass || !createBypassReason.trim())) {
      setCreateErr("พนักงานคนนี้ยังไม่ผ่านเงื่อนไข กรุณาติ๊กข้ามเงื่อนไขและระบุเหตุผล หากต้องการบันทึกต่อ");
      return;
    }
    setSubmitting(true);
    setCreateErr(null);
    try {
      await apiFetch("/advances", {
        method: "POST",
        body: {
          employee_id: createForm.employee_id,
          amount: Number(createForm.amount),
          request_date: createForm.request_date,
          reason: createForm.reason || null,
          bypass_eligibility: createBypass,
          bypass_reason: createBypass ? createBypassReason.trim() : null,
        },
      });
      setShowCreate(false);
      setCreateForm(emptyCreate);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      setCreateErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRepayment() {
    if (!detail || !repayForm) return;
    if (!repayForm.amount || Number(repayForm.amount) <= 0) {
      setRepayErr("กรุณากรอกจำนวนเงินให้ถูกต้อง");
      return;
    }
    setSubmitting(true);
    setRepayErr(null);
    try {
      const res = await apiFetch<{ data: EmployeeAdvance }>(`/advances/${detail.id}/repayments`, {
        method: "POST",
        body: {
          amount: Number(repayForm.amount),
          repaid_at: repayForm.repaid_at,
          note: repayForm.note || null,
        },
      });
      setDetail(res.data);
      setRepayForm(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      setRepayErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Topbar title="อนุมัติเบิกเงินล่วงหน้า" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key
                  ? "border-primary-500 text-primary-700"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => { setCreateForm(emptyCreate); setCreateErr(null); setEmpSearch(""); setCreateEligibility(null); setCreateBypass(false); setCreateBypassReason(""); setShowCreate(true); }}
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium hover:from-primary-600 hover:to-accent-600 mb-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> บันทึกคำขอใหม่
          </button>
        </div>

        {err && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ไม่มีรายการ
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-50 border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="px-3 py-3">เลขที่</th>
                    <th className="px-3 py-3">พนักงาน</th>
                    <th className="px-3 py-3">วันที่ยื่น</th>
                    <th className="px-3 py-3 text-right">จำนวนเงิน</th>
                    <th className="px-3 py-3 text-right">คงเหลือ</th>
                    <th className="px-3 py-3">เหตุผล</th>
                    <th className="px-3 py-3">สถานะ</th>
                    <th className="px-3 py-3">เงื่อนไข Tiger</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3 font-mono text-xs">{r.request_no}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {r.employee?.first_name} {r.employee?.last_name}
                        </div>
                        <div className="text-xs text-muted font-mono">{r.employee?.employee_code}</div>
                      </td>
                      <td className="px-3 py-3 text-xs">{fmtDate(r.request_date)}</td>
                      <td className="px-3 py-3 text-right font-medium">{fmtMoney(r.amount)}</td>
                      <td className="px-3 py-3 text-right">{fmtMoney(r.remaining_amount)}</td>
                      <td className="px-3 py-3 text-xs text-muted truncate max-w-xs">{r.reason ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Badge label={ADVANCE_STATUS_LABEL[r.status]} variant={ADVANCE_STATUS_COLOR[r.status]} />
                      </td>
                      <td className="px-3 py-3">
                        <EligibilityBadge elig={rowEligibility[r.employee_id]} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => showDetail(r)}
                            className="p-1.5 text-gray-500 hover:text-primary-600"
                            title="ดู"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() => action(r, "approve")}
                                disabled={busy === r.id}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> อนุมัติ
                              </button>
                              <button
                                onClick={() => action(r, "reject")}
                                disabled={busy === r.id}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> ปฏิเสธ
                              </button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <button
                              onClick={() => openPay(r)}
                              className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Banknote className="w-3.5 h-3.5" /> บันทึกจ่ายเงิน
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">บันทึกคำขอเบิกเงินล่วงหน้า</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="พนักงาน *">
                <input
                  type="text"
                  placeholder="ค้นหารหัส/ชื่อพนักงาน..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="payroll-input mb-1"
                />
                <select
                  className="payroll-input"
                  value={createForm.employee_id}
                  size={Math.min(6, Math.max(3, filteredEmpOptions.length || 1))}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setCreateForm({ ...createForm, employee_id: id });
                    setCreateBypass(false);
                    setCreateBypassReason("");
                    if (id) loadCreateEligibility(id);
                  }}
                >
                  <option value="">— เลือก —</option>
                  {filteredEmpOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              {createForm.employee_id !== "" && (
                <EligibilityPanel loading={createEligLoading} elig={createEligibility} />
              )}

              {createEligibility && !createEligibility.eligible && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createBypass}
                      onChange={(e) => setCreateBypass(e.target.checked)}
                    />
                    <span className="font-medium">ข้ามเงื่อนไข (กรณีพิเศษ) — อนุมัติให้บันทึกคำขอได้แม้ยังไม่ถึงเป้า</span>
                  </label>
                  {createBypass && (
                    <textarea
                      className="payroll-input"
                      rows={2}
                      placeholder="ระบุเหตุผลที่ขอข้ามเงื่อนไข (จำเป็น)..."
                      value={createBypassReason}
                      onChange={(e) => setCreateBypassReason(e.target.value)}
                    />
                  )}
                  <p className="text-xs text-amber-700">การข้ามเงื่อนไขจะถูกบันทึกไว้ในประวัติคำขอนี้ พร้อมชื่อผู้อนุมัติและวันเวลา</p>
                </div>
              )}

              <Field label="จำนวนเงิน (บาท) *">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className="payroll-input"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="วันที่ยื่นคำขอ *">
                <input
                  type="date"
                  className="payroll-input"
                  value={createForm.request_date}
                  onChange={(e) => setCreateForm({ ...createForm, request_date: e.target.value })}
                />
              </Field>
              <Field label="เหตุผล">
                <textarea
                  className="payroll-input"
                  rows={3}
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                />
              </Field>
              {createErr && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {createErr}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg border border-border">
                ยกเลิก
              </button>
              <button
                onClick={submitCreate}
                disabled={
                  submitting ||
                  (createEligibility && !createEligibility.eligible
                    ? !(createBypass && createBypassReason.trim().length > 0)
                    : false)
                }
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{detail.request_no}</h3>
              <button onClick={() => { setDetail(null); setRepayForm(null); }} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <KV label="พนักงาน" value={`${detail.employee?.first_name} ${detail.employee?.last_name} (${detail.employee?.employee_code})`} />
              <KV label="วันที่ยื่นคำขอ" value={fmtDate(detail.request_date)} />
              <KV label="จำนวนเงิน" value={`${fmtMoney(detail.amount)} บาท`} />
              <KV label="หักคืนแล้ว" value={`${fmtMoney(detail.repaid_amount)} บาท`} />
              <KV label="คงเหลือ" value={`${fmtMoney(detail.remaining_amount)} บาท`} />
              <KV label="เหตุผล" value={detail.reason ?? "—"} />
              <KV label="สถานะ" value={ADVANCE_STATUS_LABEL[detail.status]} />
              {detail.approver && <KV label="ผู้พิจารณา" value={detail.approver.name} />}
              {detail.approval_note && <KV label="หมายเหตุการพิจารณา" value={detail.approval_note} />}
              {detail.payer && <KV label="ผู้จ่ายเงิน" value={`${detail.payer.name} (${fmtDate(detail.paid_at)})`} />}
              {detail.disbursement_method === "tiger_voucher" && detail.tiger_voucher_code && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-orange-600" />
                  <div className="text-sm">
                    <div className="text-xs text-muted">รหัส Tiger Voucher</div>
                    <div className="font-mono font-semibold">{detail.tiger_voucher_code}</div>
                  </div>
                </div>
              )}
              {detail.eligibility_bypassed && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <div className="text-xs font-semibold text-amber-800">ข้ามเงื่อนไขการเบิก (กรณีพิเศษ)</div>
                  <div className="text-xs text-amber-800">เหตุผล: {detail.eligibility_bypass_reason ?? "—"}</div>
                  {detail.bypassed_by && (
                    <div className="text-xs text-amber-700">อนุมัติโดย: {detail.bypassed_by.name} ({fmtDate(detail.eligibility_bypass_at)})</div>
                  )}
                </div>
              )}

              {(detail.status === "paid" || detail.status === "completed") && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-muted">ประวัติการหักคืน</div>
                    {detail.status === "paid" && (
                      <button
                        onClick={() => { setRepayForm({ amount: "", repaid_at: new Date().toISOString().slice(0, 10), note: "" }); setRepayErr(null); }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100"
                      >
                        <MinusCircle className="w-3.5 h-3.5" /> บันทึกหักคืน
                      </button>
                    )}
                  </div>
                  {(detail.repayments ?? []).length === 0 ? (
                    <div className="text-xs text-muted">ยังไม่มีการหักคืน</div>
                  ) : (
                    <div className="space-y-1">
                      {detail.repayments!.map((rp) => (
                        <div key={rp.id} className="text-xs flex items-center justify-between border-b border-border/60 pb-1">
                          <span className="text-muted">{fmtDate(rp.repaid_at)} {rp.note && <>· {rp.note}</>}</span>
                          <span className="font-medium">{fmtMoney(rp.amount)} บาท</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {repayForm && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2">
                      <Field label="จำนวนเงินที่หักคืน (บาท) *">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="payroll-input"
                          value={repayForm.amount}
                          onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                        />
                      </Field>
                      <Field label="วันที่หักคืน">
                        <input
                          type="date"
                          className="payroll-input"
                          value={repayForm.repaid_at}
                          onChange={(e) => setRepayForm({ ...repayForm, repaid_at: e.target.value })}
                        />
                      </Field>
                      <Field label="หมายเหตุ">
                        <input
                          className="payroll-input"
                          value={repayForm.note}
                          onChange={(e) => setRepayForm({ ...repayForm, note: e.target.value })}
                          placeholder="เช่น หักจากงวดเงินเดือน..."
                        />
                      </Field>
                      {repayErr && (
                        <div className="bg-red-50 text-red-700 text-xs rounded-lg p-2 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" /> {repayErr}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setRepayForm(null)} className="px-3 py-1.5 text-xs rounded-lg border border-border">
                          ยกเลิก
                        </button>
                        <button
                          onClick={submitRepayment}
                          disabled={submitting}
                          className="px-3 py-1.5 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          บันทึก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {detail.status === "pending" && (
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
                <button
                  onClick={() => action(detail, "reject")}
                  disabled={busy === detail.id}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  ปฏิเสธ
                </button>
                <button
                  onClick={() => action(detail, "approve")}
                  disabled={busy === detail.id}
                  className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  อนุมัติ
                </button>
              </div>
            )}
            {detail.status === "approved" && (
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
                <button
                  onClick={() => openPay(detail)}
                  className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Banknote className="w-4 h-4" /> บันทึกจ่ายเงิน
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mark-paid modal: choose disbursement method + show production target eligibility */}
      {payReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPayReq(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">บันทึกจ่ายเงิน — {payReq.request_no}</h3>
              <button onClick={() => setPayReq(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <KV label="พนักงาน" value={`${payReq.employee?.first_name} ${payReq.employee?.last_name} (${payReq.employee?.employee_code})`} />
              <KV label="จำนวนเงิน" value={`${fmtMoney(payReq.amount)} บาท`} />

              <div>
                <div className="text-xs font-medium text-muted mb-1.5">วิธีจ่ายเงิน</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 border border-border rounded-lg p-2.5 cursor-pointer">
                    <input type="radio" checked={payMethod === "manual"} onChange={() => setPayMethod("manual")} />
                    <span>โอนเงิน / จ่ายเงินสด (ปกติ)</span>
                  </label>
                  <label className="flex items-center gap-2 border border-border rounded-lg p-2.5 cursor-pointer">
                    <input type="radio" checked={payMethod === "tiger_voucher"} onChange={() => setPayMethod("tiger_voucher")} />
                    <span>ผ่านเครื่อง Tiger (สร้าง Voucher)</span>
                  </label>
                </div>
              </div>

              {payMethod === "tiger_voucher" && (
                <EligibilityPanel loading={payEligLoading} elig={payEligibility} />
              )}

              {payMethod === "tiger_voucher" && payEligibility && !payEligibility.eligible && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payBypass}
                      onChange={(e) => setPayBypass(e.target.checked)}
                    />
                    <span className="font-medium">ข้ามเงื่อนไข (กรณีพิเศษ) — อนุมัติให้เบิกได้แม้ยังไม่ถึงเป้า</span>
                  </label>
                  {payBypass && (
                    <textarea
                      className="payroll-input"
                      rows={2}
                      placeholder="ระบุเหตุผลที่ขอข้ามเงื่อนไข (จำเป็น) เช่น เหตุจำเป็นเร่งด่วน อนุมัติโดยผู้จัดการ..."
                      value={payBypassReason}
                      onChange={(e) => setPayBypassReason(e.target.value)}
                    />
                  )}
                  <p className="text-xs text-amber-700">การข้ามเงื่อนไขจะถูกบันทึกไว้ในประวัติคำขอนี้ พร้อมชื่อผู้อนุมัติและวันเวลา</p>
                </div>
              )}

              {payErr && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {payErr}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => setPayReq(null)} className="px-4 py-2 text-sm rounded-lg border border-border">
                ยกเลิก
              </button>
              <button
                onClick={submitPay}
                disabled={
                  paySubmitting ||
                  (payMethod === "tiger_voucher" && payEligibility && !payEligibility.eligible
                    ? !(payBypass && payBypassReason.trim().length > 0)
                    : false)
                }
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {paySubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                ยืนยันจ่ายเงิน
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

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted text-xs w-32 flex-shrink-0">{label}:</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}

/** สถานะเป้าหมายผลิต/เงื่อนไขเบิกผ่านเครื่อง Tiger แบบเต็ม — ใช้ในหน้าจ่ายเงินและตอนสร้างคำขอ */
function EligibilityPanel({ loading, elig }: { loading: boolean; elig: ProductionEligibility | null }) {
  if (loading) {
    return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }
  if (!elig || elig.rules.length === 0) {
    return <div className="text-xs text-muted">ไม่มีเงื่อนไขเป้าหมายผลิตที่เกี่ยวข้อง</div>;
  }
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted">สถานะเป้าหมายผลิต/เงื่อนไขเบิกวันนี้</div>
      {elig.rules.map((r) => (
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
      {!elig.eligible && (
        <div className="bg-red-50 text-red-700 text-xs rounded-lg p-2.5">
          ยังไม่ผ่านเงื่อนไขที่กำหนด จึงยังเบิกผ่านเครื่อง Tiger ไม่ได้
        </div>
      )}
    </div>
  );
}

/** ป้ายสถานะย่อ ใช้ในตารางรายการ — บอกทันทีว่าพนักงานคนนี้เข้าเงื่อนไขเบิกผ่านเครื่อง Tiger หรือยัง */
function EligibilityBadge({ elig }: { elig?: ProductionEligibility }) {
  if (!elig) return <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />;
  if (elig.rules.length === 0) return <span className="text-xs text-muted">—</span>;
  return elig.eligible ? (
    <Badge label="ผ่านเงื่อนไข" variant="success" />
  ) : (
    <Badge label={`ไม่ผ่าน ${elig.failed_rules.length} ข้อ`} variant="danger" />
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ShiftSwapRequest, ShiftDayOverride, Employee, WorkShift, ShiftSwapStatus } from "@/lib/types";
import { ArrowLeftRight, CalendarCog, Plus, X, Check, Ban, Trash2, ArrowRight } from "lucide-react";

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function fmtDate(iso: string): string {
  const [y, m, d] = iso.substring(0, 10).split("-").map((x) => parseInt(x, 10));
  return `${d} ${TH_MONTHS[(m || 1) - 1]} ${y + 543}`;
}
function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

const STATUS_BADGE: Record<ShiftSwapStatus, { label: string; cls: string }> = {
  pending: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700" },
  rejected: { label: "ปฏิเสธ", cls: "bg-rose-100 text-rose-700" },
  cancelled: { label: "ยกเลิก", cls: "bg-slate-100 text-slate-600" },
};

export default function ShiftSwapsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("attendance.manage");
  const [section, setSection] = useState<"swaps" | "overrides">("swaps");

  if (!canManage) {
    return (
      <>
        <Topbar title="สลับกะ & ปรับกะรายวัน" />
        <div className="p-6">
          <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
            เฉพาะเจ้าหน้าที่ (HR/ผู้ดูแลระบบ) เท่านั้นที่จัดการการสลับกะได้
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="สลับกะ & ปรับกะรายวัน" />
      <div className="p-6 space-y-5">
        <div className="flex gap-1 border-b border-border">
          <SectionBtn active={section === "swaps"} onClick={() => setSection("swaps")} icon={<ArrowLeftRight className="w-4 h-4" />} label="คำขอสลับกะ" />
          <SectionBtn active={section === "overrides"} onClick={() => setSection("overrides")} icon={<CalendarCog className="w-4 h-4" />} label="ปรับกะรายวัน" />
        </div>

        {section === "swaps" ? <SwapsSection /> : <OverridesSection />}
      </div>
    </>
  );
}

function SectionBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
        active ? "border-primary-600 text-primary-600" : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ============================= คำขอสลับกะ ============================= */
function SwapsSection() {
  const [items, setItems] = useState<ShiftSwapRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [fRequester, setFRequester] = useState("");
  const [fCounterparty, setFCounterparty] = useState("");
  const [fDate, setFDate] = useState(todayStr());
  const [fCrossDay, setFCrossDay] = useState(false);
  const [fCounterDate, setFCounterDate] = useState(todayStr());
  const [fReason, setFReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const reqs = await apiFetch<{ data: ShiftSwapRequest[] }>(`/shift-swaps${qs}`);
      setItems(reqs.data || []);
      if (employees.length === 0) {
        const emp = await apiFetch<{ data: Employee[] }>("/employees?per_page=500&status=active");
        setEmployees(emp.data || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, employees.length]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setFRequester("");
    setFCounterparty("");
    setFDate(todayStr());
    setFCrossDay(false);
    setFCounterDate(todayStr());
    setFReason("");
    setError(null);
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        requester_id: parseInt(fRequester, 10),
        counterparty_id: parseInt(fCounterparty, 10),
        requester_date: fDate,
        counterparty_date: fCrossDay ? fCounterDate : fDate,
        reason: fReason || null,
      };
      await apiFetch("/shift-swaps", { method: "POST", body });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function act(req: ShiftSwapRequest, action: "approve" | "reject" | "cancel" | "delete") {
    try {
      if (action === "delete") {
        if (!confirm("ลบคำขอนี้? หากอนุมัติแล้วระบบจะคืนกะกลับให้อัตโนมัติ")) return;
        await apiFetch(`/shift-swaps/${req.id}`, { method: "DELETE" });
      } else if (action === "cancel") {
        if (!confirm("ยกเลิกคำขอนี้?")) return;
        await apiFetch(`/shift-swaps/${req.id}/cancel`, { method: "POST" });
      } else {
        const note = action === "reject" ? prompt("เหตุผลการปฏิเสธ (ไม่บังคับ)") ?? "" : "";
        await apiFetch(`/shift-swaps/${req.id}/${action}`, { method: "POST", body: { note } });
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  }

  function shiftText(s?: WorkShift | null): string {
    return s ? `${s.name} (${s.start_time?.substring(0, 5)}-${s.end_time?.substring(0, 5)})` : "ไม่มีกะ/หยุด";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">บันทึกการสลับกะให้พนักงาน · เมื่ออนุมัติ ระบบจะปรับกะให้ทั้งสองฝ่ายอัตโนมัติ</p>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="">ทุกสถานะ</option>
            <option value="pending">รออนุมัติ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">
            <Plus className="w-4 h-4" /> เพิ่มการสลับกะ
          </button>
        </div>
      </div>

      {error && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-border text-left text-xs font-semibold text-muted uppercase">
              <th className="px-4 py-3">ผู้ขอ</th>
              <th className="px-4 py-3">คู่สลับ</th>
              <th className="px-4 py-3">รายละเอียดการสลับ</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3 w-32">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">ยังไม่มีคำขอสลับกะ</td></tr>
            ) : items.map((r) => {
              const sameDay = r.requester_date.substring(0, 10) === r.counterparty_date.substring(0, 10);
              return (
                <tr key={r.id} className="hover:bg-surface/50 align-top">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-foreground">{r.requester?.full_name ?? `#${r.requester_id}`}</div>
                    <div className="text-xs text-muted">{fmtDate(r.requester_date)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-foreground">{r.counterparty?.full_name ?? `#${r.counterparty_id}`}</div>
                    <div className="text-xs text-muted">{fmtDate(r.counterparty_date)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{shiftText(r.requester_shift)}</span>
                      <ArrowLeftRight className="w-3.5 h-3.5 text-muted" />
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{shiftText(r.counterparty_shift)}</span>
                    </div>
                    <div className="text-[11px] text-muted mt-1">
                      {sameDay ? "สลับกะวันเดียวกัน" : "สลับวันทำงานกัน"}
                      {r.reason ? ` · ${r.reason}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[r.status].cls}`}>{STATUS_BADGE[r.status].label}</span>
                    {r.approver && r.status !== "pending" && <div className="text-[11px] text-muted mt-1">โดย {r.approver.name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => act(r, "approve")} title="อนุมัติ" className="p-1.5 rounded hover:bg-green-50 text-green-600"><Check className="w-4 h-4" /></button>
                          <button onClick={() => act(r, "reject")} title="ปฏิเสธ" className="p-1.5 rounded hover:bg-rose-50 text-rose-600"><Ban className="w-4 h-4" /></button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <button onClick={() => act(r, "cancel")} title="ยกเลิก/คืนกะ" className="px-2 py-1 text-xs rounded border border-border hover:bg-surface">ยกเลิก</button>
                      )}
                      <button onClick={() => act(r, "delete")} title="ลบ" className="p-1.5 rounded hover:bg-surface text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">ขอสลับกะ</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              {error && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ผู้ขอ (พนักงานคนที่ 1) *</label>
                <select required value={fRequester} onChange={(e) => setFRequester(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="">— เลือกพนักงาน —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.employee_code} · {emp.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">คู่สลับ (พนักงานคนที่ 2) *</label>
                <select required value={fCounterparty} onChange={(e) => setFCounterparty(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="">— เลือกพนักงาน —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.employee_code} · {emp.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{fCrossDay ? "วันของผู้ขอ *" : "วันที่สลับ *"}</label>
                <input required type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fCrossDay} onChange={(e) => setFCrossDay(e.target.checked)} />
                สลับคนละวัน (ต่างคนไปทำกะอีกฝ่ายในวันของอีกฝ่าย)
              </label>
              {fCrossDay && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">วันของคู่สลับ *</label>
                  <input required type="date" value={fCounterDate} onChange={(e) => setFCounterDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">เหตุผล</label>
                <input value={fReason} onChange={(e) => setFReason(e.target.value)} placeholder="เช่น ติดธุระส่วนตัว" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "กำลังส่ง..." : "ส่งคำขอ"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================= ปรับกะรายวัน ============================= */
function OverridesSection() {
  const [items, setItems] = useState<ShiftDayOverride[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState("");
  const [error, setError] = useState<string | null>(null);

  // form
  const [fEmp, setFEmp] = useState("");
  const [fDate, setFDate] = useState(todayStr());
  const [fDayOff, setFDayOff] = useState(false);
  const [fShift, setFShift] = useState("");
  const [fNote, setFNote] = useState("");
  const [saving, setSaving] = useState(false);

  const empMap = useMemo(() => {
    const m = new Map<number, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterEmp ? `?employee_id=${filterEmp}` : "";
      const ov = await apiFetch<{ data: ShiftDayOverride[] }>(`/shift-overrides${qs}`);
      setItems(ov.data || []);
      if (employees.length === 0 || shifts.length === 0) {
        const [emp, sh] = await Promise.all([
          apiFetch<{ data: Employee[] }>("/employees?per_page=500&status=active"),
          apiFetch<{ data: WorkShift[] }>("/work-shifts?active_only=1"),
        ]);
        setEmployees(emp.data || []);
        setShifts(sh.data || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filterEmp, employees.length, shifts.length]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        employee_id: parseInt(fEmp, 10),
        date: fDate,
        is_day_off: fDayOff,
        work_shift_id: fDayOff ? null : (fShift ? parseInt(fShift, 10) : null),
        note: fNote || null,
      };
      await apiFetch("/shift-overrides", { method: "POST", body });
      setFEmp("");
      setFDayOff(false);
      setFShift("");
      setFNote("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove(o: ShiftDayOverride) {
    if (o.source !== "manual") {
      alert("รายการนี้มาจากการสลับกะ กรุณายกเลิกที่คำขอสลับกะแทน");
      return;
    }
    if (!confirm("ลบการปรับกะรายการนี้?")) return;
    try {
      await apiFetch(`/shift-overrides/${o.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">กำหนดกะเฉพาะวัน (ปรับมือ) ให้พนักงานรายคน · มีลำดับความสำคัญสูงสุด ลบล้างกะปกติ/หมุนเวียน</p>

      <form onSubmit={submit} className="bg-white border border-border rounded-xl p-4 grid grid-cols-12 gap-3 items-end">
        <div className="col-span-12 md:col-span-3">
          <label className="block text-[11px] font-medium text-muted mb-1">พนักงาน *</label>
          <select required value={fEmp} onChange={(e) => setFEmp(e.target.value)} className="w-full px-2 py-2 border border-border rounded-lg text-sm">
            <option value="">— เลือก —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.employee_code} · {emp.full_name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="block text-[11px] font-medium text-muted mb-1">วันที่ *</label>
          <input required type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="w-full px-2 py-2 border border-border rounded-lg text-sm" />
        </div>
        <div className="col-span-6 md:col-span-3">
          <label className="block text-[11px] font-medium text-muted mb-1">กะ</label>
          <select value={fShift} onChange={(e) => setFShift(e.target.value)} disabled={fDayOff} className="w-full px-2 py-2 border border-border rounded-lg text-sm disabled:bg-surface disabled:opacity-60">
            <option value="">— เลือกกะ —</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-6 md:col-span-2 flex items-center pb-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fDayOff} onChange={(e) => setFDayOff(e.target.checked)} />
            วันหยุด
          </label>
        </div>
        <div className="col-span-6 md:col-span-2">
          <button type="submit" disabled={saving} className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "..." : "บันทึก"}</button>
        </div>
        <div className="col-span-12">
          <input value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="หมายเหตุ (ไม่บังคับ)" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
        </div>
      </form>

      {error && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">กรอง:</span>
        <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
          <option value="">พนักงานทั้งหมด</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.employee_code} · {emp.full_name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-border text-left text-xs font-semibold text-muted uppercase">
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">พนักงาน</th>
              <th className="px-4 py-3">กะ</th>
              <th className="px-4 py-3">ที่มา</th>
              <th className="px-4 py-3">หมายเหตุ</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">ยังไม่มีการปรับกะรายวัน</td></tr>
            ) : items.map((o) => (
              <tr key={o.id} className="hover:bg-surface/50">
                <td className="px-4 py-3 text-sm font-medium">{fmtDate(o.date)}</td>
                <td className="px-4 py-3 text-sm">{o.employee?.full_name ?? empMap.get(o.employee_id)?.full_name ?? `#${o.employee_id}`}</td>
                <td className="px-4 py-3 text-sm">
                  {o.is_day_off
                    ? <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs">วันหยุด</span>
                    : <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs">{o.work_shift?.name ?? `กะ #${o.work_shift_id}`}</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {o.source === "swap"
                    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><ArrowRight className="w-3 h-3" />สลับกะ</span>
                    : <span className="text-xs text-muted">ปรับมือ</span>}
                </td>
                <td className="px-4 py-3 text-sm text-muted">{o.note ?? "-"}</td>
                <td className="px-4 py-3">
                  {o.source === "manual" && (
                    <button onClick={() => remove(o)} className="p-1.5 rounded hover:bg-surface text-red-600"><Trash2 className="w-4 h-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

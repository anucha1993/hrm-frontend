"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ShiftRotation, EmployeeRotation, WorkShift, Employee } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Users, RotateCw, ArrowRight } from "lucide-react";

type SlotVal = number | null; // work_shift_id หรือ null = วันหยุดของช่วงนั้น

type FormState = {
  id?: number;
  name: string;
  days_per_step: string;
  anchor_date: string;
  description: string;
  is_active: boolean;
  sequence: SlotVal[];
};

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

const emptyForm: FormState = {
  name: "",
  days_per_step: "7",
  anchor_date: todayStr(),
  description: "",
  is_active: true,
  sequence: [null],
};

export default function RotationsTab() {
  const [items, setItems] = useState<ShiftRotation[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // assignment modal
  const [assignRot, setAssignRot] = useState<ShiftRotation | null>(null);
  const [assignments, setAssignments] = useState<EmployeeRotation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignForm, setAssignForm] = useState({ employee_id: "", offset: "0", effective_from: todayStr(), effective_to: "" });
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const shiftMap = useMemo(() => {
    const m = new Map<number, WorkShift>();
    shifts.forEach((s) => m.set(s.id, s));
    return m;
  }, [shifts]);

  function shiftLabel(id: SlotVal): string {
    if (id == null) return "หยุด";
    return shiftMap.get(id)?.name ?? `กะ #${id}`;
  }

  async function load() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        apiFetch<{ data: ShiftRotation[] }>("/shift-rotations"),
        apiFetch<{ data: WorkShift[] }>("/work-shifts?active_only=1"),
      ]);
      setItems(r.data || []);
      setShifts(s.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ ...emptyForm, sequence: [shifts[0]?.id ?? null] });
    setError(null);
    setShowForm(true);
  }

  function openEdit(r: ShiftRotation) {
    setForm({
      id: r.id,
      name: r.name,
      days_per_step: String(r.days_per_step),
      anchor_date: r.anchor_date.substring(0, 10),
      description: r.description ?? "",
      is_active: r.is_active,
      sequence: r.sequence.length ? r.sequence : [null],
    });
    setError(null);
    setShowForm(true);
  }

  function setSlot(idx: number, val: SlotVal) {
    setForm((f) => ({ ...f, sequence: f.sequence.map((s, i) => (i === idx ? val : s)) }));
  }
  function addSlot() {
    setForm((f) => ({ ...f, sequence: [...f.sequence, shifts[0]?.id ?? null] }));
  }
  function removeSlot(idx: number) {
    setForm((f) => ({ ...f, sequence: f.sequence.length > 1 ? f.sequence.filter((_, i) => i !== idx) : f.sequence }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        sequence: form.sequence,
        days_per_step: parseInt(form.days_per_step, 10) || 7,
        anchor_date: form.anchor_date,
        description: form.description || null,
        is_active: form.is_active,
      };
      if (form.id) {
        await apiFetch(`/shift-rotations/${form.id}`, { method: "PUT", body: payload });
      } else {
        await apiFetch("/shift-rotations", { method: "POST", body: payload });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: ShiftRotation) {
    if (!confirm(`ลบรอบ "${r.name}"? พนักงานที่อยู่ในรอบจะถูกนำออกด้วย`)) return;
    try {
      await apiFetch(`/shift-rotations/${r.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  async function openAssign(r: ShiftRotation) {
    setAssignRot(r);
    setAssignError(null);
    setAssignForm({ employee_id: "", offset: "0", effective_from: todayStr(), effective_to: "" });
    try {
      const [detail, emp] = await Promise.all([
        apiFetch<{ data: ShiftRotation }>(`/shift-rotations/${r.id}`),
        employees.length ? Promise.resolve({ data: employees }) : apiFetch<{ data: Employee[] }>("/employees?per_page=500&status=active"),
      ]);
      setAssignments(detail.data.assignments || []);
      if (!employees.length) setEmployees((emp as { data: Employee[] }).data || []);
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!assignRot || !assignForm.employee_id) return;
    setAssignBusy(true);
    setAssignError(null);
    try {
      const body = {
        employee_id: parseInt(assignForm.employee_id, 10),
        offset: parseInt(assignForm.offset, 10) || 0,
        effective_from: assignForm.effective_from,
        effective_to: assignForm.effective_to || null,
      };
      const res = await apiFetch<{ data: EmployeeRotation }>(`/shift-rotations/${assignRot.id}/assignments`, { method: "POST", body });
      setAssignments((a) => [...a, res.data]);
      setAssignForm({ employee_id: "", offset: "0", effective_from: todayStr(), effective_to: "" });
      await load();
    } catch (e) {
      setAssignError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ");
    } finally {
      setAssignBusy(false);
    }
  }

  async function removeAssignment(a: EmployeeRotation) {
    if (!assignRot) return;
    if (!confirm("นำพนักงานคนนี้ออกจากรอบ?")) return;
    try {
      await apiFetch(`/shift-rotations/${assignRot.id}/assignments/${a.id}`, { method: "DELETE" });
      setAssignments((list) => list.filter((x) => x.id !== a.id));
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "นำออกไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">กำหนดลำดับกะที่หมุนเวียน · มอบหมายพนักงานพร้อม &quot;จุดเริ่ม (offset)&quot; ให้เหลื่อมกะกัน</p>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">
          <Plus className="w-4 h-4" /> เพิ่มรอบหมุนเวียน
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-border text-left text-xs font-semibold text-muted uppercase">
              <th className="px-5 py-3">ชื่อรอบ</th>
              <th className="px-5 py-3">ลำดับกะ</th>
              <th className="px-5 py-3">เปลี่ยนทุก</th>
              <th className="px-5 py-3">เริ่มรอบ</th>
              <th className="px-5 py-3">พนักงาน</th>
              <th className="px-5 py-3">สถานะ</th>
              <th className="px-5 py-3 w-32">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">ยังไม่มีรอบหมุนเวียน</td></tr>
            ) : items.map((r) => (
              <tr key={r.id} className="hover:bg-surface/50">
                <td className="px-5 py-3 text-sm font-medium text-foreground">{r.name}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {r.sequence.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        {i > 0 && <ArrowRight className="w-3 h-3 text-muted" />}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s == null ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"}`}>{shiftLabel(s)}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-sm">{r.days_per_step} วัน</td>
                <td className="px-5 py-3 text-sm">{r.anchor_date.substring(0, 10)}</td>
                <td className="px-5 py-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-muted"><Users className="w-3.5 h-3.5" />{r.assignments_count ?? 0}</span>
                </td>
                <td className="px-5 py-3 text-sm">{r.is_active ? <span className="text-green-600 text-xs">ใช้งาน</span> : <span className="text-muted text-xs">ปิด</span>}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => openAssign(r)} title="มอบหมายพนักงาน" className="p-1.5 rounded hover:bg-surface text-emerald-600"><Users className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(r)} title="แก้ไข" className="p-1.5 rounded hover:bg-surface text-primary-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(r)} title="ลบ" className="p-1.5 rounded hover:bg-surface text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- modal: create/edit rotation ---------- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white">
              <h3 className="font-semibold text-foreground">{form.id ? "แก้ไขรอบหมุนเวียน" : "เพิ่มรอบหมุนเวียน"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ชื่อรอบ *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น หมุน 3 กะ รายสัปดาห์" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">เปลี่ยนกะทุกกี่วัน *</label>
                  <input required type="number" min={1} value={form.days_per_step} onChange={(e) => setForm({ ...form, days_per_step: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                  <p className="text-[11px] text-muted mt-1">7 = รายสัปดาห์, 1 = รายวัน</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">วันเริ่มรอบ (ช่องแรก) *</label>
                  <input required type="date" value={form.anchor_date} onChange={(e) => setForm({ ...form, anchor_date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-muted">ลำดับกะในหนึ่งรอบ *</label>
                  <button type="button" onClick={addSlot} className="inline-flex items-center gap-1 text-xs text-primary-600"><Plus className="w-3 h-3" /> เพิ่มช่วง</button>
                </div>
                <div className="space-y-2">
                  {form.sequence.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-7 text-xs text-muted text-center">{idx + 1}</span>
                      <select
                        value={slot == null ? "" : String(slot)}
                        onChange={(e) => setSlot(idx, e.target.value === "" ? null : parseInt(e.target.value, 10))}
                        className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
                      >
                        <option value="">— วันหยุด —</option>
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeSlot(idx)} disabled={form.sequence.length <= 1} className="p-1.5 rounded hover:bg-surface text-red-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-1">รอบจะวนกลับช่องแรกหลังครบทุกช่วง</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">หมายเหตุ</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                ใช้งาน
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- modal: assignments ---------- */}
      {assignRot && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white">
              <h3 className="font-semibold text-foreground inline-flex items-center gap-2"><RotateCw className="w-4 h-4 text-emerald-600" /> พนักงานในรอบ: {assignRot.name}</h3>
              <button onClick={() => setAssignRot(null)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {assignError && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{assignError}</div>}

              <form onSubmit={addAssignment} className="grid grid-cols-12 gap-2 items-end bg-surface/60 p-3 rounded-lg">
                <div className="col-span-5">
                  <label className="block text-[11px] font-medium text-muted mb-1">พนักงาน</label>
                  <select required value={assignForm.employee_id} onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })} className="w-full px-2 py-2 border border-border rounded-lg text-sm">
                    <option value="">— เลือก —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.employee_code} · {emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-muted mb-1">offset</label>
                  <input type="number" min={0} value={assignForm.offset} onChange={(e) => setAssignForm({ ...assignForm, offset: e.target.value })} className="w-full px-2 py-2 border border-border rounded-lg text-sm" title="เริ่มที่ช่องไหนของรอบ" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-muted mb-1">เริ่ม</label>
                  <input required type="date" value={assignForm.effective_from} onChange={(e) => setAssignForm({ ...assignForm, effective_from: e.target.value })} className="w-full px-1.5 py-2 border border-border rounded-lg text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-muted mb-1">ถึง</label>
                  <input type="date" value={assignForm.effective_to} onChange={(e) => setAssignForm({ ...assignForm, effective_to: e.target.value })} className="w-full px-1.5 py-2 border border-border rounded-lg text-xs" />
                </div>
                <div className="col-span-1">
                  <button type="submit" disabled={assignBusy} className="w-full px-2 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"><Plus className="w-4 h-4 mx-auto" /></button>
                </div>
              </form>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface text-left text-xs text-muted">
                      <th className="px-3 py-2">พนักงาน</th>
                      <th className="px-3 py-2">offset</th>
                      <th className="px-3 py-2">ช่วงใช้งาน</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assignments.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-muted">ยังไม่มีพนักงานในรอบนี้</td></tr>
                    ) : assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2">{a.employee ? `${a.employee.employee_code} · ${a.employee.full_name}` : `#${a.employee_id}`}</td>
                        <td className="px-3 py-2">{a.offset}</td>
                        <td className="px-3 py-2 text-xs text-muted">{a.effective_from.substring(0, 10)} → {a.effective_to ? a.effective_to.substring(0, 10) : "ไม่กำหนด"}</td>
                        <td className="px-3 py-2"><button onClick={() => removeAssignment(a)} className="p-1 rounded hover:bg-surface text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted">offset = เลื่อนจุดเริ่มของพนักงานในรอบ เช่น คน A offset 0, คน B offset 1 จะอยู่คนละกะกันเสมอ (สลับวนกัน)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

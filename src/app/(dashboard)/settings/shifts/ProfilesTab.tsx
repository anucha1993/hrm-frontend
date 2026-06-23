"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { WorkProfile, WorkShift, Department } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Building2, Star } from "lucide-react";

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "จ" },
  { value: 2, label: "อ" },
  { value: 3, label: "พ" },
  { value: 4, label: "พฤ" },
  { value: 5, label: "ศ" },
  { value: 6, label: "ส" },
  { value: 7, label: "อา" },
];

type FormState = {
  id?: number;
  name: string;
  work_shift_id: string;
  work_days: number[];
  description: string;
  is_default: boolean;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  work_shift_id: "",
  work_days: [1, 2, 3, 4, 5, 6],
  description: "",
  is_default: false,
  is_active: true,
};

function daysText(days: number[] | null): string {
  if (!days || days.length === 0) return "ทุกวัน";
  if (days.length === 7) return "ทุกวัน";
  return DAY_LABELS.filter((d) => days.includes(d.value)).map((d) => d.label).join(" ");
}

export default function ProfilesTab() {
  const [items, setItems] = useState<WorkProfile[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // department assignment modal
  const [assignFor, setAssignFor] = useState<WorkProfile | null>(null);
  const [assignIds, setAssignIds] = useState<number[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, s, d] = await Promise.all([
        apiFetch<{ data: WorkProfile[] }>("/work-profiles"),
        apiFetch<{ data: WorkShift[] }>("/work-shifts?active_only=1"),
        apiFetch<{ data: Department[] }>("/departments"),
      ]);
      setItems(p.data || []);
      setShifts(s.data || []);
      setDepartments(d.data || []);
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
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: WorkProfile) {
    setForm({
      id: p.id,
      name: p.name,
      work_shift_id: p.work_shift_id ? String(p.work_shift_id) : "",
      work_days: p.work_days ?? [],
      description: p.description ?? "",
      is_default: p.is_default,
      is_active: p.is_active,
    });
    setError(null);
    setShowForm(true);
  }

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      work_days: f.work_days.includes(d) ? f.work_days.filter((x) => x !== d) : [...f.work_days, d].sort((a, b) => a - b),
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        work_shift_id: form.work_shift_id ? parseInt(form.work_shift_id, 10) : null,
        work_days: form.work_days,
        description: form.description || null,
        is_default: form.is_default,
        is_active: form.is_active,
      };
      if (form.id) {
        await apiFetch(`/work-profiles/${form.id}`, { method: "PUT", body: payload });
      } else {
        await apiFetch("/work-profiles", { method: "POST", body: payload });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: WorkProfile) {
    if (p.is_default) {
      alert("ไม่สามารถลบโปรไฟล์ค่าเริ่มต้นได้");
      return;
    }
    if (!confirm(`ลบโปรไฟล์ "${p.name}"? แผนก/พนักงานที่ใช้โปรไฟล์นี้จะกลับไปใช้ค่าเริ่มต้น`)) return;
    try {
      await apiFetch(`/work-profiles/${p.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  function openAssign(p: WorkProfile) {
    setAssignFor(p);
    setAssignIds(departments.filter((d) => d.work_profile_id === p.id).map((d) => d.id));
  }

  function toggleAssign(id: number) {
    setAssignIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function saveAssign() {
    if (!assignFor) return;
    setAssignSaving(true);
    try {
      await apiFetch(`/work-profiles/${assignFor.id}/departments`, {
        method: "PUT",
        body: { department_ids: assignIds },
      });
      setAssignFor(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setAssignSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">โปรไฟล์ = ชุดกะ + วันทำงาน + วันหยุด · ผูกกับแผนก (ค่าเริ่มต้น) หรือกำหนดรายคนได้</p>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">
          <Plus className="w-4 h-4" /> เพิ่มโปรไฟล์
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-border text-left text-xs font-semibold text-muted uppercase">
              <th className="px-5 py-3">ชื่อโปรไฟล์</th>
              <th className="px-5 py-3">กะ</th>
              <th className="px-5 py-3">วันทำงาน</th>
              <th className="px-5 py-3">แผนก</th>
              <th className="px-5 py-3">พนักงาน</th>
              <th className="px-5 py-3">สถานะ</th>
              <th className="px-5 py-3 w-40">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">ยังไม่มีโปรไฟล์</td></tr>
            ) : items.map((p) => (
              <tr key={p.id} className="hover:bg-surface/50">
                <td className="px-5 py-3 font-medium text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    {p.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                    {p.name}
                  </span>
                  {p.description && <p className="text-xs text-muted mt-0.5">{p.description}</p>}
                </td>
                <td className="px-5 py-3 text-sm">{p.work_shift?.name ?? <span className="text-muted">ไม่มี</span>}</td>
                <td className="px-5 py-3 text-sm">{daysText(p.work_days)}</td>
                <td className="px-5 py-3 text-sm">{p.departments_count ?? 0}</td>
                <td className="px-5 py-3 text-sm">{p.employees_count ?? 0}</td>
                <td className="px-5 py-3 text-sm">
                  {p.is_active ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">ใช้งาน</span> : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">ปิด</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => openAssign(p)} title="มอบหมายแผนก" className="p-1.5 rounded hover:bg-surface text-blue-600"><Building2 className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(p)} title="แก้ไข" className="p-1.5 rounded hover:bg-surface text-primary-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(p)} title="ลบ" className="p-1.5 rounded hover:bg-surface text-red-600 disabled:opacity-30" disabled={p.is_default}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{form.id ? "แก้ไขโปรไฟล์" : "เพิ่มโปรไฟล์"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ชื่อโปรไฟล์ *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น พนักงานออฟฟิศ จ-ศ" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">กะการทำงาน</label>
                <select value={form.work_shift_id} onChange={(e) => setForm({ ...form, work_shift_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="">— ไม่กำหนดกะ (ลงเวลาได้ตลอดวัน) —</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">วันทำงาน</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((d) => (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => toggleDay(d.value)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium border transition ${
                        form.work_days.includes(d.value)
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-white text-muted border-border hover:border-primary-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-1">วันที่ไม่เลือก = วันหยุดประจำสัปดาห์ (ไม่นับสาย/ขาด)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">คำอธิบาย</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                  ตั้งเป็นโปรไฟล์ค่าเริ่มต้นของบริษัท
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  ใช้งาน
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign departments modal */}
      {assignFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">มอบหมายแผนก — {assignFor.name}</h3>
              <button onClick={() => setAssignFor(null)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-1">
              <p className="text-xs text-muted mb-2">เลือกแผนกที่จะใช้โปรไฟล์นี้เป็นค่าเริ่มต้น (พนักงานที่กำหนดรายคนไว้จะไม่ถูกแทนที่)</p>
              {departments.map((d) => {
                const usedByOther = d.work_profile_id != null && d.work_profile_id !== assignFor.id;
                return (
                  <label key={d.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-surface text-sm cursor-pointer">
                    <input type="checkbox" checked={assignIds.includes(d.id)} onChange={() => toggleAssign(d.id)} />
                    <span className="flex-1">{d.name} <span className="text-muted text-xs">({d.code})</span></span>
                    {usedByOther && !assignIds.includes(d.id) && <span className="text-xs text-amber-600">มีโปรไฟล์อื่น</span>}
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setAssignFor(null)} className="px-4 py-2 border border-border rounded-lg text-sm">ยกเลิก</button>
              <button onClick={saveAssign} disabled={assignSaving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{assignSaving ? "กำลังบันทึก..." : "บันทึก"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

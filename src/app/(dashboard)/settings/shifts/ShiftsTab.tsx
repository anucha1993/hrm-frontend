"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { WorkShift } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Clock } from "lucide-react";

type FormState = {
  id?: number;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: string;
  late_grace_minutes: string;
  cross_midnight: boolean;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  start_time: "08:00",
  end_time: "17:00",
  break_minutes: "60",
  late_grace_minutes: "15",
  cross_midnight: false,
  is_active: true,
};

function fmt(t: string) {
  return t?.substring(0, 5);
}

export default function ShiftsTab() {
  const [items, setItems] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<{ data: WorkShift[] }>("/work-shifts");
      setItems(data.data || []);
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

  function openEdit(s: WorkShift) {
    setForm({
      id: s.id,
      name: s.name,
      start_time: fmt(s.start_time),
      end_time: fmt(s.end_time),
      break_minutes: s.break_minutes.toString(),
      late_grace_minutes: s.late_grace_minutes.toString(),
      cross_midnight: s.cross_midnight,
      is_active: s.is_active,
    });
    setError(null);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: parseInt(form.break_minutes, 10) || 0,
        late_grace_minutes: parseInt(form.late_grace_minutes, 10) || 0,
        cross_midnight: form.cross_midnight,
        is_active: form.is_active,
      };
      if (form.id) {
        await apiFetch(`/work-shifts/${form.id}`, { method: "PUT", body: payload });
      } else {
        await apiFetch("/work-shifts", { method: "POST", body: payload });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: WorkShift) {
    if (!confirm(`ลบกะ "${s.name}"?`)) return;
    try {
      await apiFetch(`/work-shifts/${s.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">กำหนดกะการทำงาน เวลาเริ่ม-เลิก และเกณฑ์การคำนวณสาย/OT</p>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">
          <Plus className="w-4 h-4" /> เพิ่มกะ
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-border text-left text-xs font-semibold text-muted uppercase">
              <th className="px-5 py-3">ชื่อกะ</th>
              <th className="px-5 py-3">เวลา</th>
              <th className="px-5 py-3">พักเที่ยง</th>
              <th className="px-5 py-3">ผ่อนผันสาย</th>
              <th className="px-5 py-3">ข้ามวัน</th>
              <th className="px-5 py-3">สถานะ</th>
              <th className="px-5 py-3 w-32">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">ยังไม่มีกะ</td></tr>
            ) : items.map((s) => (
              <tr key={s.id} className="hover:bg-surface/50">
                <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-5 py-3 text-sm font-mono">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3 text-muted" />{fmt(s.start_time)} - {fmt(s.end_time)}</span>
                </td>
                <td className="px-5 py-3 text-sm">{s.break_minutes} นาที</td>
                <td className="px-5 py-3 text-sm">{s.late_grace_minutes} นาที</td>
                <td className="px-5 py-3 text-sm">{s.cross_midnight ? <span className="text-amber-600">ใช่</span> : <span className="text-muted">-</span>}</td>
                <td className="px-5 py-3 text-sm">
                  {s.is_active ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">ใช้งาน</span> : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">ปิด</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-surface text-primary-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(s)} className="p-1.5 rounded hover:bg-surface text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{form.id ? "แก้ไขกะ" : "เพิ่มกะ"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ชื่อกะ *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น กะเช้า, กะดึก" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">เวลาเริ่ม *</label>
                  <input required type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">เวลาเลิก *</label>
                  <input required type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">พักเที่ยง (นาที)</label>
                  <input type="number" min={0} value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">ผ่อนผันสาย (นาที)</label>
                  <input type="number" min={0} value={form.late_grace_minutes} onChange={(e) => setForm({ ...form, late_grace_minutes: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.cross_midnight} onChange={(e) => setForm({ ...form, cross_midnight: e.target.checked })} />
                  กะข้ามวัน (เลิกหลังเที่ยงคืน)
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
    </div>
  );
}

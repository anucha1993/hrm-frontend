"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Holiday, WorkProfile } from "@/lib/types";
import { Plus, Pencil, Trash2, X, CalendarDays, Repeat } from "lucide-react";

type FormState = {
  id?: number;
  name: string;
  date: string;
  is_recurring: boolean;
  scope: "global" | "profile";
  work_profile_id: string;
  is_working: boolean;
  is_active: boolean;
};

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

const emptyForm: FormState = {
  name: "",
  date: todayStr(),
  is_recurring: false,
  scope: "global",
  work_profile_id: "",
  is_working: false,
  is_active: true,
};

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function fmtDate(iso: string, recurring: boolean): string {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dm = `${d} ${TH_MONTHS[(m || 1) - 1]}`;
  return recurring ? dm : `${dm} ${y + 543}`;
}

export default function HolidaysTab() {
  const [items, setItems] = useState<Holiday[]>([]);
  const [profiles, setProfiles] = useState<WorkProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [h, p] = await Promise.all([
        apiFetch<{ data: Holiday[] }>("/holidays"),
        apiFetch<{ data: WorkProfile[] }>("/work-profiles?active_only=1"),
      ]);
      setItems(h.data || []);
      setProfiles(p.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (scopeFilter === "") return items;
    if (scopeFilter === "global") return items.filter((h) => h.work_profile_id == null);
    return items.filter((h) => String(h.work_profile_id) === scopeFilter);
  }, [items, scopeFilter]);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(h: Holiday) {
    setForm({
      id: h.id,
      name: h.name,
      date: h.date.substring(0, 10),
      is_recurring: h.is_recurring,
      scope: h.work_profile_id == null ? "global" : "profile",
      work_profile_id: h.work_profile_id ? String(h.work_profile_id) : "",
      is_working: h.is_working,
      is_active: h.is_active,
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
        date: form.date,
        is_recurring: form.is_recurring,
        work_profile_id: form.scope === "profile" && form.work_profile_id ? parseInt(form.work_profile_id, 10) : null,
        is_working: form.scope === "profile" ? form.is_working : false,
        is_active: form.is_active,
      };
      if (form.id) {
        await apiFetch(`/holidays/${form.id}`, { method: "PUT", body: payload });
      } else {
        await apiFetch("/holidays", { method: "POST", body: payload });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove(h: Holiday) {
    if (!confirm(`ลบ "${h.name}"?`)) return;
    try {
      await apiFetch(`/holidays/${h.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">วันหยุดกลางใช้ทั้งบริษัท · กำหนดเพิ่มหรือยกเว้นเฉพาะโปรไฟล์ได้</p>
        <div className="flex items-center gap-2">
          <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="">ทั้งหมด</option>
            <option value="global">วันหยุดกลาง (ทั้งบริษัท)</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>เฉพาะ: {p.name}</option>
            ))}
          </select>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">
            <Plus className="w-4 h-4" /> เพิ่มวันหยุด
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-border text-left text-xs font-semibold text-muted uppercase">
              <th className="px-5 py-3">วันที่</th>
              <th className="px-5 py-3">ชื่อวันหยุด</th>
              <th className="px-5 py-3">ขอบเขต</th>
              <th className="px-5 py-3">ประเภท</th>
              <th className="px-5 py-3">สถานะ</th>
              <th className="px-5 py-3 w-28">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">กำลังโหลด...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">ยังไม่มีวันหยุด</td></tr>
            ) : filtered.map((h) => (
              <tr key={h.id} className="hover:bg-surface/50">
                <td className="px-5 py-3 text-sm font-medium text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-muted" />
                    {fmtDate(h.date, h.is_recurring)}
                    {h.is_recurring && <span title="ซ้ำทุกปี" className="inline-flex items-center gap-0.5 text-xs text-blue-600"><Repeat className="w-3 h-3" />ทุกปี</span>}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm">{h.name}</td>
                <td className="px-5 py-3 text-sm">
                  {h.work_profile_id == null
                    ? <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">กลาง</span>
                    : <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs">{h.work_profile?.name ?? "โปรไฟล์"}</span>}
                </td>
                <td className="px-5 py-3 text-sm">
                  {h.is_working
                    ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">ยกเว้น (ทำงาน)</span>
                    : <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs">วันหยุด</span>}
                </td>
                <td className="px-5 py-3 text-sm">
                  {h.is_active ? <span className="text-green-600 text-xs">ใช้งาน</span> : <span className="text-muted text-xs">ปิด</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(h)} className="p-1.5 rounded hover:bg-surface text-primary-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(h)} className="p-1.5 rounded hover:bg-surface text-red-600"><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="font-semibold text-foreground">{form.id ? "แก้ไขวันหยุด" : "เพิ่มวันหยุด"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ชื่อวันหยุด *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น วันสงกรานต์, หยุดประจำปีบริษัท" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">วันที่ *</label>
                  <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm pb-2">
                    <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} />
                    ซ้ำทุกปี (ใช้เฉพาะวัน-เดือน)
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ขอบเขต</label>
                <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as "global" | "profile" })} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="global">วันหยุดกลาง (ทั้งบริษัท)</option>
                  <option value="profile">เฉพาะโปรไฟล์</option>
                </select>
              </div>
              {form.scope === "profile" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">โปรไฟล์ *</label>
                    <select required value={form.work_profile_id} onChange={(e) => setForm({ ...form, work_profile_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                      <option value="">— เลือกโปรไฟล์ —</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.is_working} onChange={(e) => setForm({ ...form, is_working: e.target.checked })} />
                    เป็น &quot;วันยกเว้น&quot; — โปรไฟล์นี้ทำงานปกติ (ลบล้างวันหยุดกลาง)
                  </label>
                </>
              )}
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
    </div>
  );
}

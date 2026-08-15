"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import type { CompensationProfile } from "@/lib/payroll";
import { Plus, X, Loader2, Edit, Trash2, AlertCircle, Star } from "lucide-react";

type Form = {
  name: string;
  description: string;
  pay_frequency: CompensationProfile["pay_frequency"];
  working_days_per_period: string;
  working_hours_per_day: string;
  ot_rate_normal: string;
  ot_rate_holiday: string;
  ot_rate_holiday_overtime: string;
  late_deduction_method: CompensationProfile["late_deduction_method"];
  late_deduction_rate: string;
  late_grace_minutes: string;
  absent_deduction_method: CompensationProfile["absent_deduction_method"];
  absent_deduction_amount: string;
  ssf_enabled: boolean;
  ssf_rate: string;
  ssf_min_base: string;
  ssf_max_base: string;
  is_default: boolean;
  is_active: boolean;
};

const empty: Form = {
  name: "",
  description: "",
  pay_frequency: "monthly",
  working_days_per_period: "26",
  working_hours_per_day: "8",
  ot_rate_normal: "1.50",
  ot_rate_holiday: "2.00",
  ot_rate_holiday_overtime: "3.00",
  late_deduction_method: "none",
  late_deduction_rate: "0",
  late_grace_minutes: "0",
  absent_deduction_method: "daily_wage",
  absent_deduction_amount: "0",
  ssf_enabled: true,
  ssf_rate: "5.00",
  ssf_min_base: "1650",
  ssf_max_base: "15000",
  is_default: false,
  is_active: true,
};

const lateMethodLabel: Record<Form["late_deduction_method"], string> = {
  none: "ไม่หัก",
  per_minute: "ต่อนาที",
  per_hour: "ต่อชั่วโมง",
  per_incident: "ต่อครั้ง",
  fixed: "จำนวนคงที่",
};

const absentMethodLabel: Record<Form["absent_deduction_method"], string> = {
  none: "ไม่หัก",
  daily_wage: "ค่าจ้างต่อวัน",
  fixed: "จำนวนคงที่",
};

export default function CompensationProfilesPage() {
  const [items, setItems] = useState<CompensationProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CompensationProfile | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: CompensationProfile[] }>("/payroll/profiles");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setErr(null);
    setShowForm(true);
  }

  function openEdit(p: CompensationProfile) {
    setEditing(p);
    setErr(null);
    setForm({
      name: p.name,
      description: p.description ?? "",
      pay_frequency: p.pay_frequency,
      working_days_per_period: String(p.working_days_per_period),
      working_hours_per_day: String(p.working_hours_per_day),
      ot_rate_normal: p.ot_rate_normal,
      ot_rate_holiday: p.ot_rate_holiday,
      ot_rate_holiday_overtime: p.ot_rate_holiday_overtime,
      late_deduction_method: p.late_deduction_method,
      late_deduction_rate: p.late_deduction_rate,
      late_grace_minutes: String(p.late_grace_minutes),
      absent_deduction_method: p.absent_deduction_method,
      absent_deduction_amount: p.absent_deduction_amount,
      ssf_enabled: p.ssf_enabled,
      ssf_rate: p.ssf_rate,
      ssf_min_base: p.ssf_min_base,
      ssf_max_base: p.ssf_max_base,
      is_default: p.is_default,
      is_active: p.is_active,
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    try {
      const path = editing ? `/payroll/profiles/${editing.id}` : "/payroll/profiles";
      await apiFetch(path, {
        method: editing ? "PUT" : "POST",
        body: {
          ...form,
          working_days_per_period: Number(form.working_days_per_period),
          working_hours_per_day: Number(form.working_hours_per_day),
          late_grace_minutes: Number(form.late_grace_minutes),
        },
      });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(p: CompensationProfile) {
    if (!confirm(`ลบโปรไฟล์ "${p.name}"?`)) return;
    try {
      await apiFetch(`/payroll/profiles/${p.id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "ลบไม่สำเร็จ";
      alert(msg);
    }
  }

  return (
    <>
      <Topbar title="โปรไฟล์ค่าจ้าง" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-end">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
          >
            <Plus className="w-4 h-4" /> เพิ่มโปรไฟล์
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ยังไม่มีโปรไฟล์ค่าจ้าง
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3">ชื่อโปรไฟล์</th>
                  <th className="px-3 py-3">รอบจ่าย</th>
                  <th className="px-3 py-3 text-right">วัน/ชม.ทำงาน</th>
                  <th className="px-3 py-3 text-right">OT ปกติ</th>
                  <th className="px-3 py-3">ประกันสังคม</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        {p.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                        {p.name}
                      </div>
                      {p.description && <div className="text-xs text-muted mt-0.5">{p.description}</div>}
                    </td>
                    <td className="px-3 py-3 text-xs">{p.pay_frequency}</td>
                    <td className="px-3 py-3 text-right text-xs">{p.working_days_per_period} วัน / {p.working_hours_per_day} ชม.</td>
                    <td className="px-3 py-3 text-right text-xs">{p.ot_rate_normal}x</td>
                    <td className="px-3 py-3 text-xs">
                      {p.ssf_enabled
                        ? `${p.ssf_rate}% (cap ${Number(p.ssf_max_base).toLocaleString()})`
                        : "ปิดใช้งาน"}
                    </td>
                    <td className="px-3 py-3 text-xs">{p.is_active ? "ใช้งาน" : "ปิด"}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-primary-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "แก้ไขโปรไฟล์ค่าจ้าง" : "เพิ่มโปรไฟล์ค่าจ้างใหม่"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <Field label="ชื่อโปรไฟล์ *">
                  <input
                    className="payroll-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="เช่น พนักงานรายเดือน (มาตรฐาน)"
                  />
                </Field>
                <Field label="รอบจ่ายเงิน *">
                  <select
                    className="payroll-input"
                    value={form.pay_frequency}
                    onChange={(e) => setForm({ ...form, pay_frequency: e.target.value as Form["pay_frequency"] })}
                  >
                    <option value="monthly">รายเดือน</option>
                    <option value="biweekly">ราย 15 วัน</option>
                    <option value="weekly">รายสัปดาห์</option>
                    <option value="daily">รายวัน</option>
                  </select>
                </Field>
              </div>
              <Field label="คำอธิบาย">
                <input
                  className="payroll-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="วันทำงาน/รอบ">
                  <input
                    type="number" min="1" max="31"
                    className="payroll-input"
                    value={form.working_days_per_period}
                    onChange={(e) => setForm({ ...form, working_days_per_period: e.target.value })}
                  />
                </Field>
                <Field label="ชม.ทำงาน/วัน">
                  <input
                    type="number" min="1" max="24"
                    className="payroll-input"
                    value={form.working_hours_per_day}
                    onChange={(e) => setForm({ ...form, working_hours_per_day: e.target.value })}
                  />
                </Field>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted uppercase mb-2">อัตรา OT</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="OT ปกติ (เท่า)">
                    <input type="number" step="0.01" min="0" className="payroll-input"
                      value={form.ot_rate_normal}
                      onChange={(e) => setForm({ ...form, ot_rate_normal: e.target.value })} />
                  </Field>
                  <Field label="OT วันหยุด (เท่า)">
                    <input type="number" step="0.01" min="0" className="payroll-input"
                      value={form.ot_rate_holiday}
                      onChange={(e) => setForm({ ...form, ot_rate_holiday: e.target.value })} />
                  </Field>
                  <Field label="OT วันหยุด+OT (เท่า)">
                    <input type="number" step="0.01" min="0" className="payroll-input"
                      value={form.ot_rate_holiday_overtime}
                      onChange={(e) => setForm({ ...form, ot_rate_holiday_overtime: e.target.value })} />
                  </Field>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted uppercase mb-2">การหักมาสาย / ขาดงาน</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="วิธีหักมาสาย">
                    <select className="payroll-input"
                      value={form.late_deduction_method}
                      onChange={(e) => setForm({ ...form, late_deduction_method: e.target.value as Form["late_deduction_method"] })}>
                      {Object.entries(lateMethodLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="อัตราหักมาสาย">
                    <input type="number" step="0.01" min="0" className="payroll-input"
                      value={form.late_deduction_rate}
                      onChange={(e) => setForm({ ...form, late_deduction_rate: e.target.value })} />
                  </Field>
                  <Field label="ผ่อนผัน (นาที)">
                    <input type="number" min="0" className="payroll-input"
                      value={form.late_grace_minutes}
                      onChange={(e) => setForm({ ...form, late_grace_minutes: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="วิธีหักขาดงาน">
                    <select className="payroll-input"
                      value={form.absent_deduction_method}
                      onChange={(e) => setForm({ ...form, absent_deduction_method: e.target.value as Form["absent_deduction_method"] })}>
                      {Object.entries(absentMethodLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="จำนวนหักขาดงาน (ถ้าคงที่)">
                    <input type="number" step="0.01" min="0" className="payroll-input"
                      value={form.absent_deduction_amount}
                      onChange={(e) => setForm({ ...form, absent_deduction_amount: e.target.value })} />
                  </Field>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted uppercase">ประกันสังคม (SSF)</h4>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.ssf_enabled}
                      onChange={(e) => setForm({ ...form, ssf_enabled: e.target.checked })}
                    />
                    เปิดใช้งาน
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="อัตรา (%)">
                    <input type="number" step="0.01" min="0" max="100" className="payroll-input"
                      value={form.ssf_rate}
                      onChange={(e) => setForm({ ...form, ssf_rate: e.target.value })} />
                  </Field>
                  <Field label="ฐานขั้นต่ำ (บาท)">
                    <input type="number" step="0.01" min="0" className="payroll-input"
                      value={form.ssf_min_base}
                      onChange={(e) => setForm({ ...form, ssf_min_base: e.target.value })} />
                  </Field>
                  <Field label="ฐานสูงสุด/cap (บาท)">
                    <input type="number" step="0.01" min="0" className="payroll-input"
                      value={form.ssf_max_base}
                      onChange={(e) => setForm({ ...form, ssf_max_base: e.target.value })} />
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  />
                  ตั้งเป็นโปรไฟล์เริ่มต้น
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  ใช้งาน
                </label>
              </div>

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
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
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

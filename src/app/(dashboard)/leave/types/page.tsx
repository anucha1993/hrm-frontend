"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { type LeaveType } from "@/lib/leave";
import { Plus, X, Loader2, Edit, Trash2, AlertCircle } from "lucide-react";

type Form = {
  code: string;
  name: string;
  name_en: string;
  color: string;
  is_paid: boolean;
  requires_approval: boolean;
  requires_attachment: boolean;
  counts_as_workday: boolean;
  affects_diligence: boolean;
  default_quota_days: string;
  min_advance_notice_days: string;
  allow_half_day: boolean;
  allow_negative_balance: boolean;
  max_consecutive_days: string;
  description: string;
  order: string;
  is_active: boolean;
};

const empty: Form = {
  code: "",
  name: "",
  name_en: "",
  color: "#3b82f6",
  is_paid: true,
  requires_approval: true,
  requires_attachment: false,
  counts_as_workday: true,
  affects_diligence: false,
  default_quota_days: "0",
  min_advance_notice_days: "0",
  allow_half_day: true,
  allow_negative_balance: false,
  max_consecutive_days: "",
  description: "",
  order: "0",
  is_active: true,
};

export default function LeaveTypesPage() {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: LeaveType[] }>("/leave/types");
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

  function openEdit(t: LeaveType) {
    setEditing(t);
    setErr(null);
    setForm({
      code: t.code,
      name: t.name,
      name_en: t.name_en ?? "",
      color: t.color,
      is_paid: t.is_paid,
      requires_approval: t.requires_approval,
      requires_attachment: t.requires_attachment,
      counts_as_workday: t.counts_as_workday,
      affects_diligence: t.affects_diligence,
      default_quota_days: t.default_quota_days,
      min_advance_notice_days: String(t.min_advance_notice_days),
      allow_half_day: t.allow_half_day,
      allow_negative_balance: t.allow_negative_balance,
      max_consecutive_days: t.max_consecutive_days?.toString() ?? "",
      description: t.description ?? "",
      order: String(t.order),
      is_active: t.is_active,
    });
    setShowForm(true);
  }

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        ...form,
        default_quota_days: parseFloat(form.default_quota_days || "0"),
        min_advance_notice_days: parseInt(form.min_advance_notice_days || "0"),
        order: parseInt(form.order || "0"),
        max_consecutive_days: form.max_consecutive_days ? parseInt(form.max_consecutive_days) : null,
        name_en: form.name_en || null,
        description: form.description || null,
      };
      const path = editing ? `/leave/types/${editing.id}` : "/leave/types";
      await apiFetch(path, {
        method: editing ? "PUT" : "POST",
        body,
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

  async function handleDelete(t: LeaveType) {
    if (!confirm(`ลบ "${t.name}"?`)) return;
    try {
      await apiFetch(`/leave/types/${t.id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="ประเภทการลา" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">ตั้งค่าประเภทการลา / โควต้าวันลาเริ่มต้น / กฎการลา</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
          >
            <Plus className="w-4 h-4" /> เพิ่มประเภทการลา
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ยังไม่มีประเภทการลา
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3">รหัส</th>
                  <th className="px-3 py-3">ชื่อ</th>
                  <th className="px-3 py-3 text-right">โควต้า/ปี</th>
                  <th className="px-3 py-3">จ่ายเงิน</th>
                  <th className="px-3 py-3">อนุมัติ</th>
                  <th className="px-3 py-3">แนบเอกสาร</th>
                  <th className="px-3 py-3">เบี้ยขยัน</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-mono text-xs">{t.code}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                        <span className="font-medium">{t.name}</span>
                      </div>
                      {t.name_en && <div className="text-xs text-muted">{t.name_en}</div>}
                    </td>
                    <td className="px-3 py-3 text-right">{t.default_quota_days}</td>
                    <td className="px-3 py-3 text-xs">{t.is_paid ? "✓" : "—"}</td>
                    <td className="px-3 py-3 text-xs">{t.requires_approval ? "✓" : "—"}</td>
                    <td className="px-3 py-3 text-xs">{t.requires_attachment ? "✓" : "—"}</td>
                    <td className="px-3 py-3 text-xs">{t.affects_diligence ? "หัก" : "—"}</td>
                    <td className="px-3 py-3 text-xs">{t.is_active ? "ใช้งาน" : "ปิด"}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-gray-500 hover:text-primary-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t)} className="p-1.5 text-gray-500 hover:text-red-600">
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "แก้ไขประเภทการลา" : "เพิ่มประเภทการลา"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="รหัส *">
                  <input className="payroll-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ANNUAL" />
                </Field>
                <Field label="ชื่อ (TH) *">
                  <input className="payroll-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ลาประจำปี" />
                </Field>
                <Field label="ชื่อ (EN)">
                  <input className="payroll-input" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Annual Leave" />
                </Field>
                <Field label="สี">
                  <input type="color" className="w-full h-10 rounded-lg border border-border" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </Field>
                <Field label="โควต้าเริ่มต้น (วัน/ปี)">
                  <input type="number" step="0.5" min="0" className="payroll-input" value={form.default_quota_days} onChange={(e) => setForm({ ...form, default_quota_days: e.target.value })} />
                </Field>
                <Field label="แจ้งล่วงหน้าขั้นต่ำ (วัน)">
                  <input type="number" min="0" className="payroll-input" value={form.min_advance_notice_days} onChange={(e) => setForm({ ...form, min_advance_notice_days: e.target.value })} />
                </Field>
                <Field label="ลาติดกันสูงสุด (วัน)">
                  <input type="number" min="1" className="payroll-input" value={form.max_consecutive_days} onChange={(e) => setForm({ ...form, max_consecutive_days: e.target.value })} placeholder="ไม่จำกัด" />
                </Field>
                <Field label="ลำดับแสดง">
                  <input type="number" className="payroll-input" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
                </Field>
              </div>

              <Field label="คำอธิบาย">
                <textarea className="payroll-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                <Toggle label="จ่ายเงินเดือน (Paid)" checked={form.is_paid} onChange={(v) => setForm({ ...form, is_paid: v })} />
                <Toggle label="ต้องอนุมัติ" checked={form.requires_approval} onChange={(v) => setForm({ ...form, requires_approval: v })} />
                <Toggle label="ต้องแนบเอกสาร" checked={form.requires_attachment} onChange={(v) => setForm({ ...form, requires_attachment: v })} />
                <Toggle label="นับเป็นวันทำงาน" checked={form.counts_as_workday} onChange={(v) => setForm({ ...form, counts_as_workday: v })} />
                <Toggle label="ตัดสิทธิ์เบี้ยขยัน" checked={form.affects_diligence} onChange={(v) => setForm({ ...form, affects_diligence: v })} />
                <Toggle label="ลาครึ่งวันได้" checked={form.allow_half_day} onChange={(v) => setForm({ ...form, allow_half_day: v })} />
                <Toggle label="อนุญาตให้ติดลบโควต้า" checked={form.allow_negative_balance} onChange={(v) => setForm({ ...form, allow_negative_balance: v })} />
                <Toggle label="เปิดใช้งาน" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
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
                onClick={submit}
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CompensationProfile, EmployeeCompensation } from "@/lib/payroll";
import type { Employee } from "@/lib/types";
import { ArrowLeft, Plus, X, Loader2, Edit, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

type Form = {
  compensation_profile_id: string;
  base_salary: string;
  hourly_rate_override: string;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
};

const empty: Form = {
  compensation_profile_id: "",
  base_salary: "",
  hourly_rate_override: "",
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
  is_active: true,
};

export default function EmployeeCompensationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const employeeId = Number(id);
  const { hasPermission } = useAuth();
  const canManage = hasPermission("payroll.config");

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [items, setItems] = useState<EmployeeCompensation[]>([]);
  const [profiles, setProfiles] = useState<CompensationProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmployeeCompensation | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [empRes, profRes] = await Promise.all([
        apiFetch<{ data: { employee: Employee; compensations: EmployeeCompensation[] } }>(`/payroll/employees/${employeeId}`),
        apiFetch<{ data: CompensationProfile[] }>("/payroll/profiles"),
      ]);
      setEmployee(empRes.data.employee);
      setItems(empRes.data.compensations);
      setProfiles(profRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [employeeId]);

  function openCreate() {
    setEditing(null);
    const defaultProfile = profiles.find((p) => p.is_default) ?? profiles[0];
    setForm({
      ...empty,
      compensation_profile_id: defaultProfile ? String(defaultProfile.id) : "",
      // เติมค่าเริ่มต้นจากเงินเดือนอ้างอิงในหน้าแก้ไขพนักงาน ถ้ายังไม่เคยมีประวัติค่าจ้างมาก่อน
      base_salary: items.length === 0 && employee?.base_salary ? employee.base_salary : "",
    });
    setErr(null);
    setShowForm(true);
  }

  function openEdit(c: EmployeeCompensation) {
    setEditing(c);
    setErr(null);
    setForm({
      compensation_profile_id: String(c.compensation_profile_id),
      base_salary: c.base_salary,
      hourly_rate_override: c.hourly_rate_override ?? "",
      effective_from: c.effective_from.slice(0, 10),
      effective_to: c.effective_to ? c.effective_to.slice(0, 10) : "",
      is_active: c.is_active,
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    try {
      const path = editing
        ? `/payroll/employees/${employeeId}/compensations/${editing.id}`
        : `/payroll/employees/${employeeId}/compensations`;
      await apiFetch(path, {
        method: editing ? "PUT" : "POST",
        body: {
          compensation_profile_id: Number(form.compensation_profile_id),
          base_salary: Number(form.base_salary),
          hourly_rate_override: form.hourly_rate_override ? Number(form.hourly_rate_override) : null,
          effective_from: form.effective_from,
          effective_to: form.effective_to || null,
          is_active: form.is_active,
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

  async function handleDelete(c: EmployeeCompensation) {
    if (!confirm("ลบประวัติค่าจ้างรายการนี้?")) return;
    try {
      await apiFetch(`/payroll/employees/${employeeId}/compensations/${c.id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="ค่าจ้างพนักงาน" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href={`/employees/${employeeId}/edit`} className="p-2 rounded-lg hover:bg-white border border-border">
              <ArrowLeft className="w-4 h-4 text-muted" />
            </Link>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {employee ? employee.full_name : "..."}
              </h3>
              {employee && <p className="text-xs text-muted">{employee.employee_code}</p>}
            </div>
          </div>
          {canManage && (
            <button
              onClick={openCreate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> เพิ่มประวัติค่าจ้าง
            </button>
          )}
        </div>

        {!canManage && (
          <div className="bg-amber-50 text-amber-700 text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> ไม่มีสิทธิ์แก้ไขค่าจ้าง (ดูได้อย่างเดียว)
          </div>
        )}

        {employee?.base_salary && (
          <div className="bg-blue-50 text-blue-700 text-sm rounded-lg p-3">
            เงินเดือนอ้างอิงจากหน้าแก้ไขพนักงาน: <strong>{Number(employee.base_salary).toLocaleString()}</strong> บาท
            {" "}(ใช้เป็นข้อมูลอ้างอิงเท่านั้น ค่าที่คำนวณเงินเดือนจริงคือประวัติค่าจ้างด้านล่าง)
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ยังไม่มีประวัติค่าจ้าง — พนักงานคนนี้จะไม่ถูกคำนวณเงินเดือนจนกว่าจะเพิ่มประวัติค่าจ้าง
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3">โปรไฟล์ค่าจ้าง</th>
                  <th className="px-3 py-3 text-right">เงินเดือนพื้นฐาน</th>
                  <th className="px-3 py-3 text-right">Rate/ชม. (override)</th>
                  <th className="px-3 py-3">มีผลตั้งแต่</th>
                  <th className="px-3 py-3">มีผลถึง</th>
                  <th className="px-3 py-3">สถานะ</th>
                  {canManage && <th className="px-3 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-medium">{c.profile?.name ?? `#${c.compensation_profile_id}`}</td>
                    <td className="px-3 py-3 text-right">{Number(c.base_salary).toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-xs">{c.hourly_rate_override ? Number(c.hourly_rate_override).toLocaleString() : "—"}</td>
                    <td className="px-3 py-3 text-xs">{c.effective_from}</td>
                    <td className="px-3 py-3 text-xs">{c.effective_to ?? "ไม่มีกำหนด"}</td>
                    <td className="px-3 py-3 text-xs">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> ใช้งาน</span>
                      ) : "ปิด"}
                    </td>
                    {canManage && (
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:text-primary-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 text-gray-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "แก้ไขประวัติค่าจ้าง" : "เพิ่มประวัติค่าจ้าง"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="โปรไฟล์ค่าจ้าง *">
                <select
                  className="payroll-input"
                  value={form.compensation_profile_id}
                  onChange={(e) => setForm({ ...form, compensation_profile_id: e.target.value })}
                >
                  <option value="">-- เลือกโปรไฟล์ --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.is_default ? " (ค่าเริ่มต้น)" : ""}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="เงินเดือนพื้นฐาน (บาท) *">
                  <input
                    type="number" step="0.01" min="0"
                    className="payroll-input"
                    value={form.base_salary}
                    onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                  />
                </Field>
                <Field label="Rate/ชม. (override ถ้ามี)">
                  <input
                    type="number" step="0.01" min="0"
                    className="payroll-input"
                    value={form.hourly_rate_override}
                    onChange={(e) => setForm({ ...form, hourly_rate_override: e.target.value })}
                    placeholder="เว้นว่างเพื่อคำนวณอัตโนมัติ"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="มีผลตั้งแต่ *">
                  <input
                    type="date"
                    className="payroll-input"
                    value={form.effective_from}
                    onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                  />
                </Field>
                <Field label="มีผลถึง (ไม่ระบุ = ไม่มีกำหนด)">
                  <input
                    type="date"
                    className="payroll-input"
                    value={form.effective_to}
                    onChange={(e) => setForm({ ...form, effective_to: e.target.value })}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm pt-1">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                ใช้งาน (ใช้คำนวณเงินเดือน)
              </label>
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
                disabled={submitting || !form.compensation_profile_id || !form.base_salary}
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

"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtMoney, type CompensationComponent } from "@/lib/payroll";
import { Plus, X, Loader2, Edit, Trash2, AlertCircle } from "lucide-react";

type Form = {
  code: string;
  name: string;
  kind: "allowance" | "deduction";
  default_amount: string;
  taxable: boolean;
  affects_ssf: boolean;
  is_active: boolean;
};

const empty: Form = {
  code: "",
  name: "",
  kind: "allowance",
  default_amount: "0",
  taxable: true,
  affects_ssf: false,
  is_active: true,
};

export default function ComponentsPage() {
  const [items, setItems] = useState<CompensationComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CompensationComponent | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "allowance" | "deduction">("all");

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: CompensationComponent[] }>("/payroll/components");
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

  function openEdit(c: CompensationComponent) {
    setEditing(c);
    setErr(null);
    setForm({
      code: c.code,
      name: c.name,
      kind: c.kind,
      default_amount: c.default_amount,
      taxable: c.taxable,
      affects_ssf: c.affects_ssf,
      is_active: c.is_active,
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    try {
      const path = editing ? `/payroll/components/${editing.id}` : "/payroll/components";
      await apiFetch(path, {
        method: editing ? "PUT" : "POST",
        body: form,
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

  async function handleDelete(c: CompensationComponent) {
    if (!confirm(`ลบรายการ "${c.name}"?`)) return;
    try {
      await apiFetch(`/payroll/components/${c.id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  const filtered = items.filter((i) => filter === "all" || i.kind === filter);

  return (
    <>
      <Topbar title="เบี้ย / รายการหัก" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-border p-1">
            {(["all", "allowance", "deduction"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  filter === k ? "bg-primary-600 text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {k === "all" ? "ทั้งหมด" : k === "allowance" ? "เบี้ย/รายได้" : "หัก"}
              </button>
            ))}
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
          >
            <Plus className="w-4 h-4" /> เพิ่มรายการ
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ยังไม่มีรายการ
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3">รหัส</th>
                  <th className="px-3 py-3">ชื่อ</th>
                  <th className="px-3 py-3">ประเภท</th>
                  <th className="px-3 py-3 text-right">ค่าเริ่มต้น</th>
                  <th className="px-3 py-3">ภาษี</th>
                  <th className="px-3 py-3">SSF</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-mono text-xs">{c.code}</td>
                    <td className="px-3 py-3 font-medium">{c.name}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.kind === "allowance" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {c.kind === "allowance" ? "เบี้ย/รายได้" : "หัก"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">{fmtMoney(c.default_amount)}</td>
                    <td className="px-3 py-3 text-xs">{c.taxable ? "✓" : "—"}</td>
                    <td className="px-3 py-3 text-xs">{c.affects_ssf ? "✓" : "—"}</td>
                    <td className="px-3 py-3 text-xs">{c.is_active ? "ใช้งาน" : "ปิด"}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:text-primary-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 text-gray-500 hover:text-red-600">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="รหัส *">
                  <input
                    className="payroll-input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="เช่น TRANSPORT"
                  />
                </Field>
                <Field label="ประเภท *">
                  <select
                    className="payroll-input"
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value as Form["kind"] })}
                  >
                    <option value="allowance">เบี้ย / รายได้</option>
                    <option value="deduction">รายการหัก</option>
                  </select>
                </Field>
              </div>
              <Field label="ชื่อ *">
                <input
                  className="payroll-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น ค่าเดินทาง"
                />
              </Field>
              <Field label="ค่าเริ่มต้น (บาท)">
                <input
                  type="number" step="0.01" min="0"
                  className="payroll-input"
                  value={form.default_amount}
                  onChange={(e) => setForm({ ...form, default_amount: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.taxable}
                    onChange={(e) => setForm({ ...form, taxable: e.target.checked })}
                  />
                  คิดภาษี
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.affects_ssf}
                    onChange={(e) => setForm({ ...form, affects_ssf: e.target.checked })}
                  />
                  คิด SSF
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

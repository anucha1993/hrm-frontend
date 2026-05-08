"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtDate, fmtMoney, type OtSession, type OtSessionEmployee } from "@/lib/payroll";
import { Plus, X, Loader2, Edit, Trash2, AlertCircle, Users } from "lucide-react";

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  status: string;
}

type SessionForm = {
  ot_date: string;
  start_time?: string;
  end_time?: string;
  ot_type: "normal" | "holiday" | "holiday_overtime";
  rate_mode: "hourly_amount" | "multiplier";
  hourly_amount: string;
  multiplier: string;
  description?: string;
  status: "draft" | "open" | "closed";
  employees: { employee_id: number; hours: string; note?: string }[];
};

const OT_TYPE_LABEL = {
  normal: "ทำงานล่วงเวลาปกติ",
  holiday: "ทำงานวันหยุด",
  holiday_overtime: "OT วันหยุด",
};

const STATUS_LABEL = {
  draft: "ร่าง",
  open: "เปิดใช้งาน",
  closed: "ปิดแล้ว",
};

function emptyForm(): SessionForm {
  return {
    ot_date: new Date().toISOString().slice(0, 10),
    ot_type: "normal",
    rate_mode: "hourly_amount",
    hourly_amount: "0",
    multiplier: "1.5",
    status: "open",
    employees: [],
  };
}

export default function OtSessionsPage() {
  const [sessions, setSessions] = useState<OtSession[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OtSession | null>(null);
  const [form, setForm] = useState<SessionForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [sr, er] = await Promise.all([
        apiFetch<{ data: { data: OtSession[] } }>("/payroll/ot-sessions?per_page=100"),
        apiFetch<{ data: { data: Employee[] } }>("/employees?per_page=500"),
      ]);
      setSessions(sr.data.data);
      setEmployees(er.data.data.filter((e) => e.status === "active"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setErr(null);
    setShowForm(true);
  }

  function openEdit(s: OtSession) {
    setEditing(s);
    setErr(null);
    setForm({
      ot_date: s.ot_date,
      start_time: s.start_time ?? "",
      end_time: s.end_time ?? "",
      ot_type: s.ot_type,
      rate_mode: s.rate_mode,
      hourly_amount: s.hourly_amount,
      multiplier: s.multiplier,
      description: s.description ?? "",
      status: s.status,
      employees: (s.employees ?? []).map((e: OtSessionEmployee) => ({
        employee_id: e.employee_id,
        hours: e.hours,
        note: e.note ?? "",
      })),
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    try {
      const path = editing ? `/payroll/ot-sessions/${editing.id}` : "/payroll/ot-sessions";
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

  async function handleDelete(s: OtSession) {
    if (!confirm("ลบรอบ OT นี้?")) return;
    try {
      await apiFetch(`/payroll/ot-sessions/${s.id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  function toggleEmp(empId: number, hours = "1") {
    setForm((f) => {
      const exists = f.employees.find((x) => x.employee_id === empId);
      return {
        ...f,
        employees: exists
          ? f.employees.filter((x) => x.employee_id !== empId)
          : [...f.employees, { employee_id: empId, hours, note: "" }],
      };
    });
  }

  function setHours(empId: number, hours: string) {
    setForm((f) => ({
      ...f,
      employees: f.employees.map((x) => (x.employee_id === empId ? { ...x, hours } : x)),
    }));
  }

  return (
    <>
      <Topbar title="จัดการ OT" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">บันทึกรอบล่วงเวลาเพื่อนำไปคำนวณในงวดเงินเดือน</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
          >
            <Plus className="w-4 h-4" /> เพิ่มรอบ OT
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ยังไม่มีรอบ OT
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => {
              const total = (s.employees ?? []).reduce((a, e) => a + parseFloat(e.total_amount ?? "0"), 0);
              return (
                <div key={s.id} className="bg-white rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{fmtDate(s.ot_date)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                          {OT_TYPE_LABEL[s.ot_type]}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {STATUS_LABEL[s.status]}
                        </span>
                      </div>
                      {(s.start_time || s.end_time) && (
                        <div className="text-xs text-muted mt-1">
                          เวลา {s.start_time ?? "?"} – {s.end_time ?? "?"}
                        </div>
                      )}
                      <div className="text-xs text-muted mt-1">
                        อัตรา:{" "}
                        {s.rate_mode === "hourly_amount"
                          ? `${fmtMoney(s.hourly_amount)} บาท/ชม.`
                          : `${s.multiplier}x ของอัตรารายชั่วโมงพนักงาน`}
                      </div>
                      {s.description && <div className="text-sm mt-2">{s.description}</div>}
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                        <Users className="w-3.5 h-3.5" />
                        พนักงาน {(s.employees ?? []).length} คน · รวม {fmtMoney(total)} บาท
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "แก้ไขรอบ OT" : "เพิ่มรอบ OT"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="วันที่ทำ OT *">
                  <input
                    type="date"
                    className="payroll-input"
                    value={form.ot_date}
                    onChange={(e) => setForm({ ...form, ot_date: e.target.value })}
                  />
                </Field>
                <Field label="เวลาเริ่ม">
                  <input
                    type="time"
                    className="payroll-input"
                    value={form.start_time ?? ""}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </Field>
                <Field label="เวลาเลิก">
                  <input
                    type="time"
                    className="payroll-input"
                    value={form.end_time ?? ""}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </Field>
                <Field label="ประเภท">
                  <select
                    className="payroll-input"
                    value={form.ot_type}
                    onChange={(e) => setForm({ ...form, ot_type: e.target.value as SessionForm["ot_type"] })}
                  >
                    <option value="normal">{OT_TYPE_LABEL.normal}</option>
                    <option value="holiday">{OT_TYPE_LABEL.holiday}</option>
                    <option value="holiday_overtime">{OT_TYPE_LABEL.holiday_overtime}</option>
                  </select>
                </Field>
                <Field label="สถานะ">
                  <select
                    className="payroll-input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as SessionForm["status"] })}
                  >
                    <option value="draft">ร่าง</option>
                    <option value="open">เปิดใช้งาน</option>
                    <option value="closed">ปิดแล้ว</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="โหมดอัตรา">
                  <select
                    className="payroll-input"
                    value={form.rate_mode}
                    onChange={(e) => setForm({ ...form, rate_mode: e.target.value as SessionForm["rate_mode"] })}
                  >
                    <option value="hourly_amount">ระบุจำนวนเงินต่อชั่วโมง</option>
                    <option value="multiplier">คูณอัตรารายชั่วโมงพนักงาน</option>
                  </select>
                </Field>
                {form.rate_mode === "hourly_amount" ? (
                  <Field label="จำนวนเงินต่อชั่วโมง (บาท)">
                    <input
                      type="number" step="0.01" min="0"
                      className="payroll-input"
                      value={form.hourly_amount}
                      onChange={(e) => setForm({ ...form, hourly_amount: e.target.value })}
                    />
                  </Field>
                ) : (
                  <Field label="ตัวคูณ (เช่น 1.5)">
                    <input
                      type="number" step="0.01" min="0"
                      className="payroll-input"
                      value={form.multiplier}
                      onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
                    />
                  </Field>
                )}
              </div>

              <Field label="คำอธิบาย">
                <textarea
                  className="payroll-input"
                  rows={2}
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">พนักงานที่ทำ OT ({form.employees.length} คน)</div>
                </div>
                <div className="border border-border rounded-lg max-h-72 overflow-y-auto">
                  {employees.map((e) => {
                    const picked = form.employees.find((x) => x.employee_id === e.id);
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={!!picked}
                          onChange={() => toggleEmp(e.id)}
                        />
                        <span className="font-mono text-xs w-20">{e.employee_code}</span>
                        <span className="flex-1 text-sm">
                          {e.first_name} {e.last_name}
                        </span>
                        {picked && (
                          <input
                            type="number" step="0.25" min="0"
                            className="payroll-input"
                            style={{ width: 90 }}
                            value={picked.hours}
                            onChange={(ev) => setHours(e.id, ev.target.value)}
                            placeholder="ชม."
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
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

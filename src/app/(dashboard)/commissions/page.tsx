"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import EmployeeCombobox from "@/components/EmployeeCombobox";
import { Plus, Trash2, Loader2, Ban, Percent } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Commission, CommissionStatus, Employee, Paginated } from "@/lib/types";

function thb(v: string | number | null | undefined) {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_LABEL: Record<CommissionStatus, { label: string; variant: "success" | "warning" | "default" }> = {
  pending: { label: "รอตัดเข้าเงินเดือน", variant: "warning" },
  paid: { label: "ตัดเข้าเงินเดือนแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิกแล้ว", variant: "default" },
};

type FormState = {
  id?: number;
  employee_id: string;
  earned_date: string;
  amount: string;
  title: string;
  note: string;
};

function emptyForm(): FormState {
  const today = new Date().toISOString().slice(0, 10);
  return { employee_id: "", earned_date: today, amount: "", title: "", note: "" };
}

export default function CommissionsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("commission.manage");

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Paginated<Commission>; summary: { pending_total: number } }>(
        "/commissions?per_page=50"
      );
      setCommissions(res.data.data);
      setPendingTotal(res.summary.pending_total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    apiFetch<{ data: Paginated<Employee> }>("/employees?per_page=1000&status=active")
      .then((r) => setEmployees(r.data.data))
      .catch(() => undefined);
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
  }

  function openEdit(c: Commission) {
    setForm({
      id: c.id,
      employee_id: String(c.employee_id),
      earned_date: c.earned_date.slice(0, 10),
      amount: c.amount,
      title: c.title ?? "",
      note: c.note ?? "",
    });
  }

  async function submit() {
    if (!form) return;
    if (!form.employee_id) {
      setError("กรุณาเลือกพนักงาน");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("กรุณากรอกจำนวนเงินให้ถูกต้อง");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        employee_id: Number(form.employee_id),
        earned_date: form.earned_date,
        amount: Number(form.amount),
        title: form.title || null,
        note: form.note || null,
      };
      if (form.id) {
        await apiFetch(`/commissions/${form.id}`, { method: "PUT", body });
      } else {
        await apiFetch("/commissions", { method: "POST", body });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function cancel(c: Commission) {
    if (!confirm(`ยกเลิกค่าคอม ${c.code} ?`)) return;
    try {
      await apiFetch(`/commissions/${c.id}/status`, { method: "POST", body: { status: "cancelled" } });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ยกเลิกไม่สำเร็จ");
    }
  }

  async function remove(c: Commission) {
    if (!confirm(`ลบค่าคอม ${c.code} ?`)) return;
    try {
      await apiFetch(`/commissions/${c.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="ค่าคอมมิชชั่น" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">ค่าคอมมิชชั่น</h3>
            <p className="text-xs text-muted">
              สร้างรายการค่าคอมลอย ๆ ต่อพนักงาน — ระบบจะดึงรายการที่ยัง &quot;รอตัด&quot; เข้าเป็นรายได้ในสลิปเงินเดือนอัตโนมัติ
              ตามงวดที่ตรงกับวันที่ระบุ
            </p>
          </div>
          {canManage && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> เพิ่มค่าคอม
            </button>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted">ยอดรอตัดเข้าเงินเดือนทั้งหมด</p>
            <p className="text-lg font-semibold text-foreground">{thb(pendingTotal)} บาท</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white border border-border rounded-xl overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">ยังไม่มีรายการค่าคอม</div>
          ) : (
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted">เลขที่</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted">พนักงาน</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted">รายละเอียด</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted">วันที่</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted">จำนวนเงิน</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted">สถานะ</th>
                  {canManage && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {c.status === "pending" && canManage ? (
                        <button onClick={() => openEdit(c)} className="hover:underline">
                          {c.code}
                        </button>
                      ) : (
                        c.code
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {c.employee ? `${c.employee.employee_code} - ${c.employee.first_name} ${c.employee.last_name}${c.employee.nickname ? ` (${c.employee.nickname})` : ""}` : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.title || "-"}</td>
                    <td className="px-4 py-2.5 text-muted">{c.earned_date.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">{thb(c.amount)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge label={STATUS_LABEL[c.status].label} variant={STATUS_LABEL[c.status].variant} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        {c.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => cancel(c)} title="ยกเลิก" className="p-1.5 text-muted hover:text-amber-600">
                              <Ban className="w-4 h-4" />
                            </button>
                            <button onClick={() => remove(c)} title="ลบ" className="p-1.5 text-muted hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h4 className="text-lg font-semibold text-foreground">{form.id ? "แก้ไขค่าคอม" : "เพิ่มค่าคอม"}</h4>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">พนักงาน *</label>
              <EmployeeCombobox employees={employees} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">วันที่ *</label>
                <input
                  type="date"
                  value={form.earned_date}
                  onChange={(e) => setForm({ ...form, earned_date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">รายละเอียด (แสดงในสลิป)</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="เช่น ค่าคอมขายเดือน ก.ย."
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">หมายเหตุ</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white resize-none"
              />
            </div>
            <p className="text-xs text-muted">
              วันที่ต้องอยู่ในช่วงงวดเงินเดือนที่ต้องการให้เข้า — ระบบจะดึงเข้าเป็นรายได้อัตโนมัติตอนกด &quot;คำนวณสลิป&quot;
              ของงวดที่ครอบคลุมวันที่นี้
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:bg-surface">
                ยกเลิก
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-accent-500 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

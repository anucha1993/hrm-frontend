"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import EmployeeCombobox from "@/components/EmployeeCombobox";
import { Plus, Trash2, Loader2, Home } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DormRoom, Employee, Paginated } from "@/lib/types";

function thb(v: string | number | null | undefined) {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type FormState = {
  id?: number;
  room_no: string;
  employee_id: string;
  rent_amount: string;
  last_meter_reading: string;
  is_active: boolean;
  note: string;
};

function emptyForm(): FormState {
  return { room_no: "", employee_id: "", rent_amount: "500", last_meter_reading: "0", is_active: true, note: "" };
}

export default function DormRoomsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("dorm.manage");

  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: DormRoom[] }>("/dorm-rooms");
      setRooms(res.data);
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

  function openEdit(r: DormRoom) {
    setForm({
      id: r.id,
      room_no: r.room_no,
      employee_id: r.employee_id ? String(r.employee_id) : "",
      rent_amount: r.rent_amount,
      last_meter_reading: r.last_meter_reading,
      is_active: r.is_active,
      note: r.note ?? "",
    });
  }

  async function submit() {
    if (!form) return;
    if (!form.room_no.trim()) {
      setError("กรุณากรอกเลขห้อง");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        room_no: form.room_no.trim(),
        employee_id: form.employee_id ? Number(form.employee_id) : null,
        rent_amount: Number(form.rent_amount || 0),
        last_meter_reading: Number(form.last_meter_reading || 0),
        is_active: form.is_active,
        note: form.note || null,
      };
      if (form.id) {
        await apiFetch(`/dorm-rooms/${form.id}`, { method: "PUT", body });
      } else {
        await apiFetch("/dorm-rooms", { method: "POST", body });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: DormRoom) {
    if (!confirm(`ลบห้อง ${r.room_no} ?`)) return;
    try {
      await apiFetch(`/dorm-rooms/${r.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="ห้องพัก" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">ห้องพัก</h3>
            <p className="text-xs text-muted">จัดการห้องพักและผู้เช่าปัจจุบัน — ใช้เป็นฐานสำหรับออกบิลค่าไฟรายเดือน</p>
          </div>
          {canManage && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> เพิ่มห้อง
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">ยังไม่มีห้องพัก</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted">ห้อง</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted">ผู้เช่าปัจจุบัน</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted">ค่าห้อง</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted">เลขมิเตอร์ล่าสุด</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted">สถานะ</th>
                  {canManage && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <button onClick={() => canManage && openEdit(r)} className="flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-muted" /> {r.room_no}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {r.employee ? `${r.employee.employee_code} - ${r.employee.first_name} ${r.employee.last_name}` : <span className="text-muted">ว่าง</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">{thb(r.rent_amount)}</td>
                    <td className="px-4 py-2.5 text-right">{thb(r.last_meter_reading)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge label={r.is_active ? "ใช้งาน" : "ปิดใช้งาน"} variant={r.is_active ? "success" : "default"} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => remove(r)} className="p-1.5 text-muted hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            <h4 className="text-lg font-semibold text-foreground">{form.id ? "แก้ไขห้อง" : "เพิ่มห้อง"}</h4>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">เลขห้อง *</label>
              <input
                value={form.room_no}
                onChange={(e) => setForm({ ...form, room_no: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">ผู้เช่าปัจจุบัน</label>
              <EmployeeCombobox employees={employees} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ค่าห้อง (บาท)</label>
                <input
                  type="number"
                  value={form.rent_amount}
                  onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">เลขมิเตอร์ล่าสุด</label>
                <input
                  type="number"
                  value={form.last_meter_reading}
                  onChange={(e) => setForm({ ...form, last_meter_reading: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              ใช้งานอยู่
            </label>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">หมายเหตุ</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white resize-none"
              />
            </div>
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

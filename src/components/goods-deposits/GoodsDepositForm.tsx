"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, Save } from "lucide-react";
import Topbar from "@/components/Topbar";
import { ApiError, apiFetch } from "@/lib/api";
import type { Employee, GoodsDepositSlip, Paginated } from "@/lib/types";

type ItemRow = {
  item_name: string;
  qty: string;
  unit_price: string;
  note: string;
};

interface Props {
  initial?: GoodsDepositSlip;
}

function emptyItem(): ItemRow {
  return { item_name: "", qty: "1", unit_price: "0", note: "" };
}

function thb(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GoodsDepositForm({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string>(
    initial?.employee_id ? String(initial.employee_id) : ""
  );
  const [depositDate, setDepositDate] = useState<string>(
    initial?.deposit_date ?? new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [rows, setRows] = useState<ItemRow[]>(
    initial?.items?.length
      ? initial.items.map((i) => ({
          item_name: i.item_name,
          qty: String(i.qty),
          unit_price: String(i.unit_price),
          note: i.note ?? "",
        }))
      : [emptyItem()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: Paginated<Employee> }>("/employees?per_page=1000&status=active")
      .then((r) => setEmployees(r.data.data))
      .catch(() => undefined);
  }, []);

  const total = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const q = Number(r.qty || 0);
        const p = Number(r.unit_price || 0);
        return sum + (isNaN(q) || isNaN(p) ? 0 : q * p);
      }, 0),
    [rows]
  );

  function updateRow(idx: number, patch: Partial<ItemRow>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, emptyItem()]);
  }

  function removeRow(idx: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs));
  }

  async function submit() {
    setError(null);

    if (!employeeId) {
      setError("กรุณาเลือกพนักงาน");
      return;
    }
    if (rows.length === 0 || rows.some((r) => !r.item_name.trim())) {
      setError("กรุณากรอกชื่อรายการทุกแถว");
      return;
    }

    setSaving(true);
    try {
      const body = {
        employee_id: Number(employeeId),
        deposit_date: depositDate,
        note: note || null,
        items: rows.map((r) => ({
          item_name: r.item_name.trim(),
          qty: Number(r.qty || 0),
          unit_price: Number(r.unit_price || 0),
          note: r.note || null,
        })),
      };

      if (isEdit && initial) {
        await apiFetch(`/goods-deposits/${initial.id}`, { method: "PUT", body });
      } else {
        await apiFetch("/goods-deposits", { method: "POST", body });
      }
      router.push("/goods-deposits");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title={isEdit ? `แก้ไขใบ ${initial?.slip_no}` : "เพิ่มใบมัดจำใหม่"} />
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-center gap-2">
          <Link
            href="/goods-deposits"
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> กลับ
          </Link>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">พนักงาน *</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
              >
                <option value="">-- เลือกพนักงาน --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employee_code} - {e.first_name} {e.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">วันที่หยิบของ *</label>
              <input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white resize-none"
            />
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">รายการของที่หยิบ</h4>
            <button
              onClick={addRow}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100"
            >
              <Plus className="w-4 h-4" /> เพิ่มรายการ
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted w-12">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted">ชื่อรายการ *</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted w-24">จำนวน</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted w-32">ราคา/หน่วย</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted w-32">รวม</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted">หมายเหตุ</th>
                  <th className="px-3 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, idx) => {
                  const subtotal = Number(r.qty || 0) * Number(r.unit_price || 0);
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-sm text-muted">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={r.item_name}
                          onChange={(e) => updateRow(idx, { item_name: e.target.value })}
                          placeholder="เช่น บุหรี่ / น้ำดื่ม"
                          className="w-full px-2 py-1.5 rounded-lg border border-border text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.qty}
                          onChange={(e) => updateRow(idx, { qty: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.unit_price}
                          onChange={(e) => updateRow(idx, { unit_price: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-border text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{thb(subtotal)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={r.note}
                          onChange={(e) => updateRow(idx, { note: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-border text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeRow(idx)}
                          disabled={rows.length === 1}
                          className="p-1 rounded-lg hover:bg-accent-50 text-accent-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface border-t border-border">
                  <td colSpan={4} className="px-3 py-3 text-right text-sm font-semibold text-foreground">
                    รวมทั้งหมด
                  </td>
                  <td className="px-3 py-3 text-right text-base font-bold text-primary-600">{thb(total)} ฿</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/goods-deposits"
            className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted hover:bg-surface"
          >
            ยกเลิก
          </Link>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "บันทึกการแก้ไข" : "บันทึก"}
          </button>
        </div>
      </div>
    </>
  );
}

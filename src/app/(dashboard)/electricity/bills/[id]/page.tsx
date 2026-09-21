"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Lock, RefreshCw } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ElectricityBill, ElectricityBillItem } from "@/lib/types";

function thb(v: string | number | null | undefined) {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMonth(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("th-TH", { year: "numeric", month: "long" });
}

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" }> = {
  draft: { label: "ฉบับร่าง", variant: "warning" },
  finalized: { label: "ปิดรอบแล้ว", variant: "success" },
};

export default function ElectricityBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const canManage = hasPermission("dorm.manage");

  const [bill, setBill] = useState<ElectricityBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [showFinalize, setShowFinalize] = useState(false);
  const [dueDate1, setDueDate1] = useState("");
  const [dueDate2, setDueDate2] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: ElectricityBill }>(`/electricity-bills/${id}`);
      setBill(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (bill && !dueDate1) {
      const m = new Date(bill.bill_month);
      const pad = (n: number) => String(n).padStart(2, "0");
      setDueDate1(`${m.getFullYear()}-${pad(m.getMonth() + 1)}-11`);
      setDueDate2(`${m.getFullYear()}-${pad(m.getMonth() + 1)}-26`);
    }
  }, [bill, dueDate1]);

  async function updateItem(item: ElectricityBillItem, patch: Partial<{ meter_end: number; room_rent: number }>) {
    if (!bill) return;
    setSavingItemId(item.id);
    setError(null);
    try {
      await apiFetch(`/electricity-bills/${bill.id}/items/${item.id}`, { method: "PUT", body: patch });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSavingItemId(null);
    }
  }

  async function syncRooms() {
    if (!bill) return;
    try {
      await apiFetch(`/electricity-bills/${bill.id}/sync-rooms`, { method: "POST" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ดึงห้องเพิ่มไม่สำเร็จ");
    }
  }

  async function finalize() {
    if (!bill) return;
    setFinalizing(true);
    setError(null);
    try {
      await apiFetch(`/electricity-bills/${bill.id}/finalize`, {
        method: "POST",
        body: { due_date_1: dueDate1, due_date_2: dueDate2 },
      });
      setShowFinalize(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ปิดรอบไม่สำเร็จ");
    } finally {
      setFinalizing(false);
    }
  }

  if (loading || !bill) {
    return (
      <>
        <Topbar title="ใบค่าไฟ" />
        <div className="p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      </>
    );
  }

  const isDraft = bill.status === "draft";
  const grandTotal = (bill.items ?? []).reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

  return (
    <>
      <Topbar title={`ใบค่าไฟ ${bill.code}`} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Link href="/electricity/bills" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </Link>
          <div className="flex items-center gap-2">
            <Badge label={STATUS_LABEL[bill.status].label} variant={STATUS_LABEL[bill.status].variant} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{fmtMonth(bill.bill_month)} — {bill.code}</h3>
            <p className="text-xs text-muted">ค่าไฟ/หน่วย {bill.rate_per_unit} บาท · รวมทั้งบิล {thb(grandTotal)} บาท</p>
          </div>
          {isDraft && canManage && (
            <div className="flex gap-2">
              <button
                onClick={syncRooms}
                className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface"
              >
                <RefreshCw className="w-4 h-4" /> ดึงห้องใหม่
              </button>
              <button
                onClick={() => setShowFinalize(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
              >
                <Lock className="w-4 h-4" /> ปิดรอบบิล
              </button>
            </div>
          )}
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

        <div className="bg-white border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted">ห้อง</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted">ผู้เช่า</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted">มิเตอร์ก่อน</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted">มิเตอร์หลัง</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted">หน่วยที่ใช้</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted">ค่าไฟ</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted">ค่าห้อง</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted">รวม</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted">จ่าย/งวด</th>
              </tr>
            </thead>
            <tbody>
              {(bill.items ?? []).map((item) => (
                <ItemRow key={item.id} item={item} editable={isDraft && canManage} saving={savingItemId === item.id} onSave={updateItem} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showFinalize && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h4 className="text-lg font-semibold text-foreground">ปิดรอบบิล</h4>
            <p className="text-xs text-muted">
              ระบบจะสร้างงวดหักเงินเดือน 2 งวด (แบ่งครึ่งยอดรวมแต่ละห้อง) และล็อกบิลนี้ไม่ให้แก้ไขอีก
            </p>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">วันครบกำหนดงวดที่ 1</label>
              <input type="date" value={dueDate1} onChange={(e) => setDueDate1(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">วันครบกำหนดงวดที่ 2</label>
              <input type="date" value={dueDate2} onChange={(e) => setDueDate2(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowFinalize(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:bg-surface">
                ยกเลิก
              </button>
              <button
                onClick={finalize}
                disabled={finalizing}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-accent-500 flex items-center gap-2"
              >
                {finalizing && <Loader2 className="w-4 h-4 animate-spin" />} ยืนยันปิดรอบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ItemRow({
  item,
  editable,
  saving,
  onSave,
}: {
  item: ElectricityBillItem;
  editable: boolean;
  saving: boolean;
  onSave: (item: ElectricityBillItem, patch: Partial<{ meter_end: number; room_rent: number }>) => void;
}) {
  const [meterEnd, setMeterEnd] = useState(item.meter_end ?? "");
  const [roomRent, setRoomRent] = useState(item.room_rent);

  const halfInstallment = Number(item.total_amount || 0) / 2;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface/50">
      <td className="px-3 py-2 font-medium text-foreground">{item.room?.room_no ?? "-"}</td>
      <td className="px-3 py-2 text-foreground">
        {item.employee ? `${item.employee.employee_code} - ${item.employee.first_name} ${item.employee.last_name}` : <span className="text-muted">ว่าง</span>}
      </td>
      <td className="px-3 py-2 text-right text-muted">{thb(item.meter_start)}</td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            value={meterEnd}
            onChange={(e) => setMeterEnd(e.target.value)}
            onBlur={() => meterEnd !== "" && Number(meterEnd) !== Number(item.meter_end) && onSave(item, { meter_end: Number(meterEnd) })}
            className="w-24 px-2 py-1 rounded-lg border border-border text-sm text-right bg-white"
          />
        ) : (
          thb(item.meter_end)
        )}
      </td>
      <td className="px-3 py-2 text-right">{thb(item.units_used)}</td>
      <td className="px-3 py-2 text-right">{thb(item.electricity_amount)}</td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            value={roomRent}
            onChange={(e) => setRoomRent(e.target.value)}
            onBlur={() => Number(roomRent) !== Number(item.room_rent) && onSave(item, { room_rent: Number(roomRent) })}
            className="w-20 px-2 py-1 rounded-lg border border-border text-sm text-right bg-white"
          />
        ) : (
          thb(item.room_rent)
        )}
      </td>
      <td className="px-3 py-2 text-right font-semibold text-foreground">
        {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : thb(item.total_amount)}
      </td>
      <td className="px-3 py-2 text-right text-muted">{thb(halfInstallment)} × 2</td>
    </tr>
  );
}

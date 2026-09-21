"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import Link from "next/link";
import { Plus, Loader2, Zap, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ElectricityBill, Paginated } from "@/lib/types";

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  draft: { label: "ฉบับร่าง", variant: "warning" },
  finalized: { label: "ปิดรอบแล้ว", variant: "success" },
};

function fmtMonth(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("th-TH", { year: "numeric", month: "long" });
}

export default function ElectricityBillsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("dorm.manage");

  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billMonth, setBillMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [ratePerUnit, setRatePerUnit] = useState("4");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Paginated<ElectricityBill> }>("/electricity-bills");
      setBills(res.data.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createBill() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: ElectricityBill }>("/electricity-bills", {
        method: "POST",
        body: { bill_month: `${billMonth}-01`, rate_per_unit: Number(ratePerUnit || 4) },
      });
      window.location.href = `/electricity/bills/${res.data.id}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "สร้างบิลไม่สำเร็จ");
      setSaving(false);
    }
  }

  async function remove(b: ElectricityBill) {
    if (!confirm(`ลบบิล ${b.code} ?`)) return;
    try {
      await apiFetch(`/electricity-bills/${b.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="ใบค่าไฟ/หอพัก" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">ใบค่าไฟ/หอพัก</h3>
            <p className="text-xs text-muted">คำนวณค่าไฟจากเลขมิเตอร์ + ค่าห้อง แบ่งหักเงินเดือน 2 งวด/เดือน</p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> สร้างบิลใหม่
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
          ) : bills.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">ยังไม่มีบิลค่าไฟ</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted">รหัสบิล</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted">เดือน</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted">อัตราค่าไฟ/หน่วย</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted">จำนวนห้อง</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted">สถานะ</th>
                  {canManage && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <Link href={`/electricity/bills/${b.id}`} className="flex items-center gap-1.5 hover:underline">
                        <Zap className="w-3.5 h-3.5 text-muted" /> {b.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{fmtMonth(b.bill_month)}</td>
                    <td className="px-4 py-2.5 text-right">{b.rate_per_unit}</td>
                    <td className="px-4 py-2.5 text-center">{b.items_count ?? "-"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge label={STATUS_LABEL[b.status].label} variant={STATUS_LABEL[b.status].variant} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        {b.status === "draft" && (
                          <button onClick={() => remove(b)} className="p-1.5 text-muted hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h4 className="text-lg font-semibold text-foreground">สร้างบิลค่าไฟใหม่</h4>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">เดือนที่คิดบิล *</label>
              <input
                type="month"
                value={billMonth}
                onChange={(e) => setBillMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">ค่าไฟ/หน่วย (บาท)</label>
              <input
                type="number"
                value={ratePerUnit}
                onChange={(e) => setRatePerUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:bg-surface">
                ยกเลิก
              </button>
              <button
                onClick={createBill}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-accent-500 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} สร้าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

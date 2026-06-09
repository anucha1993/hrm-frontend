"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import Link from "next/link";
import { Plus, Search, Edit2, Trash2, Loader2, Receipt, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { GoodsDepositSlip, GoodsDepositStatus, Paginated } from "@/lib/types";

const STATUS_LABEL: Record<
  GoodsDepositStatus,
  { label: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  pending:   { label: "รอตัดยอด",  variant: "warning" },
  deducted:  { label: "ตัดยอดแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิก",     variant: "danger"  },
  waived:    { label: "ยกหนี้",     variant: "default" },
};

function thb(v: string | number | null | undefined) {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GoodsDepositsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("goods_deposits.create");
  const canUpdate = hasPermission("goods_deposits.update");
  const canDelete = hasPermission("goods_deposits.delete");

  const [items, setItems] = useState<GoodsDepositSlip[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "50" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await apiFetch<{
        data: Paginated<GoodsDepositSlip>;
        summary: { pending_total: number };
      }>(`/goods-deposits?${params.toString()}`);
      setItems(res.data.data);
      setPendingTotal(res.summary.pending_total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, status, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(d: GoodsDepositSlip) {
    if (!confirm(`ลบใบ ${d.slip_no} ?`)) return;
    try {
      await apiFetch(`/goods-deposits/${d.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  async function cancelSlip(d: GoodsDepositSlip) {
    if (!confirm(`ยกเลิกใบ ${d.slip_no} ?`)) return;
    try {
      await apiFetch(`/goods-deposits/${d.id}/status`, {
        method: "POST",
        body: { status: "cancelled" },
      });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ยกเลิกไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="ใบมัดจำของใช้ทั่วไป" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">ใบมัดจำของใช้ทั่วไป</h3>
            <p className="text-xs text-muted">หยิบก่อน จ่ายทีหลัง — หักผ่าน payroll ตามรอบ 15 วัน</p>
          </div>
          {canCreate && (
            <Link
              href="/goods-deposits/create"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> เพิ่มใบใหม่
            </Link>
          )}
        </div>

        {/* Summary card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted">รอตัดยอดทั้งหมด</p>
              <p className="text-lg font-bold text-foreground">{thb(pendingTotal)} ฿</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขใบ / รหัสพนักงาน / ชื่อ..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
          >
            <option value="">ทุกสถานะ</option>
            <option value="pending">รอตัดยอด</option>
            <option value="deducted">ตัดยอดแล้ว</option>
            <option value="cancelled">ยกเลิก</option>
            <option value="waived">ยกหนี้</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
          />
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    {["เลขใบ", "วันที่", "พนักงาน", "ยอดรวม (บาท)", "สถานะ", "อ้างถึง payroll", "จัดการ"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    items.map((d) => {
                      const st = STATUS_LABEL[d.status];
                      return (
                        <tr key={d.id} className="hover:bg-surface/50">
                          <td className="px-4 py-3 text-sm font-mono text-foreground">{d.slip_no}</td>
                          <td className="px-4 py-3 text-sm text-muted">{d.deposit_date}</td>
                          <td className="px-4 py-3">
                            {d.employee ? (
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {d.employee.first_name} {d.employee.last_name}
                                </p>
                                <p className="text-xs text-muted font-mono">{d.employee.employee_code}</p>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-foreground">{thb(d.total_amount)}</td>
                          <td className="px-4 py-3">
                            <Badge label={st.label} variant={st.variant} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted">
                            {d.payroll_period ? d.payroll_period.code : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {canUpdate && d.status === "pending" && (
                                <Link
                                  href={`/goods-deposits/${d.id}/edit`}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary-50 text-primary-600 text-xs font-medium"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> แก้ไข
                                </Link>
                              )}
                              {canUpdate && d.status === "pending" && (
                                <button
                                  onClick={() => cancelSlip(d)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-50 text-amber-600 text-xs font-medium"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> ยกเลิก
                                </button>
                              )}
                              {canDelete && d.status !== "deducted" && (
                                <button
                                  onClick={() => remove(d)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent-50 text-accent-600 text-xs font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> ลบ
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

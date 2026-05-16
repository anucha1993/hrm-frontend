"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { apiFetch } from "@/lib/api";
import { fmtMoney, fmtDate } from "@/lib/payroll";
import { Plus, Loader2, Search, FileText } from "lucide-react";

type RateItemBrief = { id: number; code: string; name: string; unit: "raft" | "meter"; work_type: string };
type EmployeeBrief = { id: number; employee_code: string; first_name: string; last_name: string };

type ItemRow = {
  id: number;
  production_rate_item_id: number;
  target_qty: string;
  actual_qty_total: string;
  total_amount: string;
  rate_item?: RateItemBrief | null;
};

type WorkOrder = {
  id: number;
  code: string;
  start_date: string;
  end_date: string;
  period_type: "daily" | "biweekly_1" | "biweekly_2" | "monthly" | "custom";
  status: "draft" | "in_progress" | "completed" | "paid";
  total_amount: string;
  location_name: string | null;
  items_count: number;
  members_count: number;
  daily_entries_count: number;
  team_leader?: EmployeeBrief | null;
  items?: ItemRow[];
};

const STATUS_LABEL: Record<WorkOrder["status"], { label: string; cls: string }> = {
  draft: { label: "ร่าง", cls: "bg-gray-100 text-gray-700" },
  in_progress: { label: "กำลังทำ", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "เสร็จแล้ว", cls: "bg-green-100 text-green-700" },
  paid: { label: "จ่ายแล้ว", cls: "bg-purple-100 text-purple-700" },
};

const PERIOD_LABEL: Record<WorkOrder["period_type"], string> = {
  daily: "รายวัน",
  biweekly_1: "15 วัน (6–20)",
  biweekly_2: "15 วัน (21–5)",
  monthly: "รายเดือน",
  custom: "กำหนดเอง",
};

export default function WorkOrdersPage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [periodType, setPeriodType] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "50" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (status) params.set("status", status);
      if (periodType) params.set("period_type", periodType);
      const res = await apiFetch<{ data: { data: WorkOrder[] } }>(`/payroll/work-orders?${params}`);
      setItems(res.data?.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const totalAmount = useMemo(
    () => items.reduce((a, b) => a + Number(b.total_amount || 0), 0),
    [items]
  );

  return (
    <>
      <Topbar title="ใบจ่ายงานการผลิต" />
      <div className="p-6 space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="flex items-end gap-2 flex-wrap">
            <Field label="ตั้งแต่"><input type="date" className="payroll-input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="ถึง"><input type="date" className="payroll-input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <Field label="ช่วง">
              <select className="payroll-input" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="daily">รายวัน</option>
                <option value="biweekly_1">15 วัน (6–20)</option>
                <option value="biweekly_2">15 วัน (21–5)</option>
                <option value="monthly">รายเดือน</option>
                <option value="custom">กำหนดเอง</option>
              </select>
            </Field>
            <Field label="สถานะ">
              <select className="payroll-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="draft">ร่าง</option>
                <option value="in_progress">กำลังทำ</option>
                <option value="completed">เสร็จแล้ว</option>
                <option value="paid">จ่ายแล้ว</option>
              </select>
            </Field>
            <button onClick={load} className="px-4 py-2 rounded-lg border border-border bg-white text-sm inline-flex items-center gap-1 h-[38px]">
              <Search className="w-4 h-4" /> กรอง
            </button>
          </div>
          <div className="flex gap-2">
            <Link href="/payroll/work-orders/import" className="px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium hover:bg-gray-50">
              นำเข้า Payroll
            </Link>
            <Link href="/payroll/work-orders/new" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> สร้างใบงานใหม่
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 flex gap-6 text-sm">
          <div><span className="text-muted">ใบงานทั้งหมด:</span> <span className="font-semibold">{items.length}</span></div>
          <div><span className="text-muted">ยอดค่าจ้างรวม:</span> <span className="font-semibold text-green-700">{fmtMoney(totalAmount)} บาท</span></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">ยังไม่มีรายการ</div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3">รหัส</th>
                  <th className="px-3 py-3">ช่วงงาน</th>
                  <th className="px-3 py-3">หัวหน้าทีม</th>
                  <th className="px-3 py-3">สถานที่</th>
                  <th className="px-3 py-3">รายการผลิต</th>
                  <th className="px-3 py-3 text-center">ลูกทีม</th>
                  <th className="px-3 py-3 text-center">วันที่ทำ</th>
                  <th className="px-3 py-3 text-right">ยอดค่าจ้าง</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3 text-xs font-mono whitespace-nowrap">
                      <FileText className="w-3.5 h-3.5 inline mr-1 text-primary-500" />{a.code}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div>{fmtDate(a.start_date)} → {fmtDate(a.end_date)}</div>
                      <div className="text-muted">{PERIOD_LABEL[a.period_type]}</div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap font-medium">
                      {a.team_leader ? `${a.team_leader.first_name} ${a.team_leader.last_name}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs">{a.location_name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-muted">{a.items_count} รายการ</div>
                      {(a.items ?? []).slice(0, 2).map((it) => (
                        <div key={it.id} className="text-xs">
                          <span className="font-medium">{it.rate_item?.name}</span>
                          <span className="text-muted"> · {Number(it.actual_qty_total)}/{Number(it.target_qty)}</span>
                        </div>
                      ))}
                      {(a.items?.length ?? 0) > 2 && (
                        <div className="text-xs text-muted">+{(a.items!.length - 2)} อีก</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-xs">{a.members_count}</td>
                    <td className="px-3 py-3 text-center text-xs">{a.daily_entries_count}</td>
                    <td className="px-3 py-3 text-right font-semibold text-green-700 whitespace-nowrap">
                      {fmtMoney(a.total_amount)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_LABEL[a.status].cls}`}>
                        {STATUS_LABEL[a.status].label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/payroll/work-orders/${a.id}`} className="text-primary-600 hover:underline text-xs font-medium">
                        ดู / แก้ไข
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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

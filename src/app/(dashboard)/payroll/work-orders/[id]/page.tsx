"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2, Save, AlertCircle, Calendar, Pencil, Printer, X } from "lucide-react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtMoney, fmtDate } from "@/lib/payroll";
import { useAuth } from "@/lib/auth-context";
import { categoryLabel } from "@/lib/productionRates";
import WorkOrderForm, { type WorkOrderFormInit, type ItemRow, type MemberRow, type ExtraRow, type LinkedWorkOrderBrief } from "../WorkOrderForm";

type RateItemBrief = { id: number; code: string; name: string; unit: string; work_type: string; category?: string | null };
type EmployeeBrief = { id: number; employee_code: string; first_name: string; last_name: string; nickname?: string | null };

type DailyEntryItem = {
  id: number;
  work_order_item_id: number;
  assigned_qty: string;
  actual_qty: string;
};

type DailyEntry = {
  id: number;
  work_date: string;
  note: string | null;
  items: DailyEntryItem[];
};

type LinkedWorkOrder = LinkedWorkOrderBrief;

type WorkOrderDetail = {
  id: number;
  code: string;
  start_date: string;
  end_date: string;
  period_type: WorkOrderFormInit["period_type"];
  team_leader_id: number;
  team_leader?: EmployeeBrief | null;
  location_name: string | null;
  status: NonNullable<WorkOrderFormInit["status"]>;
  note: string | null;
  batch_code: string | null;
  linked_work_orders?: LinkedWorkOrder[];
  batch_total_amount?: number;
  total_amount: string;
  items: Array<{
    id: number;
    production_rate_item_id: number;
    target_qty: string;
    actual_qty_total: string;
    rate_at_target_override: string | null;
    rate_below_target_override: string | null;
    rate_used: string;
    total_amount: string;
    rate_item: RateItemBrief | null;
  }>;
  members: Array<{ id: number; employee_id: number; role: string | null; note: string | null; employee: EmployeeBrief | null }>;
  extra_items?: Array<{ id: number; name: string; unit: string | null; qty: string; rate: string; amount: string; deduction_type?: string | null; note: string | null }>;
  daily_entries: DailyEntry[];
};

export default function EditWorkOrderPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { hasPermission } = useAuth();
  const canViewMoney = hasPermission(["payroll.view", "payroll.config"]);
  const [data, setData] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"detail" | "daily">("detail");
  const [printSummary, setPrintSummary] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: WorkOrderDetail }>(`/payroll/work-orders/${id}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return (
      <>
        <Topbar title="ใบจ่ายงาน" />
        <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin" /></div>
      </>
    );
  }

  const initial: WorkOrderFormInit = {
    id: data.id,
    code: data.code,
    start_date: data.start_date.slice(0, 10),
    end_date: data.end_date.slice(0, 10),
    period_type: data.period_type,
    team_leader_id: data.team_leader_id,
    location_name: data.location_name ?? "",
    note: data.note ?? "",
    batch_code: data.batch_code ?? "",
    status: data.status,
    total_amount: data.total_amount,
    items: data.items.map<ItemRow>((it) => ({
      id: it.id,
      production_rate_item_id: it.production_rate_item_id,
      target_qty: String(it.target_qty),
      rate_at_target_override: it.rate_at_target_override ?? "",
      rate_below_target_override: it.rate_below_target_override ?? "",
      actual_qty_total: String(it.actual_qty_total),
      rate_used: String(it.rate_used),
      total_amount: String(it.total_amount),
    })),
    members: data.members.map<MemberRow>((m) => ({
      employee_id: m.employee_id,
      role: m.role ?? "",
      note: m.note ?? "",
    })),
    extras: (data.extra_items ?? []).map<ExtraRow>((e) => ({
      id: e.id,
      name: e.name,
      unit: e.unit ?? "",
      qty: String(e.qty),
      rate: String(e.rate),
      deduction_type: e.deduction_type ?? "",
      note: e.note ?? "",
    })),
  };

  return (
    <div>
      <div className="px-6 pt-4">
        <div className="flex gap-1 border-b border-border">
          <TabBtn active={tab === "detail"} onClick={() => setTab("detail")}>
            รายละเอียดใบงาน
          </TabBtn>
          <TabBtn active={tab === "daily"} onClick={() => setTab("daily")}>
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            บันทึกผลรายวัน ({data.daily_entries.length})
          </TabBtn>
        </div>
      </div>

      {tab === "detail" ? (
        <WorkOrderForm
          initial={initial}
          isEdit
          linkedWorkOrders={data.linked_work_orders}
          batchTotalAmount={data.batch_total_amount}
          onBatchChanged={load}
          onPrintSummary={() => setPrintSummary(true)}
        />
      ) : (
        <DailyEntriesTab data={data} onChanged={load} />
      )}

      {printSummary && data.status === "completed" && (
        <PrintSummaryModal wo={data} canViewMoney={canViewMoney} onClose={() => setPrintSummary(false)} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${active ? "border-primary-600 text-primary-600" : "border-transparent text-muted hover:text-gray-700"}`}>
      {children}
    </button>
  );
}

// ---------------- Daily Entries Tab ----------------

type EntryDraft = {
  id?: number;
  work_date: string;
  note: string;
  items: Record<number, { assigned: string; actual: string }>;
};

function DailyEntriesTab({ data, onChanged }: { data: WorkOrderDetail; onChanged: () => void }) {
  const readOnly = data.status === "paid";
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [printEntry, setPrintEntry] = useState<DailyEntry | null>(null);

  function startNew() {
    const items: Record<number, { assigned: string; actual: string }> = {};
    data.items.forEach((it) => { items[it.id] = { assigned: "0", actual: "0" }; });
    setDraft({ work_date: data.start_date.slice(0, 10), note: "", items });
    setErr(null);
  }
  function startEdit(entry: DailyEntry) {
    const items: Record<number, { assigned: string; actual: string }> = {};
    data.items.forEach((it) => { items[it.id] = { assigned: "0", actual: "0" }; });
    entry.items.forEach((it) => {
      items[it.work_order_item_id] = {
        assigned: String(it.assigned_qty ?? "0"),
        actual: String(it.actual_qty ?? "0"),
      };
    });
    setDraft({ id: entry.id, work_date: entry.work_date.slice(0, 10), note: entry.note ?? "", items });
    setErr(null);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        work_date: draft.work_date,
        note: draft.note || null,
        items: data.items.map((it) => ({
          work_order_item_id: it.id,
          assigned_qty: Number(draft.items[it.id]?.assigned ?? 0),
          actual_qty: Number(draft.items[it.id]?.actual ?? 0),
        })),
      };
      if (draft.id) {
        await apiFetch(`/payroll/work-orders/${data.id}/daily-entries/${draft.id}`, { method: "PUT", body: payload });
      } else {
        await apiFetch(`/payroll/work-orders/${data.id}/daily-entries`, { method: "POST", body: payload });
      }
      setDraft(null);
      onChanged();
    } catch (ex: unknown) {
      const msg = ex instanceof ApiError && typeof ex.data === "object" && ex.data
        ? (ex.data as { message?: string }).message ?? ex.message
        : ex instanceof Error ? ex.message : "บันทึกไม่สำเร็จ";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entry: DailyEntry) {
    if (!confirm(`ลบบันทึกวันที่ ${fmtDate(entry.work_date)}?`)) return;
    try {
      await apiFetch(`/payroll/work-orders/${data.id}/daily-entries/${entry.id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title={`บันทึกผลรายวัน — ${data.code}`} />
      <div className="p-6 max-w-6xl space-y-4">
        <div className="bg-white rounded-xl border border-border p-4 flex justify-between items-center">
          <div className="text-sm">
            <span className="text-muted">ช่วงงาน:</span>{" "}
            <span className="font-semibold">{fmtDate(data.start_date)} → {fmtDate(data.end_date)}</span>
            <span className="text-muted ml-4">บันทึกแล้ว:</span>{" "}
            <span className="font-semibold">{data.daily_entries.length} วัน</span>
            <span className="text-muted ml-4">ยอดรวม:</span>{" "}
            <span className="font-bold text-green-700">{fmtMoney(data.total_amount)}</span>
          </div>
          {!readOnly && !draft && (
            <button onClick={startNew}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm">
              <Plus className="w-4 h-4" /> เพิ่มวันใหม่
            </button>
          )}
        </div>

        {draft && (
          <div className="bg-white rounded-xl border-2 border-primary-300 p-4 space-y-3">
            <h4 className="font-semibold text-sm">{draft.id ? "แก้ไขบันทึกวันที่" : "บันทึกผลใหม่"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-muted mb-1 block">วันที่ *</span>
                <input type="date" className="payroll-input"
                  min={data.start_date.slice(0, 10)} max={data.end_date.slice(0, 10)}
                  value={draft.work_date} onChange={(e) => setDraft({ ...draft, work_date: e.target.value })} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-medium text-muted mb-1 block">หมายเหตุ</span>
                <input type="text" className="payroll-input"
                  value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </label>
            </div>

            <table className="w-full text-sm border border-border rounded-lg">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-2">รายการผลิต</th>
                  <th className="px-3 py-2 text-right w-32">คงเหลือ</th>
                  <th className="px-3 py-2 text-right w-32">สั่งทำวันนี้</th>
                  <th className="px-3 py-2 text-right w-32">ผลิตจริง</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => {
                  // คำนวณ assigned สะสมจากใบรายวันทุกใบ ยกเว้นที่กำลังแก้
                  const assignedSoFar = data.daily_entries
                    .filter((e) => e.id !== draft.id)
                    .flatMap((e) => e.items)
                    .filter((ei) => ei.work_order_item_id === it.id)
                    .reduce((s, ei) => s + Number(ei.assigned_qty ?? 0), 0);
                  const target = Number(it.target_qty);
                  const thisAssigned = Number(draft.items[it.id]?.assigned ?? 0);
                  const remaining = target - assignedSoFar - thisAssigned;
                  return (
                    <tr key={it.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{it.rate_item?.name ?? "—"}</div>
                        <div className="text-xs text-muted">
                          เป้า {target} / สั่งไปแล้ว {assignedSoFar} / ผลิตสะสม {Number(it.actual_qty_total)}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-right text-xs font-semibold ${remaining < 0 ? "text-red-600" : remaining === 0 ? "text-green-700" : "text-blue-700"}`}>
                        {remaining}
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" className="payroll-input text-right"
                          value={draft.items[it.id]?.assigned ?? "0"}
                          onChange={(e) => setDraft({
                            ...draft,
                            items: {
                              ...draft.items,
                              [it.id]: { ...(draft.items[it.id] ?? { actual: "0" }), assigned: e.target.value },
                            },
                          })} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" className="payroll-input text-right"
                          value={draft.items[it.id]?.actual ?? "0"}
                          onChange={(e) => setDraft({
                            ...draft,
                            items: {
                              ...draft.items,
                              [it.id]: { ...(draft.items[it.id] ?? { assigned: "0" }), actual: e.target.value },
                            },
                          })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {err && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {err}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDraft(null)} className="px-4 py-2 text-sm rounded-lg border border-border">ยกเลิก</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white inline-flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึก
              </button>
            </div>
          </div>
        )}

        {data.daily_entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">ยังไม่มีบันทึกผลรายวัน</div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3 w-32">วันที่</th>
                  <th className="px-3 py-3">ผลผลิต</th>
                  <th className="px-3 py-3">หมายเหตุ</th>
                  <th className="px-3 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {data.daily_entries
                  .slice()
                  .sort((a, b) => a.work_date.localeCompare(b.work_date))
                  .map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3 text-xs font-medium whitespace-nowrap">{fmtDate(entry.work_date)}</td>
                      <td className="px-3 py-3 text-xs">
                        {entry.items.map((ei) => {
                          const woItem = data.items.find((x) => x.id === ei.work_order_item_id);
                          const assigned = Number(ei.assigned_qty ?? 0);
                          const actual = Number(ei.actual_qty ?? 0);
                          if (!woItem || (assigned === 0 && actual === 0)) return null;
                          return (
                            <div key={ei.id}>
                              <span className="font-medium">{woItem.rate_item?.name}</span>:{" "}
                              <span className="text-muted">สั่ง</span>{" "}
                              <span className="font-semibold text-blue-700">{assigned}</span>{" / "}
                              <span className="text-muted">จริง</span>{" "}
                              <span className={`font-semibold ${actual >= assigned ? "text-green-700" : "text-amber-700"}`}>{actual}</span>
                            </div>
                          );
                        })}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">{entry.note ?? "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => setPrintEntry(entry)} className="p-1 text-gray-400 hover:text-blue-600" title="พิมพ์ใบจ่ายงาน">
                          <Printer className="w-4 h-4" />
                        </button>
                        {!readOnly && (
                          <>
                            <button onClick={() => startEdit(entry)} className="p-1 text-gray-400 hover:text-primary-600" title="แก้ไข">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => removeEntry(entry)} className="p-1 text-gray-400 hover:text-red-600" title="ลบ">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {printEntry && <PrintDailyOrderModal wo={data} entry={printEntry} onClose={() => setPrintEntry(null)} />}
    </>
  );
}

// ---------------- Print Modal ----------------

function PrintDailyOrderModal({ wo, entry, onClose }: { wo: WorkOrderDetail; entry: DailyEntry; onClose: () => void }) {
  const periodLabel: Record<string, string> = {
    daily: "รายวัน",
    biweekly_1: "ตัดวิก 6-20 (จ่าย 26)",
    biweekly_2: "ตัดวิก 21-5 (จ่าย 11)",
    monthly: "รายเดือน",
    custom: "กำหนดเอง",
  };
  const roleLabel: Record<string, string> = {
    caster: "คนเท",
    lifter: "คนยก",
    helper: "ผู้ช่วย",
  };
  const leaderName = wo.team_leader
    ? `${wo.team_leader.first_name} ${wo.team_leader.last_name}${wo.team_leader.nickname ? ` (${wo.team_leader.nickname})` : ""}`.trim()
    : "—";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-6 print:static print:bg-white print:overflow-visible print:py-0">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl print:shadow-none print:max-w-none">
        {/* Toolbar (hidden on print) */}
        <div className="no-print flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">ตัวอย่างใบจ่ายงานประจำวัน</div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm">
              <Printer className="w-4 h-4" /> พิมพ์
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable area */}
        <div className="print-area p-8 text-[13px] text-gray-900">
          <div className="text-center mb-4">
            <div className="text-xl font-bold">ใบจ่ายงานประจำวัน</div>
            <div className="text-sm text-gray-600">Daily Work Assignment</div>
          </div>

          <table className="w-full mb-4">
            <tbody>
              <tr>
                <td className="py-1 w-32 text-gray-600">เลขที่ใบงาน</td>
                <td className="py-1 font-semibold">{wo.code}</td>
                <td className="py-1 w-28 text-gray-600">วันที่จ่ายงาน</td>
                <td className="py-1 font-semibold">{fmtDate(entry.work_date)}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">ช่วงงาน</td>
                <td className="py-1">{fmtDate(wo.start_date)} → {fmtDate(wo.end_date)}</td>
                <td className="py-1 text-gray-600">รอบจ่าย</td>
                <td className="py-1">{periodLabel[wo.period_type] ?? wo.period_type}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">หัวหน้าทีม</td>
                <td className="py-1 font-semibold">{leaderName}</td>
                <td className="py-1 text-gray-600">สถานที่</td>
                <td className="py-1">{wo.location_name ?? "—"}</td>
              </tr>
              {entry.note && (
                <tr>
                  <td className="py-1 text-gray-600 align-top">หมายเหตุ</td>
                  <td className="py-1" colSpan={3}>{entry.note}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* รายการงาน */}
          <div className="font-semibold mb-1">รายการงานที่สั่งทำ</div>
          <table className="w-full border border-gray-700 mb-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-700 px-2 py-1 w-10">#</th>
                <th className="border border-gray-700 px-2 py-1 text-left">รายการผลิต</th>
                <th className="border border-gray-700 px-2 py-1 w-20">หน่วย</th>
                <th className="border border-gray-700 px-2 py-1 w-24">เป้ารวม</th>
                <th className="border border-gray-700 px-2 py-1 w-24">สั่งวันนี้</th>
                <th className="border border-gray-700 px-2 py-1 w-24">ผลิตจริง</th>
              </tr>
            </thead>
            <tbody>
              {wo.items.map((it, idx) => {
                const ei = entry.items.find((x) => x.work_order_item_id === it.id);
                const assigned = Number(ei?.assigned_qty ?? 0);
                const actual = Number(ei?.actual_qty ?? 0);
                return (
                  <tr key={it.id}>
                    <td className="border border-gray-700 px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border border-gray-700 px-2 py-1">{it.rate_item?.name ?? "—"}</td>
                    <td className="border border-gray-700 px-2 py-1 text-center">{it.rate_item?.unit ?? "-"}</td>
                    <td className="border border-gray-700 px-2 py-1 text-right">{Number(it.target_qty)}</td>
                    <td className="border border-gray-700 px-2 py-1 text-right font-semibold">{assigned > 0 ? assigned : ""}</td>
                    <td className="border border-gray-700 px-2 py-1 text-right">{actual > 0 ? actual : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* รายการจ่าย-หักเพิ่มเติม */}
          {wo.extra_items && wo.extra_items.length > 0 && (
            <>
              <div className="font-semibold mb-1">รายการจ่าย-หักเพิ่มเติม</div>
              <table className="w-full border border-gray-700 mb-4">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-700 px-2 py-1 w-10">#</th>
                    <th className="border border-gray-700 px-2 py-1 text-left">รายการ</th>
                    <th className="border border-gray-700 px-2 py-1 w-20">หน่วย</th>
                    <th className="border border-gray-700 px-2 py-1 w-24">จำนวน</th>
                    <th className="border border-gray-700 px-2 py-1 w-28">ราคา/หน่วย</th>
                    <th className="border border-gray-700 px-2 py-1 w-28">รวมเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.extra_items.map((ex, idx) => (
                    <tr key={ex.id}>
                      <td className="border border-gray-700 px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-gray-700 px-2 py-1">{ex.name}</td>
                      <td className="border border-gray-700 px-2 py-1 text-center">{ex.unit ?? "-"}</td>
                      <td className="border border-gray-700 px-2 py-1 text-right">{Number(ex.qty)}</td>
                      <td className="border border-gray-700 px-2 py-1 text-right">{fmtMoney(ex.rate)}</td>
                      <td className={`border border-gray-700 px-2 py-1 text-right font-semibold ${Number(ex.amount) < 0 ? "text-red-600" : ""}`}>{fmtMoney(ex.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ผู้รับงาน */}
          <div className="font-semibold mb-1">ผู้รับงาน (สมาชิกทีม)</div>
          <table className="w-full border border-gray-700 mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-700 px-2 py-1 w-10">#</th>
                <th className="border border-gray-700 px-2 py-1 w-28">รหัส</th>
                <th className="border border-gray-700 px-2 py-1 text-left">ชื่อ-นามสกุล</th>
                <th className="border border-gray-700 px-2 py-1 w-32">บทบาท</th>
                <th className="border border-gray-700 px-2 py-1 w-48">ลงชื่อรับงาน</th>
              </tr>
            </thead>
            <tbody>
              {wo.members.length === 0 ? (
                <tr><td colSpan={5} className="border border-gray-700 px-2 py-3 text-center text-gray-500">— ไม่มีสมาชิก —</td></tr>
              ) : (
                wo.members.map((m, idx) => (
                  <tr key={m.id}>
                    <td className="border border-gray-700 px-2 py-2 text-center">{idx + 1}</td>
                    <td className="border border-gray-700 px-2 py-2">{m.employee?.employee_code ?? "-"}</td>
                    <td className="border border-gray-700 px-2 py-2">
                      {m.employee ? `${m.employee.first_name} ${m.employee.last_name}${m.employee.nickname ? ` (${m.employee.nickname})` : ""}` : "-"}
                    </td>
                    <td className="border border-gray-700 px-2 py-2">{roleLabel[m.role ?? ""] ?? (m.role || "-")}</td>
                    <td className="border border-gray-700 px-2 py-2"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* ลายเซ็น */}
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="border-t border-gray-700 pt-1">ผู้จ่ายงาน</div>
              <div className="text-xs text-gray-600 mt-1">วันที่ ........./........./.........</div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-700 pt-1">หัวหน้าทีม</div>
              <div className="text-xs text-gray-600 mt-1">({leaderName})</div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-700 pt-1">ผู้ตรวจสอบ</div>
              <div className="text-xs text-gray-600 mt-1">วันที่ ........./........./.........</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Print Summary Modal (ยอดรวมทั้งใบงาน) ----------------

function PrintSummaryModal({ wo, canViewMoney, onClose }: { wo: WorkOrderDetail; canViewMoney: boolean; onClose: () => void }) {
  const periodLabel: Record<string, string> = {
    daily: "รายวัน",
    biweekly_1: "ตัดวิก 6-20 (จ่าย 26)",
    biweekly_2: "ตัดวิก 21-5 (จ่าย 11)",
    monthly: "รายเดือน",
    custom: "กำหนดเอง",
  };
  const leaderName = wo.team_leader
    ? `${wo.team_leader.first_name} ${wo.team_leader.last_name}${wo.team_leader.nickname ? ` (${wo.team_leader.nickname})` : ""}`.trim()
    : "—";

  // สถานะเกณฑ์ — ตรงกับ WorkOrderItem::recompute(): actual >= target = ถึงเกณฑ์ (ได้เรทสูง)
  // งานเหมา หรือไม่ได้ตั้งเป้า (target <= 0) ไม่มีเกณฑ์ → ไม่นับ
  const targetStatus = (it: WorkOrderDetail["items"][number]): boolean | null => {
    const target = Number(it.target_qty);
    if (it.rate_item?.work_type === "flat" || target <= 0) return null;
    return Number(it.actual_qty_total) >= target;
  };
  const judged = wo.items.map(targetStatus).filter((x): x is boolean => x !== null);
  const overallMet: boolean | null = judged.length === 0 ? null : judged.every(Boolean);
  const StatusBadge = ({ met, big }: { met: boolean; big?: boolean }) => (
    <span className={`inline-block rounded border px-1.5 ${big ? "text-base font-bold px-3 py-0.5 border-2" : "text-xs font-semibold"} ${met ? "border-green-700 text-green-700" : "border-red-600 text-red-600"}`}>
      {met ? "ถึงเกณฑ์" : "ไม่ถึงเกณฑ์"}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-6 print:static print:bg-white print:overflow-visible print:py-0">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl print:shadow-none print:max-w-none">
        {/* Toolbar (hidden on print) */}
        <div className="no-print flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">ตัวอย่างใบจ่ายงาน (ยอดรวม)</div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm">
              <Printer className="w-4 h-4" /> พิมพ์
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable area */}
        <div className="print-area p-8 text-[13px] text-gray-900">
          <div className="mb-2">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold">ใบจ่ายงาน {wo.code}</div>
              {overallMet !== null && <StatusBadge met={overallMet} big />}
            </div>
            <div className="flex flex-wrap gap-x-4 text-sm">
              <span>{fmtDate(wo.start_date)} → {fmtDate(wo.end_date)}</span>
              <span>หัวหน้าทีม: <span className="font-semibold">{leaderName}</span></span>
              {wo.location_name && <span>สถานที่: {wo.location_name}</span>}
              <span className="ml-auto text-gray-600">{periodLabel[wo.period_type] ?? wo.period_type} · บันทึก {wo.daily_entries.length} วัน</span>
            </div>
            {wo.note && <div className="text-sm text-gray-600 mt-0.5">หมายเหตุ: {wo.note}</div>}
          </div>

          {/* รายการงาน — เขียนเป็นบรรทัดคำนวณตามแบบฟอร์มกระดาษจริง: ชื่อรายการ ราคา x จำนวน = รวม (ไม่มีกรอบตาราง) */}
          {(() => {
            const groups: Array<{ key: string | null; label: string; items: typeof wo.items }> = [];
            wo.items.forEach((it) => {
              const key = it.rate_item?.category ?? null;
              let g = groups.find((x) => x.key === key);
              if (!g) {
                g = { key, label: key ? categoryLabel(key) : "อื่นๆ", items: [] };
                groups.push(g);
              }
              g.items.push(it);
            });
            return groups.map((g) => {
              const groupTotal = g.items.reduce((s, it) => s + Number(it.total_amount || 0), 0);
              return (
                <div key={g.key ?? "__none__"} className="mb-4">
                  <div className="font-semibold underline mb-1">แบบฟอร์ม {g.label}</div>
                  <div className="space-y-0.5 pl-2">
                    {g.items.map((it) => (
                      <div key={it.id} className="flex items-baseline gap-2">
                        <span className="min-w-[220px]">{it.rate_item?.name ?? "—"}</span>
                        <span>{Number(it.actual_qty_total)} {it.rate_item?.unit === "raft" ? "แพ" : it.rate_item?.unit === "meter" ? "เมตร" : ""}</span>
                        {canViewMoney && (
                          <>
                            <span>x</span>
                            <span>{fmtMoney(it.rate_used)} บาท</span>
                            <span>=</span>
                            <span className="font-semibold">{fmtMoney(it.total_amount)}</span>
                          </>
                        )}
                        {(() => {
                          const met = targetStatus(it);
                          if (met === null) return null;
                          return (
                            <span className="ml-2 inline-flex items-baseline gap-1">
                              <StatusBadge met={met} />
                              <span className="text-xs text-gray-600">(เป้า {Number(it.target_qty)})</span>
                            </span>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                  {canViewMoney && (
                    <div className="mt-1 pl-2 text-right">
                      ยอดรวม{g.label}ได้ = <span className="font-bold">{fmtMoney(groupTotal)}</span>
                    </div>
                  )}
                </div>
              );
            });
          })()}

          {/* รายการจ่ายเพิ่ม/ค่าหัก — แยกตามแบบฟอร์มกระดาษ:
              - ยอดบวก (เช่น ค่าผูกหู) = รายได้เพิ่ม เขียนเป็นบรรทัดคำนวณต่อจากรายการผลิต
              - ยอดลบที่เลือกหมวดไว้ = ตารางค่าหักรายคน (ชื่อ / เงินเบิก / ค่าของ / ค่าไฟ / ประกัน / รวม) รวมแถวชื่อซ้ำเป็นแถวเดียว
              - ยอดลบที่ไม่ระบุหมวด (เช่น แผ่นหน้า) = บรรทัดคำนวณใต้ตาราง
              ในตารางแสดงเป็นยอดบวกเหมือนกระดาษ (DB เก็บเป็นยอดลบเพื่อให้ total_amount หักถูก) */}
          {canViewMoney && (() => {
            const extras = wo.extra_items ?? [];
            const incomeExtras = extras.filter((ex) => Number(ex.amount) >= 0);
            const deductions = extras.filter((ex) => Number(ex.amount) < 0);
            const typedDeductions = deductions.filter((ex) => ex.deduction_type);
            const otherDeductions = deductions.filter((ex) => !ex.deduction_type);

            const types = ["advance", "goods", "electric", "insurance"] as const;
            const byName: Array<{ name: string; sums: Record<string, number>; total: number }> = [];
            typedDeductions.forEach((ex) => {
              const name = ex.name.trim();
              let row = byName.find((r) => r.name === name);
              if (!row) {
                row = { name, sums: {}, total: 0 };
                byName.push(row);
              }
              const amt = Math.abs(Number(ex.amount));
              row.sums[ex.deduction_type!] = (row.sums[ex.deduction_type!] ?? 0) + amt;
              row.total += amt;
            });
            const colTotal = (t: string) => byName.reduce((s, r) => s + (r.sums[t] ?? 0), 0);

            const itemsTotal = wo.items.reduce((s, it) => s + Number(it.total_amount || 0), 0);
            const incomeTotal = itemsTotal + incomeExtras.reduce((s, ex) => s + Number(ex.amount || 0), 0);
            const deductionTotal = deductions.reduce((s, ex) => s + Math.abs(Number(ex.amount || 0)), 0);
            const calcLine = (ex: (typeof extras)[number]) => (
              <div key={ex.id} className="flex items-baseline gap-2">
                <span className="min-w-[220px]">{ex.name}</span>
                <span>{Number(ex.qty)} {ex.unit ?? ""}</span>
                <span>x</span>
                <span>{fmtMoney(Math.abs(Number(ex.rate)))} บาท</span>
                <span>=</span>
                <span className="font-semibold">{fmtMoney(Math.abs(Number(ex.amount)))}</span>
                {ex.note && <span className="text-gray-500 text-xs">({ex.note})</span>}
              </div>
            );

            return (
              <>
                {incomeExtras.length > 0 && (
                  <div className="mb-4">
                    <div className="font-semibold underline mb-1">รายการจ่ายเพิ่ม</div>
                    <div className="space-y-0.5 pl-2">{incomeExtras.map(calcLine)}</div>
                  </div>
                )}

                <div className="mb-4 pl-2 text-right">
                  ได้ยอดรวมเป็นเงิน = <span className="font-bold">{fmtMoney(incomeTotal)}</span>
                </div>

                {deductions.length > 0 && (
                  <>
                    <div className="font-semibold mb-1">ค่าหัก</div>
                    {byName.length > 0 && (
                      <table className="w-full border border-gray-700 mb-2">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-700 px-2 py-1 text-left w-40">ชื่อ</th>
                            <th className="border border-gray-700 px-2 py-1 w-20">เงินเบิก</th>
                            <th className="border border-gray-700 px-2 py-1 w-20">ค่าของ</th>
                            <th className="border border-gray-700 px-2 py-1 w-20">ค่าไฟ</th>
                            <th className="border border-gray-700 px-2 py-1 w-20">ประกัน</th>
                            <th className="border border-gray-700 px-2 py-1 w-24">รวมค่าหัก</th>
                          </tr>
                        </thead>
                        <tbody>
                          {byName.map((r) => (
                            <tr key={r.name}>
                              <td className="border border-gray-700 px-2 py-1">{r.name}</td>
                              {types.map((t) => (
                                <td key={t} className="border border-gray-700 px-2 py-1 text-right">
                                  {r.sums[t] ? fmtMoney(r.sums[t]) : "-"}
                                </td>
                              ))}
                              <td className="border border-gray-700 px-2 py-1 text-right font-semibold">{fmtMoney(r.total)}</td>
                            </tr>
                          ))}
                          {byName.length > 1 && (
                            <tr className="bg-gray-50 font-semibold">
                              <td className="border border-gray-700 px-2 py-1">รวม</td>
                              {types.map((t) => (
                                <td key={t} className="border border-gray-700 px-2 py-1 text-right">
                                  {colTotal(t) ? fmtMoney(colTotal(t)) : "-"}
                                </td>
                              ))}
                              <td className="border border-gray-700 px-2 py-1 text-right">
                                {fmtMoney(byName.reduce((s, r) => s + r.total, 0))}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                    {otherDeductions.length > 0 && (
                      <div className="space-y-0.5 pl-2 mb-2">{otherDeductions.map(calcLine)}</div>
                    )}
                  </>
                )}

                {/* ยอดรวมเป็นเงิน - ค่าหัก = ยอดสุทธิ (ตามรูปแบบใบสรุปยอดกระดาษ) */}
                <div className="flex justify-end mb-6">
                  <div className="w-80 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>ยอดรวมเป็นเงิน</span>
                      <span className="font-semibold">{fmtMoney(incomeTotal)}</span>
                    </div>
                    {deductions.length > 0 && (
                      <div className="flex justify-between">
                        <span>หัก: ยอดรวมค่าหัก</span>
                        <span className="font-semibold text-red-600">{fmtMoney(deductionTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t-2 border-gray-700 pt-1 mt-1">
                      <span className="font-semibold">ยอดสุทธิ (จ่ายจริง)</span>
                      <span className="font-bold text-lg">{fmtMoney(wo.total_amount)} บาท</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* ลายเซ็น */}
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="border-t border-gray-700 pt-1">ผู้จ่ายงาน</div>
              <div className="text-xs text-gray-600 mt-1">วันที่ ........./........./.........</div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-700 pt-1">หัวหน้าทีม</div>
              <div className="text-xs text-gray-600 mt-1">({leaderName})</div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-700 pt-1">ผู้ตรวจสอบ</div>
              <div className="text-xs text-gray-600 mt-1">วันที่ ........./........./.........</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

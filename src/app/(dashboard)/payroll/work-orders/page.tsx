"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { apiFetch } from "@/lib/api";
import { fmtMoney, fmtDate } from "@/lib/payroll";
import { categoryLabel } from "@/lib/productionRates";
import { Plus, Loader2, Search, FileText, Link2 } from "lucide-react";

type RateItemBrief = { id: number; code: string; name: string; unit: "raft" | "meter"; work_type: string; category?: string | null };
type EmployeeBrief = { id: number; employee_code: string; first_name: string; last_name: string; nickname?: string | null };

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
  batch_code?: string | null;
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

// กลุ่มสินค้า — จัดกลุ่มจาก category ของเรทค่าจ้าง (แพหน้า/แพหลัง = แผ่นพื้น ฯลฯ)
const PRODUCT_GROUPS: Array<{ label: string; categories: string[] }> = [
  { label: "แผ่นพื้น", categories: ["pae_front", "pae_back"] },
  { label: "เสาไอ", categories: ["i15", "i18"] },
  { label: "เสาเข็มอัดแรง", categories: ["prestress"] },
  { label: "เสาเข็ม", categories: ["pile"] },
  { label: "เสารั้ว", categories: ["fence"] },
];
const productGroupOf = (cat: string | null | undefined) => {
  const idx = PRODUCT_GROUPS.findIndex((g) => cat && g.categories.includes(cat));
  return idx >= 0 ? { order: idx, label: PRODUCT_GROUPS[idx].label } : { order: PRODUCT_GROUPS.length, label: "อื่นๆ" };
};

const WORK_TYPE_LABEL: Record<string, string> = { lift: "ยก", cast: "เท", cast_lift: "เท + ยก", flat: "เหมา" };
const WORK_TYPE_ORDER = ["lift", "cast", "cast_lift", "flat"];
const UNIT_LABEL: Record<string, string> = { raft: "แพ", meter: "เมตร" };

type Line = { wo: WorkOrder; item: ItemRow };
type TypeRow = { key: string; workType: string; unit: string; actual: number; target: number; amount: number; lines: Line[] };
type CategoryBlock = { category: string | null; rows: TypeRow[] };
type GroupBlock = { label: string; order: number; categories: CategoryBlock[] };
type DateBlock = { key: string; start: string; end: string; groups: GroupBlock[] };

const CATEGORY_ORDER = PRODUCT_GROUPS.flatMap((x) => x.categories);
const catIndex = (cat: string | null) => {
  const i = cat ? CATEGORY_ORDER.indexOf(cat) : -1;
  return i < 0 ? 999 : i;
};
const wtIndex = (wt: string) => {
  const i = WORK_TYPE_ORDER.indexOf(wt);
  return i < 0 ? 999 : i;
};

// ลอตผลิต — ใบงานที่เชื่อมกัน (batch_code เดียวกัน) ต้องแสดงคู่กันเสมอ
// เรียงใหม่ให้สมาชิกลอตเดียวกันอยู่ติดกัน (ตามตำแหน่งของใบแรกที่เจอ)
function sortByBatch(orders: WorkOrder[]): WorkOrder[] {
  const out: WorkOrder[] = [];
  const done = new Set<string>();
  for (const wo of orders) {
    if (!wo.batch_code) { out.push(wo); continue; }
    if (done.has(wo.batch_code)) continue;
    done.add(wo.batch_code);
    out.push(...orders.filter((x) => x.batch_code === wo.batch_code).sort((a, b) => a.code.localeCompare(b.code)));
  }
  return out;
}

// ช่วงวันที่รวมของทั้งลอต (เริ่มเร็วสุด – จบช้าสุด) — ใช้จัดสมาชิกลอตให้อยู่ช่วงวันที่เดียวกัน
function batchRanges(orders: WorkOrder[]): Map<string, { start: string; end: string }> {
  const m = new Map<string, { start: string; end: string }>();
  for (const wo of orders) {
    if (!wo.batch_code) continue;
    const s = wo.start_date.slice(0, 10);
    const e = wo.end_date.slice(0, 10);
    const r = m.get(wo.batch_code);
    if (!r) m.set(wo.batch_code, { start: s, end: e });
    else { if (s < r.start) r.start = s; if (e > r.end) r.end = e; }
  }
  return m;
}

function BatchBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center gap-1 ml-2 px-1.5 border border-gray-300 rounded text-[11px] text-gray-600 bg-white whitespace-nowrap" title="ลอตผลิต — ใบงานชุดเดียวกัน แบ่งทำหลายทีม">
      <Link2 className="w-3 h-3" />{code}
    </span>
  );
}

function buildDateBlocks(orders: WorkOrder[]): DateBlock[] {
  const dates = new Map<string, DateBlock>();
  const ranges = batchRanges(orders);
  for (const wo of orders) {
    const br = wo.batch_code ? ranges.get(wo.batch_code) : undefined;
    const start = br?.start ?? wo.start_date.slice(0, 10);
    const end = br?.end ?? wo.end_date.slice(0, 10);
    // จัดกลุ่มตาม "วันสิ้นสุด" (วันตัดรอบเดียวกัน = รอบจ่ายเดียวกัน) — ใบที่เริ่มต่างกันวันสองวันจะได้รวมเป็นก้อนเดียว
    // วันเริ่มของก้อน = วันเริ่มเร็วสุดในก้อน
    const dKey = end;
    let d = dates.get(dKey);
    if (!d) { d = { key: dKey, start, end, groups: [] }; dates.set(dKey, d); }
    else if (start < d.start) d.start = start;

    for (const item of wo.items ?? []) {
      const cat = item.rate_item?.category ?? null;
      const pg = productGroupOf(cat);
      let g = d.groups.find((x) => x.label === pg.label);
      if (!g) { g = { label: pg.label, order: pg.order, categories: [] }; d.groups.push(g); }
      let c = g.categories.find((x) => x.category === cat);
      if (!c) { c = { category: cat, rows: [] }; g.categories.push(c); }
      const workType = item.rate_item?.work_type ?? "";
      const unit = item.rate_item?.unit ?? "";
      const rKey = `${dKey}|${cat}|${workType}|${unit}`;
      let r = c.rows.find((x) => x.key === rKey);
      if (!r) { r = { key: rKey, workType, unit, actual: 0, target: 0, amount: 0, lines: [] }; c.rows.push(r); }
      r.actual += Number(item.actual_qty_total || 0);
      r.target += Number(item.target_qty || 0);
      r.amount += Number(item.total_amount || 0);
      r.lines.push({ wo, item });
    }
  }
  const result = [...dates.values()].filter((d) => d.groups.length > 0);
  result.sort((a, b) => b.end.localeCompare(a.end));
  for (const d of result) {
    d.groups.sort((a, b) => a.order - b.order);
    for (const g of d.groups) {
      g.categories.sort((a, b) => catIndex(a.category) - catIndex(b.category));
      for (const c of g.categories) c.rows.sort((a, b) => wtIndex(a.workType) - wtIndex(b.workType));
    }
  }
  return result;
}

const fmtQty = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

const leaderLabel = (e?: EmployeeBrief | null) =>
  e ? `${e.first_name} ${e.last_name}${e.nickname ? ` (${e.nickname})` : ""}` : "—";

// ช่วงวันที่ด่วน — สัปดาห์เริ่มวันจันทร์
type Preset = "week" | "month" | "all" | "custom";
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  if (p === "week") {
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    return { from: isoDate(mon), to: isoDate(sun) };
  }
  if (p === "month") {
    return {
      from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  return { from: "", to: "" };
}
const PRESET_LABEL: Array<{ value: Preset; label: string }> = [
  { value: "week", label: "สัปดาห์นี้" },
  { value: "month", label: "เดือนนี้" },
  { value: "all", label: "ทั้งหมด" },
];

export default function WorkOrdersPage() {
  const initialRange = presetRange("week");
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"group" | "order">("group");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<Preset>("week");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [status, setStatus] = useState("");
  const [periodType, setPeriodType] = useState("");

  async function load(range: { from: string; to: string } = { from, to }) {
    setLoading(true);
    try {
      // with_batch → ใบงานที่เชื่อมลอตผลิตเดียวกันจะถูกดึงมาด้วยเสมอ
      const params = new URLSearchParams({ per_page: "100", with_batch: "1" });
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      if (status) params.set("status", status);
      if (periodType) params.set("period_type", periodType);
      const res = await apiFetch<{ data: { data: WorkOrder[] } }>(`/payroll/work-orders?${params}`);
      setItems(res.data?.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function applyPreset(p: Preset) {
    const r = presetRange(p);
    setPreset(p);
    setFrom(r.from);
    setTo(r.to);
    load(r);
  }

  const totalAmount = useMemo(
    () => items.reduce((a, b) => a + Number(b.total_amount || 0), 0),
    [items]
  );
  const orderedItems = useMemo(() => sortByBatch(items), [items]);
  const dateBlocks = useMemo(() => buildDateBlocks(orderedItems), [orderedItems]);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  // จำนวนแถวที่ใช้จริง (รวมแถวรายละเอียดที่กางออก) — ใช้คำนวณ rowSpan
  const rowCount = (r: TypeRow) => 1 + (expanded.has(r.key) ? r.lines.length : 0);
  const catCount = (c: CategoryBlock) => c.rows.reduce((s, r) => s + rowCount(r), 0);
  const groupCount = (g: GroupBlock) => g.categories.reduce((s, c) => s + catCount(c), 0);
  const dateCount = (d: DateBlock) => d.groups.reduce((s, g) => s + groupCount(g), 0);
  const groupAmount = (g: GroupBlock) =>
    g.categories.reduce((s, c) => s + c.rows.reduce((s2, r) => s2 + r.amount, 0), 0);

  return (
    <>
      <Topbar title="ใบจ่ายงานการผลิต" />
      <div className="p-6 space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm h-[38px]">
              {PRESET_LABEL.map((p, i) => (
                <button key={p.value} onClick={() => applyPreset(p.value)}
                  className={`px-3 ${i > 0 ? "border-l border-border" : ""} ${preset === p.value ? "bg-primary-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <Field label="ตั้งแต่"><input type="date" className="payroll-input" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }} /></Field>
            <Field label="ถึง"><input type="date" className="payroll-input" value={to} onChange={(e) => { setTo(e.target.value); setPreset("custom"); }} /></Field>
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
            <button onClick={() => load()} className="px-4 py-2 rounded-lg border border-border bg-white text-sm inline-flex items-center gap-1 h-[38px]">
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
          <div className="ml-auto inline-flex rounded-lg border border-border overflow-hidden text-xs">
            <button onClick={() => setView("group")}
              className={`px-3 py-1 ${view === "group" ? "bg-primary-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
              ตามกลุ่มสินค้า
            </button>
            <button onClick={() => setView("order")}
              className={`px-3 py-1 border-l border-border ${view === "order" ? "bg-primary-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
              ตามใบงาน
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">ยังไม่มีรายการ</div>
        ) : view === "group" ? (
          <div className="bg-white border border-gray-300 overflow-x-auto">
            <table className="w-full text-[15px] tabular-nums border-collapse [&_td]:border [&_td]:border-gray-300 [&_th]:border [&_th]:border-gray-300">
              <thead className="bg-gray-100 text-gray-700">
                <tr className="text-sm">
                  <th className="px-2 py-1.5 font-semibold text-center w-36">วันที่</th>
                  <th className="px-2 py-1.5 font-semibold text-center w-36">กลุ่มสินค้า</th>
                  <th className="px-2 py-1.5 font-semibold text-center w-28">แพ</th>
                  <th className="px-2 py-1.5 font-semibold text-left">ยก/เท</th>
                  <th className="px-2 py-1.5 font-semibold text-right w-28">ผลิตจริง</th>
                  <th className="px-2 py-1.5 font-semibold text-right w-28">เป้า</th>
                  <th className="px-2 py-1.5 font-semibold text-center w-16">หน่วย</th>
                  <th className="px-2 py-1.5 font-semibold text-right w-36">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody>
                {dateBlocks.map((d) => {
                  return (
                    <Fragment key={d.key}>
                      {d.groups.map((g, gi) =>
                        g.categories.map((c, ci) =>
                          c.rows.map((r, ri) => {
                            const firstOfCat = ri === 0;
                            const firstOfGroup = firstOfCat && ci === 0;
                            const firstOfDate = firstOfGroup && gi === 0;
                            const open = expanded.has(r.key);
                            const unit = UNIT_LABEL[r.unit] ?? "";
                            const catText = categoryLabel(c.category);
                            return (
                              <Fragment key={r.key}>
                                <tr className="hover:bg-gray-50">
                                  {firstOfDate && (
                                    <td rowSpan={dateCount(d)} className="px-2 py-1.5 align-middle text-center whitespace-nowrap">
                                      {fmtDate(d.start)}
                                      {d.end !== d.start && <div className="text-gray-500 text-sm">ถึง {fmtDate(d.end)}</div>}
                                    </td>
                                  )}
                                  {firstOfGroup && (
                                    <td rowSpan={groupCount(g)} className="px-2 py-1.5 align-middle text-center font-semibold">{g.label}</td>
                                  )}
                                  {firstOfCat && (
                                    <td rowSpan={catCount(c)} className="px-2 py-1.5 align-middle text-center">{catText === g.label ? "" : catText}</td>
                                  )}
                                  <td className="p-0">
                                    <button onClick={() => toggle(r.key)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left">
                                      <span className="inline-flex items-center justify-center w-4 h-4 border border-gray-400 text-[11px] leading-none text-gray-600 bg-white">
                                        {open ? "−" : "+"}
                                      </span>
                                      {WORK_TYPE_LABEL[r.workType] ?? (r.workType || "—")}
                                    </button>
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-medium">{fmtQty(r.actual)}</td>
                                  <td className="px-2 py-1.5 text-right text-gray-600">{fmtQty(r.target)}</td>
                                  <td className="px-2 py-1.5 text-center text-gray-600">{unit}</td>
                                  <td className="px-2 py-1.5 text-right">{fmtMoney(r.amount)}</td>
                                </tr>
                                {open && r.lines.map(({ wo, item }) => (
                                  <tr key={`${r.key}|${item.id}`} className="bg-gray-50 text-sm text-gray-600">
                                    <td className="pl-8 pr-2 py-1">
                                      <Link href={`/payroll/work-orders/${wo.id}`} className="font-mono text-primary-600 hover:underline">{wo.code}</Link>
                                      <span className="ml-2">{leaderLabel(wo.team_leader)}</span>
                                      {wo.batch_code && <BatchBadge code={wo.batch_code} />}
                                      {(wo.start_date.slice(0, 10) !== d.start || wo.end_date.slice(0, 10) !== d.end) && (
                                        <span className="ml-2 text-xs text-gray-500">({fmtDate(wo.start_date)} – {fmtDate(wo.end_date)})</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1 text-right">{fmtQty(Number(item.actual_qty_total))}</td>
                                    <td className="px-2 py-1 text-right">{fmtQty(Number(item.target_qty))}</td>
                                    <td className="px-2 py-1 text-center">{unit}</td>
                                    <td className="px-2 py-1 text-right">{fmtMoney(item.total_amount)}</td>
                                  </tr>
                                ))}
                              </Fragment>
                            );
                          })
                        )
                      )}
                    </Fragment>
                  );
                })}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={7} className="px-2 py-2 text-right">รวมทั้งหมด</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(dateBlocks.reduce((s, d) => s + d.groups.reduce((s2, g) => s2 + groupAmount(g), 0), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
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
                {orderedItems.map((a, ai) => {
                  const prevSame = !!a.batch_code && orderedItems[ai - 1]?.batch_code === a.batch_code;
                  return (
                  <tr key={a.id} className={`border-border last:border-0 hover:bg-gray-50/50 ${prevSame ? "" : "border-t"} ${a.batch_code ? "bg-gray-50/40" : ""}`}>
                    <td className={`px-3 py-3 text-xs font-mono whitespace-nowrap ${a.batch_code ? "border-l-4 border-l-gray-400" : ""}`}>
                      <FileText className="w-3.5 h-3.5 inline mr-1 text-primary-500" />{a.code}
                      {a.batch_code && <div className="mt-1 -ml-2"><BatchBadge code={a.batch_code} /></div>}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div>{fmtDate(a.start_date)} → {fmtDate(a.end_date)}</div>
                      <div className="text-muted">{PERIOD_LABEL[a.period_type]}</div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap font-medium">
                      {leaderLabel(a.team_leader)}
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
                  );
                })}
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

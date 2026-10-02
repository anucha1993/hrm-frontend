"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import EmployeeCombobox from "@/components/EmployeeCombobox";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtMoney } from "@/lib/payroll";
import { useAuth } from "@/lib/auth-context";
import { categoryLabel } from "@/lib/productionRates";
import {
  Plus, Trash2, Loader2, AlertCircle, ArrowLeft, Save, Users, Crown,
  Pencil, RotateCcw, CalendarRange, Coins, CheckCircle2, Printer, ChevronDown, Search, ChevronLeft,
} from "lucide-react";

type RateItem = {
  id: number;
  code: string;
  name: string;
  category: string | null;
  unit: "raft" | "meter";
  work_type: "cast" | "lift" | "cast_lift" | "flat";
  target_qty: string | null;
  rate_at_target: string;
  rate_below_target: string | null;
};

type EmployeeBrief = {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  nickname?: string | null;
};

export type ItemRow = {
  id?: number;
  production_rate_item_id: number | "";
  target_qty: string;
  rate_at_target_override: string;
  rate_below_target_override: string;
  actual_qty_total?: string; // จาก server (read-only display)
  rate_used?: string;
  total_amount?: string;
};

export type MemberRow = {
  employee_id: number | "";
  role: string;
  note: string;
};

export type ExtraRow = {
  id?: number;
  name: string;
  unit: string;
  qty: string;
  rate: string;
  deduction_type?: string;
  note: string;
};

export type LinkedWorkOrderBrief = {
  id: number;
  code: string;
  status: string;
  total_amount: string;
  team_leader_id: number;
  team_leader_code: string | null;
  team_leader_name: string | null;
};

export type WorkOrderFormInit = {
  id?: number;
  code?: string;
  start_date: string;
  end_date: string;
  period_type: "daily" | "biweekly_1" | "biweekly_2" | "monthly" | "custom";
  team_leader_id: number | "";
  location_name: string;
  note: string;
  batch_code?: string;
  status?: "draft" | "in_progress" | "completed" | "paid";
  total_amount?: string;
  items: ItemRow[];
  members: MemberRow[];
  extras?: ExtraRow[];
};

const UNIT_LABEL = { raft: "แพ", meter: "เมตร" } as const;
const WORK_TYPE_LABEL = { cast: "งานเท", lift: "งานยก", cast_lift: "เท+ยก", flat: "เหมา" } as const;
// คอลัมน์ค่าหักตามแบบฟอร์มกระดาษ — กรอกเป็นตารางรายคน แล้วตอนบันทึกแตกเป็น extra item ละ 1 ช่อง
// (qty 1 × rate ติดลบ + deduction_type) เพื่อให้ backend/total_amount/ใบพิมพ์ใช้โครงเดิมได้เลย
const DEDUCTION_COLUMNS = [
  { key: "advance", label: "เงินเบิก" },
  { key: "goods", label: "ค่าของ" },
  { key: "electric", label: "ค่าไฟ" },
  { key: "insurance", label: "ประกัน" },
] as const;
type DeductionKey = (typeof DEDUCTION_COLUMNS)[number]["key"];
type DeductionRow = { name: string } & Record<DeductionKey, string>;

const blankDeductionRow = (): DeductionRow => ({ name: "", advance: "", goods: "", electric: "", insurance: "" });

// รวม extra ที่มี deduction_type เป็นแถวรายชื่อ (ชื่อซ้ำ/หมวดซ้ำ = บวกรวมกัน)
// ใช้ qty × rate แทน amount เพราะ amount ถูก mask สำหรับคนไม่มีสิทธิ์ดูเงิน
function groupDeductions(extras: ExtraRow[]): DeductionRow[] {
  const rows: DeductionRow[] = [];
  extras.filter((e) => e.deduction_type).forEach((e) => {
    const name = e.name.trim();
    let row = rows.find((r) => r.name === name);
    if (!row) { row = { ...blankDeductionRow(), name }; rows.push(row); }
    const key = e.deduction_type as DeductionKey;
    const amt = Math.abs(Number(e.qty || 0) * Number(e.rate || 0));
    row[key] = String(Number(row[key] || 0) + amt);
  });
  return rows;
}

// ใช้วันที่ตามเวลาเครื่อง (ไทย) — toISOString() เป็น UTC ทำให้วันเพี้ยนไป 1 วัน (เช่น 6 กลายเป็น 5)
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => ymd(new Date());

export const blankForm: WorkOrderFormInit = {
  start_date: today(),
  end_date: today(),
  period_type: "custom",
  team_leader_id: "",
  location_name: "",
  note: "",
  batch_code: "",
  items: [],
  members: [],
  extras: [],
};

// คำนวณช่วงวันที่ตาม period_type (อ้างอิงวันปัจจุบัน)
function calcPeriodDates(type: WorkOrderFormInit["period_type"]): { start: string; end: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (type) {
    case "daily":
      return { start: ymd(now), end: ymd(now) };
    case "biweekly_1": {
      // 6–20 เดือนนี้ (ถ้ายังไม่ถึงวันที่ 6 → ใช้เดือนก่อน)
      const ref = d >= 6 ? new Date(y, m, 6) : new Date(y, m - 1, 6);
      const end = new Date(ref.getFullYear(), ref.getMonth(), 20);
      return { start: ymd(ref), end: ymd(end) };
    }
    case "biweekly_2": {
      // 21 เดือนก่อน – 5 เดือนนี้ (ถ้าวันที่ <= 5 → ใช้ช่วงนี้, ถ้า >= 21 → ใช้เดือนนี้-เดือนหน้า, อื่นๆ → ใช้เดือนก่อน-เดือนนี้)
      let startRef: Date;
      let endRef: Date;
      if (d <= 5) {
        startRef = new Date(y, m - 1, 21);
        endRef = new Date(y, m, 5);
      } else if (d >= 21) {
        startRef = new Date(y, m, 21);
        endRef = new Date(y, m + 1, 5);
      } else {
        startRef = new Date(y, m - 1, 21);
        endRef = new Date(y, m, 5);
      }
      return { start: ymd(startRef), end: ymd(endRef) };
    }
    case "monthly": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { start: ymd(start), end: ymd(end) };
    }
    default:
      return null;
  }
}

export default function WorkOrderForm({
  initial,
  isEdit = false,
  linkedWorkOrders,
  batchTotalAmount,
  onBatchChanged,
  onPrintSummary,
}: {
  initial: WorkOrderFormInit;
  isEdit?: boolean;
  linkedWorkOrders?: LinkedWorkOrderBrief[];
  batchTotalAmount?: number;
  onBatchChanged?: () => void;
  onPrintSummary?: () => void;
}) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canViewMoney = hasPermission(["payroll.view", "payroll.config"]);
  // ไม่มีสิทธิ์ลงงานย้อนหลัง → ใบงานใหม่เลือกวันที่ได้ตั้งแต่วันนี้ (backend เช็คซ้ำอีกชั้น)
  const minDate = !isEdit && !hasPermission("production.backdate") ? today() : undefined;
  const [form, setForm] = useState<WorkOrderFormInit>({
    ...initial,
    extras: (initial.extras ?? []).filter((e) => !e.deduction_type),
  });
  const [deductions, setDeductions] = useState<DeductionRow[]>(() => groupDeductions(initial.extras ?? []));
  const [rateItems, setRateItems] = useState<RateItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeBrief[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingRates, setEditingRates] = useState<Set<number>>(new Set());
  const [splitNumerator, setSplitNumerator] = useState("");
  const [splitDenominator, setSplitDenominator] = useState("");
  const readOnly = form.status === "paid";

  // ---------- ลอตผลิต (เชื่อม/ยกเลิกเชื่อมใบงานอื่นที่เป็นชุดผลิตเดียวกัน) ----------
  const [batchQuery, setBatchQuery] = useState("");
  const [batchResults, setBatchResults] = useState<Array<{ id: number; code: string; team_leader?: EmployeeBrief | null; total_amount: string }>>([]);
  const [batchSearching, setBatchSearching] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchErr, setBatchErr] = useState<string | null>(null);

  async function searchBatchCandidates() {
    if (!batchQuery.trim()) { setBatchResults([]); return; }
    setBatchSearching(true);
    setBatchErr(null);
    try {
      const res = await apiFetch<{ data: { data: Array<{ id: number; code: string; team_leader?: EmployeeBrief | null; total_amount: string }> } }>(
        `/payroll/work-orders?code=${encodeURIComponent(batchQuery.trim())}&per_page=10`
      );
      const excludeIds = new Set([form.id, ...(linkedWorkOrders ?? []).map((s) => s.id)]);
      setBatchResults(res.data.data.filter((w) => !excludeIds.has(w.id)));
    } catch (e) {
      setBatchErr(e instanceof Error ? e.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setBatchSearching(false);
    }
  }

  async function linkBatchTo(targetId: number) {
    if (!form.id) return;
    setBatchBusy(true);
    setBatchErr(null);
    try {
      await apiFetch(`/payroll/work-orders/${form.id}/link-batch`, {
        method: "POST", body: { target_work_order_id: targetId },
      });
      setBatchQuery("");
      setBatchResults([]);
      onBatchChanged?.();
    } catch (e) {
      const msg = e instanceof ApiError ? ((e.data as { message?: string } | null)?.message ?? e.message) : "เชื่อมใบงานไม่สำเร็จ";
      setBatchErr(msg);
    } finally {
      setBatchBusy(false);
    }
  }

  async function unlinkBatch(targetId: number) {
    if (!confirm("ยกเลิกการเชื่อมลอตผลิตของใบงานนี้?")) return;
    setBatchBusy(true);
    setBatchErr(null);
    try {
      await apiFetch(`/payroll/work-orders/${targetId}/unlink-batch`, { method: "POST" });
      onBatchChanged?.();
    } catch (e) {
      setBatchErr(e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ");
    } finally {
      setBatchBusy(false);
    }
  }

  function toggleEditRate(idx: number) {
    setEditingRates((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }
  function resetRateOverride(idx: number) {
    updateItem(idx, { rate_at_target_override: "", rate_below_target_override: "" });
    setEditingRates((s) => {
      const next = new Set(s);
      next.delete(idx);
      return next;
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const [rates, emps] = await Promise.all([
          apiFetch<{ data: RateItem[] }>("/payroll/production-rates?only_active=1"),
          apiFetch<{ data: { data: EmployeeBrief[] } }>("/employees?per_page=500"),
        ]);
        setRateItems(rates.data);
        setEmployees(emps.data.data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    })();
  }, []);

  // เปิดโหมดแก้ไขเรท auto ถ้ามี override อยู่
  useEffect(() => {
    const idxs = new Set<number>();
    form.items.forEach((it, i) => {
      if (it.rate_at_target_override !== "" || it.rate_below_target_override !== "") idxs.add(i);
    });
    if (idxs.size > 0) setEditingRates((prev) => new Set([...prev, ...idxs]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // ถ้าหมายเหตุมีรูปแบบ "สัดส่วนทีม X/Y คน" (จากการกดคำนวณครั้งก่อน) ให้ดึงมาเติมช่องกรอกใหม่
  // เพื่อให้เห็นค่าที่เคยตั้งไว้ตอนเปิดใบงานเดิม ไม่ใช่ต้องกรอกใหม่ทุกครั้ง
  useEffect(() => {
    const m = (initial.note || "").match(/สัดส่วนทีม\s*(\d+)\s*\/\s*(\d+)\s*คน/);
    if (m) {
      setSplitNumerator(m[1]);
      setSplitDenominator(m[2]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function findRate(id: number | "") {
    return rateItems.find((r) => r.id === id) ?? null;
  }

  // preview สำหรับงานสร้างใหม่ (ยังไม่มี actual_qty_total)
  function computeItemPreview(item: ItemRow) {
    const rate = findRate(item.production_rate_item_id);
    if (!rate) return { highRate: 0, lowRate: 0, actual: 0, rateUsed: 0, total: 0 };
    const baseHigh = Number(rate.rate_at_target);
    const baseLow = rate.rate_below_target ? Number(rate.rate_below_target) : baseHigh;
    const high = item.rate_at_target_override !== "" ? Number(item.rate_at_target_override) : baseHigh;
    const low = item.rate_below_target_override !== "" ? Number(item.rate_below_target_override) : baseLow;
    const actual = Number(item.actual_qty_total ?? 0);
    const target = Number(item.target_qty || 0);
    let rateUsed: number;
    if (rate.work_type === "flat" || target <= 0) rateUsed = high;
    else rateUsed = actual >= target ? high : low;
    return { highRate: high, lowRate: low, actual, rateUsed, total: actual * rateUsed };
  }

  const grandTotal = useMemo(
    () => form.items.reduce((a, it) => a + computeItemPreview(it).total, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.items, rateItems]
  );

  function applyPeriodType(type: WorkOrderFormInit["period_type"]) {
    const dates = calcPeriodDates(type);
    // ไม่มีสิทธิ์ลงย้อนหลัง → รอบที่เริ่มไปแล้วให้เริ่มที่วันนี้แทน
    if (dates && minDate && dates.start < minDate) dates.start = minDate;
    setForm((f) => ({
      ...f,
      period_type: type,
      ...(dates ? { start_date: dates.start, end_date: dates.end } : {}),
    }));
  }

  // ---------- items ----------
  function addItem() {
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        production_rate_item_id: "",
        target_qty: "0",
        rate_at_target_override: "",
        rate_below_target_override: "",
      }],
    }));
  }
  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }
  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  }
  // เลือกทั้งกลุ่มจาก RateItemPicker: ใส่ตัวแรกในแถวที่เปิด picker อยู่ (ถ้าแถวนั้นยังว่าง) แล้วแทรกที่เหลือเป็นแถวใหม่ต่อท้าย
  function addItemsFromGroup(idx: number, picked: RateItem[]) {
    if (picked.length === 0) return;
    setForm((f) => {
      const items = [...f.items];
      const current = items[idx];
      const makeRow = (rate: RateItem, base?: ItemRow): ItemRow => {
        const shouldFill = rate.work_type !== "flat" && rate.target_qty !== null;
        return {
          rate_at_target_override: "",
          rate_below_target_override: "",
          ...base,
          production_rate_item_id: rate.id,
          target_qty: shouldFill ? String(rate.target_qty) : (base?.target_qty ?? "0"),
        };
      };
      if (!current.production_rate_item_id) {
        items[idx] = makeRow(picked[0], current);
        picked.slice(1).forEach((rate, i) => items.splice(idx + 1 + i, 0, makeRow(rate)));
      } else {
        picked.forEach((rate, i) => items.splice(idx + 1 + i, 0, makeRow(rate)));
      }
      return { ...f, items };
    });
  }

  // เมื่อชุดผลิตเดียวกันถูกแบ่งทำ 2 ทีมขึ้นไป (เช่น ยก/เท บนจำนวนชิ้นเดียวกัน) —
  // คำนวณเรทเฉพาะใบงานนี้ = เรทมาตรฐาน × สัดส่วนคนในทีมนี้ / คนรวมทั้งชุด แล้วใส่เป็น override ให้ทุกรายการ
  function applySplitRatio() {
    const num = Number(splitNumerator);
    const den = Number(splitDenominator);
    if (!num || !den || num <= 0 || den <= 0 || num > den) {
      setErr("กรุณากรอกจำนวนคนทีมนี้ และจำนวนคนรวมทั้งชุดให้ถูกต้อง (คนทีมนี้ต้องไม่เกินคนรวม)");
      return;
    }
    const ratio = num / den;
    setForm((f) => ({
      ...f,
      note: f.note || `แบ่งค่าแรงตามสัดส่วนทีม ${num}/${den} คน (ชุดผลิตเดียวกัน แบ่งทำกับทีมอื่น)`,
      items: f.items.map((it) => {
        const rate = findRate(it.production_rate_item_id);
        if (!rate) return it;
        const baseHigh = Number(rate.rate_at_target);
        const baseLow = rate.rate_below_target ? Number(rate.rate_below_target) : baseHigh;
        return {
          ...it,
          rate_at_target_override: (Math.round(baseHigh * ratio * 100) / 100).toFixed(2),
          rate_below_target_override: (Math.round(baseLow * ratio * 100) / 100).toFixed(2),
        };
      }),
    }));
    setEditingRates((prev) => {
      const next = new Set(prev);
      form.items.forEach((_, i) => next.add(i));
      return next;
    });
    setErr(null);
  }

  // ---------- members ----------
  function addMember() {
    setForm((f) => ({ ...f, members: [...f.members, { employee_id: "", role: "", note: "" }] }));
  }
  function removeMember(idx: number) {
    setForm((f) => ({ ...f, members: f.members.filter((_, i) => i !== idx) }));
  }
  function updateMember(idx: number, patch: Partial<MemberRow>) {
    setForm((f) => ({ ...f, members: f.members.map((m, i) => (i === idx ? { ...m, ...patch } : m)) }));
  }

  // ---------- extras (รายการจ่ายเพิ่มเติม) ----------
  function addExtra() {
    setForm((f) => ({
      ...f,
      extras: [...(f.extras ?? []), { name: "", unit: "", qty: "1", rate: "0", note: "" }],
    }));
  }
  function removeExtra(idx: number) {
    setForm((f) => ({ ...f, extras: (f.extras ?? []).filter((_, i) => i !== idx) }));
  }
  function updateExtra(idx: number, patch: Partial<ExtraRow>) {
    setForm((f) => ({
      ...f,
      extras: (f.extras ?? []).map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    }));
  }
  // ---------- ค่าหัก (ตารางรายคน) ----------
  function addDeduction() {
    setDeductions((d) => [...d, blankDeductionRow()]);
  }
  function removeDeduction(idx: number) {
    setDeductions((d) => d.filter((_, i) => i !== idx));
  }
  function updateDeduction(idx: number, patch: Partial<DeductionRow>) {
    setDeductions((d) => d.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  const deductionRowTotal = (r: DeductionRow) =>
    DEDUCTION_COLUMNS.reduce((s, c) => s + Math.abs(Number(r[c.key] || 0)), 0);
  const deductionsTotal = deductions.reduce((s, r) => s + deductionRowTotal(r), 0);
  // ชื่อหัวหน้า+ลูกทีม ไว้ให้เลือกในช่องชื่อค่าหัก (พิมพ์เองได้)
  const memberNameOptions = Array.from(new Set(
    [form.team_leader_id, ...form.members.map((m) => m.employee_id)]
      .map((id) => employees.find((x) => x.id === id))
      .map((emp) => (emp ? emp.nickname || emp.first_name : ""))
      .filter(Boolean)
  ));

  // รายการจ่าย-หักเพิ่มเติม (ไม่รวมตารางค่าหัก)
  const otherExtrasTotal = useMemo(
    () => (form.extras ?? []).reduce((s, e) => s + Number(e.qty || 0) * Number(e.rate || 0), 0),
    [form.extras]
  );
  const extrasTotal = otherExtrasTotal - deductionsTotal;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (readOnly) return;
    if (!form.team_leader_id) { setErr("กรุณาเลือกหัวหน้าทีม"); return; }
    if (form.items.length === 0) { setErr("กรุณาเพิ่มรายการผลิตอย่างน้อย 1 รายการ"); return; }
    if (form.items.some((it) => !it.production_rate_item_id)) { setErr("กรุณาเลือกรายการผลิตให้ครบทุกแถว"); return; }

    setSaving(true);
    setErr(null);
    setSuccessMsg(null);
    try {
      const payload = {
        start_date: form.start_date,
        end_date: form.end_date,
        period_type: form.period_type,
        team_leader_id: form.team_leader_id,
        location_name: form.location_name || null,
        note: form.note || null,
        status: form.status,
        items: form.items.map((it) => ({
          // ส่ง id เดิมกลับไปด้วย (ถ้ามี) เพื่อให้ backend อัปเดตแถวเดิมแทนลบ-สร้างใหม่
          // ไม่งั้นบันทึกผลรายวันที่ผูกกับ item เดิมจะหายหมดทุกครั้งที่กดบันทึกหน้านี้
          ...(it.id ? { id: it.id } : {}),
          production_rate_item_id: it.production_rate_item_id,
          target_qty: Number(it.target_qty || 0),
          rate_at_target_override: it.rate_at_target_override === "" ? null : Number(it.rate_at_target_override),
          rate_below_target_override: it.rate_below_target_override === "" ? null : Number(it.rate_below_target_override),
        })),
        members: form.members
          .filter((m) => m.employee_id && m.employee_id !== form.team_leader_id)
          .map((m) => ({ employee_id: m.employee_id, role: m.role || null, note: m.note || null })),
        extras: [
          ...(form.extras ?? [])
            .filter((e) => e.name.trim() !== "")
            .map((e) => ({
              name: e.name.trim(),
              unit: e.unit || null,
              qty: Number(e.qty || 0),
              rate: Number(e.rate || 0),
              deduction_type: null,
              note: e.note || null,
            })),
          // ตารางค่าหัก: 1 ช่องที่มียอด = 1 extra item (ยอดลบเสมอ)
          ...deductions
            .filter((r) => r.name.trim() !== "")
            .flatMap((r) => DEDUCTION_COLUMNS
              .filter((c) => Number(r[c.key] || 0) !== 0)
              .map((c) => ({
                name: r.name.trim(),
                unit: null,
                qty: 1,
                rate: -Math.abs(Number(r[c.key])),
                deduction_type: c.key,
                note: null,
              }))),
        ],
      };
      if (isEdit && form.id) {
        await apiFetch(`/payroll/work-orders/${form.id}`, { method: "PUT", body: payload });
        setSuccessMsg("✔ บันทึกสำเร็จ");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      } else {
        const res = await apiFetch<{ data: { id: number } }>("/payroll/work-orders", {
          method: "POST", body: payload,
        });
        setSuccessMsg("✔ สร้างใบงานสำเร็จ — กำลังไปยังหน้ารายละเอียด...");
        setTimeout(() => router.push(`/payroll/work-orders/${res.data.id}`), 700);
      }
    } catch (ex: unknown) {
      let msg = "บันทึกไม่สำเร็จ";
      if (ex instanceof ApiError) {
        const data = ex.data as { message?: string; errors?: Record<string, string[]> } | null;
        const parts: string[] = [];
        if (data?.message) parts.push(data.message);
        if (data?.errors) {
          Object.values(data.errors).forEach((arr) => arr.forEach((m) => parts.push("• " + m)));
        }
        msg = parts.length ? parts.join("\n") : ex.message;
      } else if (ex instanceof Error) {
        msg = ex.message;
      }
      setErr(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form.id || !confirm("ลบใบงานนี้?")) return;
    try {
      await apiFetch(`/payroll/work-orders/${form.id}`, { method: "DELETE" });
      router.push("/payroll/work-orders");
    } catch (e) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title={isEdit ? `แก้ไขใบจ่ายงาน ${form.code ?? ""}` : "สร้างใบจ่ายงาน"} />
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-6xl">
        <div className="flex items-center gap-3">
          <Link href="/payroll/work-orders" className="p-2 rounded-lg hover:bg-white border border-border">
            <ArrowLeft className="w-4 h-4 text-muted" />
          </Link>
          <h3 className="text-lg font-semibold">
            {isEdit ? `ใบงาน ${form.code ?? `#${form.id}`}` : "ใบงานใหม่"}
          </h3>
          {form.status && (
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              สถานะ: {form.status}
            </span>
          )}
        </div>

        {/* ลอตผลิต (เชื่อมกับใบงานอื่นที่เป็นชุดผลิตเดียวกัน) */}
        {isEdit && form.id && (
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold">ลอตผลิต (ชิ้นงานชุดเดียวกัน แบ่งทำหลายทีม)</span>
              </div>
              {(linkedWorkOrders?.length ?? 0) > 0 && (
                <div className="text-right">
                  <div className="text-xs text-muted">ยอดรวมทั้งลอต</div>
                  <div className="text-base font-bold text-amber-700">{fmtMoney(batchTotalAmount ?? 0)}</div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted mb-3">
              เชื่อมกับใบงานอื่นที่เป็นชุดผลิตเดียวกัน (เช่น แบ่งทำ ยก/เท บนชิ้นงานชุดเดียวกัน) เพื่อกันยอดจ่ายซ้ำ — เมื่อเชื่อมแล้วจะเห็นกันทั้งสองฝั่งอัตโนมัติ
            </p>

            {(linkedWorkOrders?.length ?? 0) > 0 && (
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="py-1">ใบงาน</th>
                    <th className="py-1">หัวหน้าทีม</th>
                    <th className="py-1">สถานะ</th>
                    <th className="py-1 text-right">ยอดเงิน</th>
                    <th className="py-1 w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="py-1.5 font-medium">{form.code} (ใบนี้)</td>
                    <td className="py-1.5">
                      {(() => {
                        const leader = employees.find((e) => e.id === form.team_leader_id);
                        return leader ? `${leader.employee_code} - ${leader.first_name} ${leader.last_name}` : "—";
                      })()}
                    </td>
                    <td className="py-1.5">{form.status}</td>
                    <td className="py-1.5 text-right font-semibold">{fmtMoney(form.total_amount ?? 0)}</td>
                    <td className="py-1.5 text-right">
                      {!readOnly && (
                        <button type="button" disabled={batchBusy} onClick={() => unlinkBatch(form.id!)}
                          className="text-red-600 hover:underline text-xs disabled:opacity-40">ยกเลิก</button>
                      )}
                    </td>
                  </tr>
                  {(linkedWorkOrders ?? []).map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/payroll/work-orders/${s.id}`} className="text-primary-600 hover:underline font-medium">{s.code}</Link>
                      </td>
                      <td className="py-1.5">{s.team_leader_code ? `${s.team_leader_code} - ${s.team_leader_name}` : "—"}</td>
                      <td className="py-1.5">{s.status}</td>
                      <td className="py-1.5 text-right font-semibold">{fmtMoney(s.total_amount)}</td>
                      <td className="py-1.5 text-right">
                        {!readOnly && (
                          <button type="button" disabled={batchBusy} onClick={() => unlinkBatch(s.id)}
                            className="text-red-600 hover:underline text-xs disabled:opacity-40">ยกเลิก</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!readOnly && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="text" value={batchQuery} onChange={(e) => setBatchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchBatchCandidates(); } }}
                    placeholder="ค้นหาด้วยเลขที่ใบงาน เช่น WO-2026072803"
                    className="payroll-input w-64" />
                  <button type="button" onClick={searchBatchCandidates} disabled={batchSearching}
                    className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
                    {batchSearching ? "กำลังค้นหา..." : "ค้นหา"}
                  </button>
                  {batchErr && <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{batchErr}</span>}
                </div>

                {batchResults.length > 0 && (
                  <div className="mt-2 border border-border rounded-lg divide-y divide-border">
                    {batchResults.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{r.code}</span>
                          {r.team_leader && <span className="text-muted ml-2 text-xs">{r.team_leader.employee_code} - {r.team_leader.first_name} {r.team_leader.last_name}{r.team_leader.nickname ? ` (${r.team_leader.nickname})` : ""}</span>}
                          <span className="text-muted ml-2 text-xs">{fmtMoney(r.total_amount)}</span>
                        </div>
                        <button type="button" disabled={batchBusy} onClick={() => linkBatchTo(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50">
                          เชื่อมใบงานนี้
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Period quick-pick */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarRange className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-semibold">ช่วงการผลิต</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {(["daily", "biweekly_1", "biweekly_2", "monthly", "custom"] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={readOnly}
                onClick={() => applyPeriodType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  form.period_type === t
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-700 border-border hover:bg-gray-50"
                }`}
              >
                {t === "daily" && "รายวัน"}
                {t === "biweekly_1" && "15 วัน (6–20, จ่าย 26)"}
                {t === "biweekly_2" && "15 วัน (21–5, จ่าย 11)"}
                {t === "monthly" && "รายเดือน"}
                {t === "custom" && "กำหนดเอง"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="วันเริ่มต้น *">
              <input type="date" required disabled={readOnly} className="payroll-input"
                min={minDate}
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value, period_type: "custom" })} />
            </Field>
            <Field label="วันสิ้นสุด *">
              <input type="date" required disabled={readOnly} className="payroll-input"
                min={minDate && form.start_date > minDate ? form.start_date : minDate}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value, period_type: "custom" })} />
              {minDate && (
                <span className="text-xs text-muted mt-1 block">ไม่มีสิทธิ์ลงงานย้อนหลัง — เลือกได้ตั้งแต่วันนี้เป็นต้นไป</span>
              )}
            </Field>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-border p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={<><Crown className="w-3.5 h-3.5 inline mr-1 text-amber-600" />หัวหน้าทีม * (รับค่าจ้าง)</>}>
            <EmployeeCombobox
              employees={employees}
              value={form.team_leader_id ? String(form.team_leader_id) : ""}
              onChange={(id) => setForm({ ...form, team_leader_id: id ? Number(id) : "" })}
              disabled={readOnly}
              placeholder="-- เลือกหัวหน้าทีม --"
              clearLabel="-- เลือกหัวหน้าทีม --"
              className="w-full pl-3 pr-8 py-2 rounded-lg border border-border text-sm bg-white disabled:bg-surface"
            />
          </Field>
          <Field label="สถานที่ทำงาน">
            <input type="text" disabled={readOnly} className="payroll-input"
              value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })}
              placeholder="เช่น โรงงาน 1, แพหน้า" />
          </Field>
          <Field label="สถานะ">
            <select disabled={readOnly} className="payroll-input"
              value={form.status ?? "draft"}
              onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrderFormInit["status"] })}>
              <option value="draft">ร่าง</option>
              <option value="in_progress">กำลังทำ</option>
              <option value="completed">เสร็จแล้ว (พร้อมจ่าย)</option>
            </select>
          </Field>
          <Field label="หมายเหตุ">
            <input type="text" disabled={readOnly} className="payroll-input"
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </div>

        {/* Items (เป้าผลิต) */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h4 className="font-semibold text-sm">รายการผลิต / เป้าหมาย ({form.items.length} รายการ)</h4>
              <p className="text-xs text-muted mt-0.5">ระบุเป้าหมายผลิตทั้งช่วง — ผลผลิตจริงจะกรอกในแท็บ "บันทึกผลรายวัน"</p>
            </div>
            {!readOnly && (
              <button type="button" onClick={addItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs">
                <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
              </button>
            )}
          </div>
          {!readOnly && form.items.length > 0 && (
            <div className="px-4 py-3 border-b border-border bg-amber-50/60">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">ชุดผลิตนี้แบ่งทำกับทีมอื่นไหม? จำนวนคนทีมนี้</label>
                  <input type="number" min="1" step="1" className="payroll-input w-24 text-right"
                    value={splitNumerator} onChange={(e) => setSplitNumerator(e.target.value)} placeholder="เช่น 8" />
                </div>
                <span className="text-muted pb-2">จาก</span>
                <div>
                  <label className="block text-xs text-muted mb-1">จำนวนคนรวมทั้งชุด (ทุกทีม)</label>
                  <input type="number" min="1" step="1" className="payroll-input w-24 text-right"
                    value={splitDenominator} onChange={(e) => setSplitDenominator(e.target.value)} placeholder="เช่น 14" />
                </div>
                <button type="button" onClick={applySplitRatio}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 whitespace-nowrap">
                  คำนวณเรทตามสัดส่วน → ใช้กับทุกรายการ
                </button>
                <span className="text-[11px] text-muted max-w-xs">
                  ใช้เมื่อชิ้นงานชุดเดียวกัน (จำนวนเท่ากัน) ถูกแบ่งทำ 2 ทีม เช่น ยก/เท — ระบบจะคูณเรทมาตรฐานด้วยสัดส่วนคนแล้วใส่เป็นเรทปรับพิเศษ (override) ให้ทุกรายการอัตโนมัติ ป้องกันยอดเบิ้ล
                </span>
              </div>
            </div>
          )}
          {form.items.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">ยังไม่มีรายการผลิต — กด &quot;เพิ่มรายการ&quot;</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">รายการผลิต</th>
                  <th className="px-3 py-2">ประเภท</th>
                  {canViewMoney && (
                    <th className="px-3 py-2 text-right w-64">เรทที่ตั้งไว้ <span className="text-muted normal-case font-normal">(ปรับได้)</span></th>
                  )}
                  <th className="px-3 py-2 text-right w-28">ต้องผลิต (เป้า)</th>
                  {isEdit && <th className="px-3 py-2 text-right w-28">ผลิตจริง</th>}
                  {isEdit && canViewMoney && <th className="px-3 py-2 text-right w-28">เรทที่ใช้</th>}
                  {isEdit && canViewMoney && <th className="px-3 py-2 text-right w-32">ค่าจ้าง</th>}
                  <th className="px-3 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => {
                  const rate = findRate(item.production_rate_item_id);
                  const prev = computeItemPreview(item);
                  const isEditing = editingRates.has(idx);
                  return (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-xs text-muted">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <RateItemPicker
                          rateItems={rateItems}
                          value={item.production_rate_item_id}
                          disabled={readOnly}
                          onPick={(picked) => {
                            // auto-fill target จาก system default ก็ต่อเมื่อ user ยังไม่ได้กรอกเอง (เป็น 0)
                            const currentTgt = Number(item.target_qty || 0);
                            const shouldFill =
                              picked &&
                              picked.work_type !== "flat" &&
                              picked.target_qty !== null &&
                              currentTgt === 0;
                            updateItem(idx, {
                              production_rate_item_id: picked ? picked.id : "",
                              ...(shouldFill ? { target_qty: String(picked!.target_qty) } : {}),
                            });
                          }}
                          onPickAll={(picked) => addItemsFromGroup(idx, picked)}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {rate ? (
                          <>
                            <div className="font-medium">{WORK_TYPE_LABEL[rate.work_type]}</div>
                            <div className="text-muted">{UNIT_LABEL[rate.unit]}</div>
                          </>
                        ) : "—"}
                      </td>
                      {canViewMoney && (
                      <td className="px-3 py-2 text-right text-xs">
                        {!rate ? "—" : (() => {
                          const defaultHigh = Number(rate.rate_at_target);
                          const defaultLow = rate.rate_below_target ? Number(rate.rate_below_target) : null;
                          const hasOverride =
                            item.rate_at_target_override !== "" || item.rate_below_target_override !== "";
                          const sysTgt = rate.target_qty !== null ? Number(rate.target_qty) : 0;
                          const tgtTxt = sysTgt > 0 ? sysTgt.toLocaleString() : "—";

                          if (rate.work_type === "flat") {
                            return (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-muted">เหมา</span>
                                {isEditing ? (
                                  <input type="number" step="0.01" min="0" disabled={readOnly}
                                    className="payroll-input text-right w-24"
                                    placeholder={defaultHigh.toFixed(2)}
                                    value={item.rate_at_target_override}
                                    onChange={(e) => updateItem(idx, { rate_at_target_override: e.target.value })} />
                                ) : (
                                  <span className={`font-semibold ${hasOverride ? "text-blue-700" : "text-green-700"}`}>
                                    {fmtMoney(item.rate_at_target_override !== "" ? Number(item.rate_at_target_override) : defaultHigh)}
                                  </span>
                                )}
                                <span className="text-muted">/{UNIT_LABEL[rate.unit]}</span>
                                {!readOnly && (
                                  <RateEditButtons isEditing={isEditing} hasOverride={hasOverride}
                                    onToggle={() => toggleEditRate(idx)} onReset={() => resetRateOverride(idx)} />
                                )}
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-muted w-16 text-left">ถึงเป้า:</span>
                                {isEditing ? (
                                  <input type="number" step="0.01" min="0" disabled={readOnly}
                                    className="payroll-input text-right w-24"
                                    placeholder={defaultHigh.toFixed(2)}
                                    value={item.rate_at_target_override}
                                    onChange={(e) => updateItem(idx, { rate_at_target_override: e.target.value })} />
                                ) : (
                                  <span className={`font-semibold w-24 text-right ${item.rate_at_target_override !== "" ? "text-blue-700" : "text-green-700"}`}>
                                    {fmtMoney(item.rate_at_target_override !== "" ? Number(item.rate_at_target_override) : defaultHigh)}
                                  </span>
                                )}
                                <span className="text-muted text-[11px] w-12 text-left">(≥{tgtTxt})</span>
                                <span className="w-14 inline-flex justify-end">
                                  {!readOnly && (
                                    <RateEditButtons isEditing={isEditing} hasOverride={hasOverride}
                                      onToggle={() => toggleEditRate(idx)} onReset={() => resetRateOverride(idx)} />
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-muted w-16 text-left">ไม่ถึง:</span>
                                {isEditing ? (
                                  <input type="number" step="0.01" min="0" disabled={readOnly}
                                    className="payroll-input text-right w-24"
                                    placeholder={defaultLow !== null ? defaultLow.toFixed(2) : "—"}
                                    value={item.rate_below_target_override}
                                    onChange={(e) => updateItem(idx, { rate_below_target_override: e.target.value })} />
                                ) : (
                                  <span className={`font-semibold w-24 text-right ${item.rate_below_target_override !== "" ? "text-blue-700" : "text-amber-700"}`}>
                                    {item.rate_below_target_override !== ""
                                      ? fmtMoney(Number(item.rate_below_target_override))
                                      : defaultLow !== null ? fmtMoney(defaultLow) : "—"}
                                  </span>
                                )}
                                <span className="text-muted text-[11px] w-12 text-left">(&lt;{tgtTxt})</span>
                                <span className="w-14" />
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      )}
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" required disabled={readOnly}
                          className="payroll-input text-right"
                          value={item.target_qty}
                          onChange={(e) => updateItem(idx, { target_qty: e.target.value })} />
                      </td>
                      {isEdit && (
                        <td className="px-3 py-2 text-right text-xs">
                          <span className={prev.actual >= Number(item.target_qty || 0) && Number(item.target_qty) > 0 ? "text-green-700 font-semibold" : "text-amber-700 font-semibold"}>
                            {prev.actual.toLocaleString()}
                          </span>
                        </td>
                      )}
                      {isEdit && canViewMoney && (
                        <td className="px-3 py-2 text-right text-xs">{fmtMoney(prev.rateUsed)}</td>
                      )}
                      {isEdit && canViewMoney && (
                        <td className="px-3 py-2 text-right font-bold text-green-700">{fmtMoney(prev.total)}</td>
                      )}
                      <td className="px-3 py-2 text-right">
                        {!readOnly && (
                          <button type="button" onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {isEdit && canViewMoney && form.items.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-green-50/50 flex justify-between items-center">
              <span className="text-sm font-medium">รวมค่าจ้างจากรายการผลิต</span>
              <span className="text-lg font-bold text-green-700">{fmtMoney(grandTotal)} บาท</span>
            </div>
          )}
        </div>

        {/* Extras — รายการจ่ายเพิ่มเติม */}
        <div className="bg-white rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" /> รายการจ่าย-หักเพิ่มเติม ({(form.extras ?? []).length} รายการ)
            </h3>
            <div className="flex items-center gap-3">
              {canViewMoney && (
                <span className="text-xs text-muted">
                  รวม: <span className="font-bold text-amber-700">{fmtMoney(otherExtrasTotal)}</span>
                </span>
              )}
              {!readOnly && (
                <button type="button" onClick={addExtra}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border hover:bg-gray-50">
                  <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                </button>
              )}
            </div>
          </div>
          {(form.extras ?? []).length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">— ไม่มีรายการจ่าย-หักเพิ่มเติม (เช่น หูแพแผ่นพื้น, ค่าขนส่ง, หักค่าเสียหาย — ใส่ราคา/หน่วยติดลบสำหรับรายการหัก ฯลฯ) —</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">รายการ *</th>
                  <th className="px-3 py-2 w-24">หน่วย</th>
                  <th className="px-3 py-2 w-24 text-right">จำนวน *</th>
                  {canViewMoney && (
                    <>
                      <th className="px-3 py-2 w-28 text-right">ราคา/หน่วย *</th>
                      <th className="px-3 py-2 w-32 text-right">รวมเงิน</th>
                    </>
                  )}
                  <th className="px-3 py-2">หมายเหตุ</th>
                  <th className="px-3 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {(form.extras ?? []).map((e, idx) => {
                  const lineAmount = Number(e.qty || 0) * Number(e.rate || 0);
                  return (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-center text-xs text-muted">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input type="text" disabled={readOnly} className="payroll-input"
                          placeholder="เช่น หูแพแผ่นพื้น"
                          value={e.name} onChange={(ev) => updateExtra(idx, { name: ev.target.value })} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" disabled={readOnly} className="payroll-input"
                          placeholder="แพ"
                          value={e.unit} onChange={(ev) => updateExtra(idx, { unit: ev.target.value })} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" disabled={readOnly} className="payroll-input text-right"
                          value={e.qty} onChange={(ev) => updateExtra(idx, { qty: ev.target.value })} />
                      </td>
                      {canViewMoney && (
                        <>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" disabled={readOnly} className="payroll-input text-right"
                              value={e.rate} onChange={(ev) => updateExtra(idx, { rate: ev.target.value })} />
                          </td>
                          <td className={`px-3 py-2 text-right font-semibold tabular-nums ${lineAmount < 0 ? "text-red-600" : "text-amber-700"}`}>
                            {fmtMoney(lineAmount)}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2">
                        <input type="text" disabled={readOnly} className="payroll-input"
                          value={e.note} onChange={(ev) => updateExtra(idx, { note: ev.target.value })} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!readOnly && (
                          <button type="button" onClick={() => removeExtra(idx)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ค่าหัก — ตารางรายคนตามแบบฟอร์มกระดาษ (ชื่อ / เงินเบิก / ค่าของ / ค่าไฟ / ประกัน) */}
        {canViewMoney && (
          <div className="bg-white rounded-xl border border-border">
            <div className="px-4 py-3 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Coins className="w-4 h-4 text-red-600" /> ค่าหัก ({deductions.length} คน)
                </h3>
                <p className="text-xs text-muted mt-0.5">กรอกยอดเป็นเลขบวก ระบบหักออกจากยอดรวมให้เอง</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  รวมค่าหัก: <span className="font-bold text-red-600">{fmtMoney(deductionsTotal)}</span>
                </span>
                {!readOnly && (
                  <button type="button" onClick={addDeduction}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border hover:bg-gray-50">
                    <Plus className="w-3.5 h-3.5" /> เพิ่มคน
                  </button>
                )}
              </div>
            </div>
            {deductions.length === 0 ? (
              <div className="p-6 text-center text-muted text-sm">— ไม่มีค่าหัก —</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="px-3 py-2 w-10">#</th>
                    <th className="px-3 py-2">ชื่อ *</th>
                    {DEDUCTION_COLUMNS.map((c) => (
                      <th key={c.key} className="px-3 py-2 w-32 text-right">{c.label}</th>
                    ))}
                    <th className="px-3 py-2 w-32 text-right">รวมค่าหัก</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((r, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-center text-xs text-muted">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input type="text" disabled={readOnly} className="payroll-input" list="wo-deduction-names"
                          placeholder="ชื่อลูกทีม"
                          value={r.name} onChange={(ev) => updateDeduction(idx, { name: ev.target.value })} />
                      </td>
                      {DEDUCTION_COLUMNS.map((c) => (
                        <td key={c.key} className="px-3 py-2">
                          <input type="number" step="0.01" min="0" disabled={readOnly} className="payroll-input text-right"
                            placeholder="0"
                            value={r[c.key]} onChange={(ev) => updateDeduction(idx, { [c.key]: ev.target.value })} />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-red-600">{fmtMoney(deductionRowTotal(r))}</td>
                      <td className="px-3 py-2 text-right">
                        {!readOnly && (
                          <button type="button" onClick={() => removeDeduction(idx)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <datalist id="wo-deduction-names">
              {memberNameOptions.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
        )}

        {/* Members */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h4 className="font-semibold text-sm inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> ลูกทีม ({form.members.length} คน)
              </h4>
              <p className="text-xs text-muted mt-0.5">บันทึกว่ามีใครในทีม — ไม่คิดเงินแยกราย (หัวหน้าทีมแบ่งเอง)</p>
            </div>
            {!readOnly && (
              <button type="button" onClick={addMember}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-gray-50">
                <Plus className="w-3.5 h-3.5" /> เพิ่มลูกทีม
              </button>
            )}
          </div>
          {form.members.length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">ยังไม่ได้บันทึกลูกทีม</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">พนักงาน</th>
                  <th className="px-3 py-2 w-32">หน้าที่</th>
                  <th className="px-3 py-2">หมายเหตุ</th>
                  <th className="px-3 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {form.members.map((m, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-xs text-muted">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <EmployeeCombobox
                        employees={employees}
                        value={m.employee_id ? String(m.employee_id) : ""}
                        onChange={(id) => updateMember(idx, { employee_id: id ? Number(id) : "" })}
                        disabled={readOnly}
                        className="w-full pl-3 pr-8 py-2 rounded-lg border border-border text-sm bg-white disabled:bg-surface"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select disabled={readOnly} className="payroll-input"
                        value={m.role} onChange={(e) => updateMember(idx, { role: e.target.value })}>
                        <option value="">—</option>
                        <option value="caster">คนเท</option>
                        <option value="lifter">คนยก</option>
                        <option value="helper">ผู้ช่วย</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" disabled={readOnly} className="payroll-input"
                        value={m.note} onChange={(e) => updateMember(idx, { note: e.target.value })} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!readOnly && (
                        <button type="button" onClick={() => removeMember(idx)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isEdit && canViewMoney && (form.items.length > 0 || (form.extras ?? []).length > 0 || deductions.length > 0) && (
          <div className="bg-gradient-to-r from-green-50 to-amber-50 rounded-xl border-2 border-green-200 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-semibold">รวมค่าจ้างทั้งใบ (จ่ายหัวหน้าทีม)</span>
            <span className="text-xl font-bold text-green-700">{fmtMoney(grandTotal + extrasTotal)} บาท</span>
          </div>
        )}

        {err && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-start gap-2 whitespace-pre-wrap">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{err}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 flex items-center gap-2 border border-green-200">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {!readOnly && (
          <div className="flex justify-between items-center gap-2 pt-2">
            <div>
              {isEdit && form.id && (
                <button type="button" onClick={handleDelete}
                  className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                  ลบใบงาน
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {isEdit && form.status === "completed" && onPrintSummary && (
                <button type="button" onClick={onPrintSummary}
                  className="px-4 py-2 text-sm rounded-lg bg-white border border-primary-300 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-2">
                  <Printer className="w-4 h-4" /> พิมพ์ใบจ่ายงาน (ยอดรวม)
                </button>
              )}
              <Link href="/payroll/work-orders" className="px-4 py-2 text-sm rounded-lg border border-border">ยกเลิก</Link>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึก
              </button>
            </div>
          </div>
        )}
      </form>
    </>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function RateEditButtons({
  isEditing, hasOverride, onToggle, onReset,
}: { isEditing: boolean; hasOverride: boolean; onToggle: () => void; onReset: () => void }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      <button type="button" onClick={onToggle}
        title={isEditing ? "ปิดการแก้ไข" : "แก้ไขเรท"}
        className={`p-1 rounded hover:bg-gray-100 ${isEditing ? "text-blue-600" : "text-gray-400 hover:text-blue-600"}`}>
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {hasOverride && (
        <button type="button" onClick={onReset} title="คืนค่าเริ่มต้น"
          className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-red-600">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// เลือกรายการผลิต: แสดง "กลุ่ม" ก่อน กดเข้ากลุ่มแล้วค่อยแตกเป็นรายการ (หรือพิมพ์ค้นหาข้ามกลุ่มได้เลย)
// ใช้ portal + fixed position เพื่อไม่ให้ panel ถูกตัดขอบโดย overflow-hidden ของตารางที่ครอบอยู่
function RateItemPicker({
  rateItems, value, onPick, onPickAll, disabled,
}: { rateItems: RateItem[]; value: number | ""; onPick: (item: RateItem | null) => void; onPickAll?: (items: RateItem[]) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<{ key: string | null } | null>(null);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = rateItems.find((r) => r.id === value) ?? null;

  const updatePosition = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 288);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPos({ top: rect.bottom + 4, left: Math.max(8, left), width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
      setQuery("");
      setActiveCategory(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // นับจำนวนรายการต่อกลุ่ม (แสดงเฉพาะกลุ่มที่มีรายการจริง)
  const groups = useMemo(() => {
    const counts = new Map<string | null, number>();
    rateItems.forEach((r) => {
      const key = r.category ?? null;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, label: key === null ? "ไม่ระบุกลุ่ม" : categoryLabel(key), count }))
      .sort((a, b) => a.label.localeCompare(b.label, "th"));
  }, [rateItems]);

  const queryTrimmed = query.trim();
  const searching = queryTrimmed.length > 0;
  const filteredFlat = useMemo(() => {
    if (!searching) return [];
    const q = queryTrimmed.toLowerCase();
    return rateItems.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [rateItems, queryTrimmed, searching]);

  const itemsInCategory = useMemo(() => {
    if (searching || !activeCategory) return [];
    return rateItems.filter((r) => (r.category ?? null) === activeCategory.key);
  }, [rateItems, activeCategory, searching]);

  function pick(item: RateItem) {
    onPick(item);
    setOpen(false);
    setQuery("");
    setActiveCategory(null);
  }

  function pickAll() {
    if (itemsInCategory.length === 0) return;
    onPickAll?.(itemsInCategory);
    setOpen(false);
    setQuery("");
    setActiveCategory(null);
  }

  function clear() {
    onPick(null);
    setOpen(false);
    setQuery("");
    setActiveCategory(null);
  }

  return (
    <>
      <button ref={btnRef} type="button" disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full min-w-[220px] flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border text-sm bg-white disabled:bg-surface disabled:text-muted text-left">
        <span className={selected ? "" : "text-muted"}>
          {selected ? `${selected.name} (${selected.code})` : "-- เลือกรายการผลิต --"}
        </span>
        <ChevronDown className="w-4 h-4 text-muted shrink-0" />
      </button>
      {open && pos && createPortal(
        <div ref={panelRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 max-h-80 overflow-y-auto bg-white border border-border rounded-xl shadow-lg py-1">
          <div className="px-2 pb-1.5 pt-1 sticky top-0 bg-white border-b border-border z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ/รหัสรายการ (ข้ามกลุ่มได้)..."
                className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-border text-xs"
              />
            </div>
          </div>

          {searching ? (
            filteredFlat.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted">ไม่พบรายการ</div>
            ) : (
              filteredFlat.map((r) => (
                <button key={r.id} type="button" onClick={() => pick(r)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 ${r.id === value ? "bg-primary-50 font-medium text-primary-700" : ""}`}>
                  <div>{r.name} <span className="text-muted text-xs">({r.code})</span></div>
                  <div className="text-[11px] text-muted">{categoryLabel(r.category)}</div>
                </button>
              ))
            )
          ) : !activeCategory ? (
            <>
              {selected && (
                <button type="button" onClick={clear}
                  className="w-full text-left px-3 py-2 text-xs text-muted hover:bg-surface border-b border-border">
                  ล้างการเลือก
                </button>
              )}
              {groups.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted">ยังไม่มีรายการผลิต</div>
              ) : (
                groups.map((g) => (
                  <button key={g.key ?? "__none__"} type="button" onClick={() => setActiveCategory({ key: g.key })}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-primary-50">
                    <span>{g.label}</span>
                    <span className="text-xs text-muted">{g.count} รายการ ›</span>
                  </button>
                ))
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={() => setActiveCategory(null)}
                className="w-full flex items-center gap-1 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50 border-b border-border sticky top-0 bg-white">
                <ChevronLeft className="w-3.5 h-3.5" /> {activeCategory.key === null ? "ไม่ระบุกลุ่ม" : categoryLabel(activeCategory.key)}
              </button>
              {onPickAll && itemsInCategory.length > 0 && (
                <button type="button" onClick={pickAll}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 border-b border-border">
                  เลือกทั้งหมด ({itemsInCategory.length} รายการ) — เพิ่มเป็นหลายแถวทันที
                </button>
              )}
              {itemsInCategory.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted">ไม่มีรายการในกลุ่มนี้</div>
              ) : (
                itemsInCategory.map((r) => (
                  <button key={r.id} type="button" onClick={() => pick(r)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 ${r.id === value ? "bg-primary-50 font-medium text-primary-700" : ""}`}>
                    {r.name} <span className="text-muted text-xs">({r.code})</span>
                  </button>
                ))
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

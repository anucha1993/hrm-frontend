"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtMoney } from "@/lib/payroll";
import {
  Plus, Trash2, Loader2, AlertCircle, ArrowLeft, Save, Users, Crown,
  Pencil, RotateCcw, CalendarRange, Coins,
} from "lucide-react";

type RateItem = {
  id: number;
  code: string;
  name: string;
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
  note: string;
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
  status?: "draft" | "in_progress" | "completed" | "paid";
  items: ItemRow[];
  members: MemberRow[];
  extras?: ExtraRow[];
};

const UNIT_LABEL = { raft: "แพ", meter: "เมตร" } as const;
const WORK_TYPE_LABEL = { cast: "งานเท", lift: "งานยก", cast_lift: "เท+ยก", flat: "เหมา" } as const;

const today = () => new Date().toISOString().slice(0, 10);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export const blankForm: WorkOrderFormInit = {
  start_date: today(),
  end_date: today(),
  period_type: "custom",
  team_leader_id: "",
  location_name: "",
  note: "",
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
}: {
  initial: WorkOrderFormInit;
  isEdit?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<WorkOrderFormInit>({ ...initial, extras: initial.extras ?? [] });
  const [rateItems, setRateItems] = useState<RateItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeBrief[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingRates, setEditingRates] = useState<Set<number>>(new Set());
  const readOnly = form.status === "paid";

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

  const empOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.employee_code} - ${e.first_name} ${e.last_name}` })),
    [employees]
  );

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
  const extrasTotal = useMemo(
    () => (form.extras ?? []).reduce((s, e) => s + Number(e.qty || 0) * Number(e.rate || 0), 0),
    [form.extras]
  );

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (readOnly) return;
    if (!form.team_leader_id) { setErr("กรุณาเลือกหัวหน้าทีม"); return; }
    if (form.items.length === 0) { setErr("กรุณาเพิ่มรายการผลิตอย่างน้อย 1 รายการ"); return; }
    if (form.items.some((it) => !it.production_rate_item_id)) { setErr("กรุณาเลือกรายการผลิตให้ครบทุกแถว"); return; }

    setSaving(true);
    setErr(null);
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
          production_rate_item_id: it.production_rate_item_id,
          target_qty: Number(it.target_qty || 0),
          rate_at_target_override: it.rate_at_target_override === "" ? null : Number(it.rate_at_target_override),
          rate_below_target_override: it.rate_below_target_override === "" ? null : Number(it.rate_below_target_override),
        })),
        members: form.members
          .filter((m) => m.employee_id && m.employee_id !== form.team_leader_id)
          .map((m) => ({ employee_id: m.employee_id, role: m.role || null, note: m.note || null })),
        extras: (form.extras ?? [])
          .filter((e) => e.name.trim() !== "")
          .map((e) => ({
            name: e.name.trim(),
            unit: e.unit || null,
            qty: Number(e.qty || 0),
            rate: Number(e.rate || 0),
            note: e.note || null,
          })),
      };
      if (isEdit && form.id) {
        await apiFetch(`/payroll/work-orders/${form.id}`, { method: "PUT", body: payload });
        router.refresh();
      } else {
        const res = await apiFetch<{ data: { id: number } }>("/payroll/work-orders", {
          method: "POST", body: payload,
        });
        router.push(`/payroll/work-orders/${res.data.id}`);
      }
    } catch (ex: unknown) {
      const msg = ex instanceof ApiError && typeof ex.data === "object" && ex.data
        ? (ex.data as { message?: string }).message ?? ex.message
        : ex instanceof Error ? ex.message : "บันทึกไม่สำเร็จ";
      setErr(msg);
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
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value, period_type: "custom" })} />
            </Field>
            <Field label="วันสิ้นสุด *">
              <input type="date" required disabled={readOnly} className="payroll-input"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value, period_type: "custom" })} />
            </Field>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-border p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={<><Crown className="w-3.5 h-3.5 inline mr-1 text-amber-600" />หัวหน้าทีม * (รับค่าจ้าง)</>}>
            <select required disabled={readOnly} className="payroll-input"
              value={form.team_leader_id}
              onChange={(e) => setForm({ ...form, team_leader_id: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">-- เลือก --</option>
              {empOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
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
          {form.items.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">ยังไม่มีรายการผลิต — กด &quot;เพิ่มรายการ&quot;</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">รายการผลิต</th>
                  <th className="px-3 py-2">ประเภท</th>
                  <th className="px-3 py-2 text-right w-64">เรทที่ตั้งไว้ <span className="text-muted normal-case font-normal">(ปรับได้)</span></th>
                  <th className="px-3 py-2 text-right w-28">ต้องผลิต (เป้า)</th>
                  {isEdit && <th className="px-3 py-2 text-right w-28">ผลิตจริง</th>}
                  {isEdit && <th className="px-3 py-2 text-right w-28">เรทที่ใช้</th>}
                  {isEdit && <th className="px-3 py-2 text-right w-32">ค่าจ้าง</th>}
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
                        <select required disabled={readOnly} className="payroll-input min-w-[220px]"
                          value={item.production_rate_item_id}
                          onChange={(e) => {
                            const newId = e.target.value ? Number(e.target.value) : "";
                            const picked = newId ? rateItems.find((r) => r.id === newId) : null;
                            // auto-fill target จาก system default ก็ต่อเมื่อ user ยังไม่ได้กรอกเอง (เป็น 0)
                            const currentTgt = Number(item.target_qty || 0);
                            const shouldFill =
                              picked &&
                              picked.work_type !== "flat" &&
                              picked.target_qty !== null &&
                              currentTgt === 0;
                            updateItem(idx, {
                              production_rate_item_id: newId,
                              ...(shouldFill ? { target_qty: String(picked!.target_qty) } : {}),
                            });
                          }}>
                          <option value="">-- เลือก --</option>
                          {rateItems.map((r) => (
                            <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {rate ? (
                          <>
                            <div className="font-medium">{WORK_TYPE_LABEL[rate.work_type]}</div>
                            <div className="text-muted">{UNIT_LABEL[rate.unit]}</div>
                          </>
                        ) : "—"}
                      </td>
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
                      {isEdit && (
                        <td className="px-3 py-2 text-right text-xs">{fmtMoney(prev.rateUsed)}</td>
                      )}
                      {isEdit && (
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
          {isEdit && form.items.length > 0 && (
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
              <Coins className="w-4 h-4 text-amber-600" /> รายการจ่ายเพิ่มเติม ({(form.extras ?? []).length} รายการ)
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                รวม: <span className="font-bold text-amber-700">{fmtMoney(extrasTotal)}</span>
              </span>
              {!readOnly && (
                <button type="button" onClick={addExtra}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border hover:bg-gray-50">
                  <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                </button>
              )}
            </div>
          </div>
          {(form.extras ?? []).length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">— ไม่มีรายการเพิ่มเติม (เช่น หูแพแผ่นพื้น, ค่าขนส่ง ฯลฯ) —</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">รายการ *</th>
                  <th className="px-3 py-2 w-24">หน่วย</th>
                  <th className="px-3 py-2 w-24 text-right">จำนวน *</th>
                  <th className="px-3 py-2 w-28 text-right">ราคา/หน่วย *</th>
                  <th className="px-3 py-2 w-32 text-right">รวมเงิน</th>
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
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" disabled={readOnly} className="payroll-input text-right"
                          value={e.rate} onChange={(ev) => updateExtra(idx, { rate: ev.target.value })} />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-amber-700 tabular-nums">
                        {fmtMoney(lineAmount)}
                      </td>
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
                      <select disabled={readOnly} className="payroll-input"
                        value={m.employee_id}
                        onChange={(e) => updateMember(idx, { employee_id: e.target.value ? Number(e.target.value) : "" })}>
                        <option value="">-- เลือก --</option>
                        {empOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
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

        {isEdit && (form.items.length > 0 || (form.extras ?? []).length > 0) && (
          <div className="bg-gradient-to-r from-green-50 to-amber-50 rounded-xl border-2 border-green-200 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-semibold">รวมค่าจ้างทั้งใบ (จ่ายหัวหน้าทีม)</span>
            <span className="text-xl font-bold text-green-700">{fmtMoney(grandTotal + extrasTotal)} บาท</span>
          </div>
        )}

        {err && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {err}
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

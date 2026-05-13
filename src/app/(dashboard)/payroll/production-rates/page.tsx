"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { fmtMoney } from "@/lib/payroll";
import { Plus, X, Loader2, Edit, Trash2, AlertCircle, Calculator } from "lucide-react";

type WorkType = "cast" | "lift" | "cast_lift" | "flat";
type Unit = "raft" | "meter";

type ProductionRateItem = {
  id: number;
  code: string;
  name: string;
  category: string | null;
  work_type: WorkType;
  unit: Unit;
  target_qty: string | null;
  rate_at_target: string;
  rate_below_target: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
};

type Form = {
  code: string;
  name: string;
  category: string;
  work_type: WorkType;
  unit: Unit;
  target_qty: string;
  rate_at_target: string;
  rate_below_target: string;
  note: string;
  is_active: boolean;
  sort_order: string;
};

const empty: Form = {
  code: "",
  name: "",
  category: "",
  work_type: "cast",
  unit: "raft",
  target_qty: "",
  rate_at_target: "0",
  rate_below_target: "",
  note: "",
  is_active: true,
  sort_order: "0",
};

const WORK_TYPE_LABEL: Record<WorkType, string> = {
  cast: "เท",
  lift: "ยก",
  cast_lift: "เท + ยก",
  flat: "อัตราเดียว",
};

const UNIT_LABEL: Record<Unit, string> = {
  raft: "แพ",
  meter: "เมตร",
};

const CATEGORY_OPTIONS = [
  { value: "pae_front", label: "แพหน้า" },
  { value: "pae_back", label: "แพหลัง" },
  { value: "prestress", label: "อัดแรง" },
  { value: "i15", label: "ไอ 15" },
  { value: "i18", label: "ไอ 18" },
  { value: "fence", label: "เสารั้ว" },
  { value: "pile", label: "เสาเข็ม" },
  { value: "other", label: "อื่นๆ" },
];

const categoryLabel = (cat: string | null) =>
  CATEGORY_OPTIONS.find((c) => c.value === cat)?.label ?? cat ?? "—";

export default function ProductionRatesPage() {
  const [items, setItems] = useState<ProductionRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductionRateItem | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showCalc, setShowCalc] = useState<ProductionRateItem | null>(null);
  const [calcQty, setCalcQty] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: ProductionRateItem[] }>("/payroll/production-rates");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setErr(null);
    setShowForm(true);
  }

  function openEdit(it: ProductionRateItem) {
    setEditing(it);
    setErr(null);
    setForm({
      code: it.code,
      name: it.name,
      category: it.category ?? "",
      work_type: it.work_type,
      unit: it.unit,
      target_qty: it.target_qty ?? "",
      rate_at_target: it.rate_at_target,
      rate_below_target: it.rate_below_target ?? "",
      note: it.note ?? "",
      is_active: it.is_active,
      sort_order: String(it.sort_order ?? 0),
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    try {
      const isFlat = form.work_type === "flat";
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category || null,
        work_type: form.work_type,
        unit: form.unit,
        target_qty: isFlat || !form.target_qty ? null : Number(form.target_qty),
        rate_at_target: Number(form.rate_at_target || 0),
        rate_below_target: isFlat || !form.rate_below_target ? null : Number(form.rate_below_target),
        note: form.note || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
      };
      const path = editing ? `/payroll/production-rates/${editing.id}` : "/payroll/production-rates";
      await apiFetch(path, { method: editing ? "PUT" : "POST", body: payload });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(it: ProductionRateItem) {
    if (!confirm(`ลบรายการ "${it.name}"?`)) return;
    try {
      await apiFetch(`/payroll/production-rates/${it.id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filterCategory && it.category !== filterCategory) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!it.name.toLowerCase().includes(s) && !it.code.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [items, filterCategory, search]);

  const calcResult = useMemo(() => {
    if (!showCalc || !calcQty) return null;
    const qty = Number(calcQty);
    if (!Number.isFinite(qty) || qty < 0) return null;
    const it = showCalc;
    const target = it.target_qty ? Number(it.target_qty) : null;
    const rateHigh = Number(it.rate_at_target);
    const rateLow = it.rate_below_target ? Number(it.rate_below_target) : rateHigh;
    let rate: number;
    if (it.work_type === "flat" || target === null) {
      rate = rateHigh;
    } else {
      rate = qty >= target ? rateHigh : rateLow;
    }
    return { qty, rate, total: qty * rate };
  }, [showCalc, calcQty]);

  return (
    <>
      <Topbar title="เรทค่าจ้างการผลิต (Piecework)" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="payroll-input w-44"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">ทุกกลุ่ม</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              className="payroll-input w-60"
              placeholder="ค้นหา รหัส / ชื่อ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
          >
            <Plus className="w-4 h-4" /> เพิ่มเรท
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ยังไม่มีรายการ
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3">รหัส</th>
                  <th className="px-3 py-3">ชื่อรายการ</th>
                  <th className="px-3 py-3">กลุ่ม</th>
                  <th className="px-3 py-3">ลักษณะงาน</th>
                  <th className="px-3 py-3 text-right">เป้า</th>
                  <th className="px-3 py-3 text-right">เรทถึงเป้า</th>
                  <th className="px-3 py-3 text-right">เรทต่ำกว่าเป้า</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-mono text-xs">{it.code}</td>
                    <td className="px-3 py-3 font-medium">
                      {it.name}
                      {it.note && (
                        <div className="text-xs text-muted mt-0.5">{it.note}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">{categoryLabel(it.category)}</td>
                    <td className="px-3 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                        {WORK_TYPE_LABEL[it.work_type]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      {it.target_qty
                        ? `${Number(it.target_qty).toLocaleString()} ${UNIT_LABEL[it.unit]}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-green-700">
                      {fmtMoney(it.rate_at_target)} / {UNIT_LABEL[it.unit]}
                    </td>
                    <td className="px-3 py-3 text-right text-amber-700">
                      {it.rate_below_target
                        ? `${fmtMoney(it.rate_below_target)} / ${UNIT_LABEL[it.unit]}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {it.is_active
                        ? <span className="text-green-700">ใช้งาน</span>
                        : <span className="text-gray-400">ปิด</span>}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => { setShowCalc(it); setCalcQty(""); }}
                        className="p-1.5 text-gray-500 hover:text-blue-600"
                        title="คำนวณค่าจ้าง"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(it)} className="p-1.5 text-gray-500 hover:text-primary-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(it)} className="p-1.5 text-gray-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-semibold">{editing ? "แก้ไขเรทค่าจ้าง" : "เพิ่มเรทค่าจ้างใหม่"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="รหัส *">
                  <input
                    className="payroll-input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="เช่น PAE-FRONT-CAST"
                  />
                </Field>
                <Field label="กลุ่มงาน">
                  <select
                    className="payroll-input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="ชื่อรายการ *">
                <input
                  className="payroll-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น แพหน้า เท"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ลักษณะงาน *">
                  <select
                    className="payroll-input"
                    value={form.work_type}
                    onChange={(e) => setForm({ ...form, work_type: e.target.value as WorkType })}
                  >
                    <option value="cast">เท</option>
                    <option value="lift">ยก</option>
                    <option value="cast_lift">เท + ยก (รวม)</option>
                    <option value="flat">อัตราเดียว (เหมา)</option>
                  </select>
                </Field>
                <Field label="หน่วยนับ *">
                  <select
                    className="payroll-input"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}
                  >
                    <option value="raft">แพ</option>
                    <option value="meter">เมตร</option>
                  </select>
                </Field>
              </div>

              {form.work_type !== "flat" && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <Field label="จำนวนเป้า (target)">
                    <input
                      type="number" step="0.01" min="0"
                      className="payroll-input"
                      value={form.target_qty}
                      onChange={(e) => setForm({ ...form, target_qty: e.target.value })}
                      placeholder="เช่น 38"
                    />
                  </Field>
                  <Field label="เรทถึงเป้า *">
                    <input
                      type="number" step="0.01" min="0"
                      className="payroll-input"
                      value={form.rate_at_target}
                      onChange={(e) => setForm({ ...form, rate_at_target: e.target.value })}
                    />
                  </Field>
                  <Field label="เรทต่ำกว่าเป้า">
                    <input
                      type="number" step="0.01" min="0"
                      className="payroll-input"
                      value={form.rate_below_target}
                      onChange={(e) => setForm({ ...form, rate_below_target: e.target.value })}
                    />
                  </Field>
                </div>
              )}

              {form.work_type === "flat" && (
                <Field label="เรทเหมา (บาท / หน่วย) *">
                  <input
                    type="number" step="0.01" min="0"
                    className="payroll-input"
                    value={form.rate_at_target}
                    onChange={(e) => setForm({ ...form, rate_at_target: e.target.value })}
                    placeholder="เช่น 7"
                  />
                </Field>
              )}

              <Field label="หมายเหตุ">
                <input
                  className="payroll-input"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Field label="ลำดับการแสดงผล">
                  <input
                    type="number" min="0"
                    className="payroll-input"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  />
                </Field>
                <label className="flex items-end pb-2 gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  เปิดใช้งาน
                </label>
              </div>

              <div className="rounded-lg bg-gray-50 border border-border p-3 text-xs text-gray-700">
                <div className="font-semibold mb-1">ตัวอย่างการคำนวณ:</div>
                {form.work_type === "flat" ? (
                  <div>เหมา {fmtMoney(form.rate_at_target || "0")} บาท / {UNIT_LABEL[form.unit]}</div>
                ) : (
                  <>
                    <div>
                      ทำได้ ≥ {form.target_qty || "—"} {UNIT_LABEL[form.unit]}
                      → {fmtMoney(form.rate_at_target || "0")} บาท / {UNIT_LABEL[form.unit]}
                    </div>
                    <div>
                      ทำได้ &lt; {form.target_qty || "—"} {UNIT_LABEL[form.unit]}
                      → {fmtMoney(form.rate_below_target || form.rate_at_target || "0")} บาท / {UNIT_LABEL[form.unit]}
                    </div>
                  </>
                )}
              </div>

              {err && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {err}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50 sticky bottom-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border">
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {showCalc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">คำนวณค่าจ้าง: {showCalc.name}</h3>
              <button onClick={() => setShowCalc(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Field label={`จำนวนที่ทำได้ (${UNIT_LABEL[showCalc.unit]})`}>
                <input
                  type="number" step="0.01" min="0" autoFocus
                  className="payroll-input"
                  value={calcQty}
                  onChange={(e) => setCalcQty(e.target.value)}
                  placeholder="0"
                />
              </Field>
              {calcResult && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <div className="text-xs text-gray-600">
                    {calcResult.qty.toLocaleString()} {UNIT_LABEL[showCalc.unit]}
                    × {fmtMoney(calcResult.rate)} บาท
                  </div>
                  <div className="text-2xl font-bold text-green-700 mt-1">
                    = {fmtMoney(calcResult.total)} บาท
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => setShowCalc(null)} className="px-4 py-2 text-sm rounded-lg border border-border">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
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

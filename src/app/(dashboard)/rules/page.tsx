"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Topbar from "@/components/Topbar";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Power,
  AlertCircle,
  CheckCircle2,
  X,
  TrendingDown,
  TrendingUp,
  Settings2,
} from "lucide-react";

/* ============== Types ============== */

type Tier = { threshold: number; amount: number };
type Rule = {
  id: number;
  code: string;
  name: string;
  type: "deduction" | "bonus";
  trigger: string;
  accumulation_mode: "repeating" | "one_shot" | "tiered" | "per_occurrence";
  threshold: number | null;
  comparison: ">=" | ">" | "=" | "every";
  tiers: Tier[] | null;
  amount_type: "fixed" | "per_occurrence" | "percent_salary" | "daily_rate" | "formula";
  amount: number;
  formula: string | null;
  disqualifiers: string[] | null;
  min_per_period: number | null;
  max_per_period: number | null;
  period: "monthly" | "yearly" | "period";
  priority: number;
  active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  note: string | null;
};

type Option = { value: string; label: string; unit?: string };
type Meta = {
  triggers: Option[];
  accumulation_modes: Option[];
  amount_types: Option[];
  comparisons: Option[];
  disqualifiers: Option[];
  periods: Option[];
  formula_variables: Record<string, string>;
};

type Setting = {
  id: number;
  key: string;
  value: unknown;
  category: string;
  label: string | null;
};

const GLOBAL_SETTING_KEYS = [
  { key: "max_deduction_percent", label: "หักรวมไม่เกิน % ของเงินเดือน", type: "number" as const, suffix: "%" },
  { key: "min_net_salary",        label: "เงินสุทธิหลังหักขั้นต่ำ",       type: "number" as const, suffix: "บาท" },
  { key: "daily_rate_divisor",    label: "ตัวหารสำหรับเรทรายวัน (เงินเดือน/?)", type: "number" as const, suffix: "" },
  { key: "calc_order",            label: "ลำดับการคำนวณ",                  type: "select" as const,
    options: [
      { value: "deduct_first", label: "หักก่อน-เพิ่มทีหลัง" },
      { value: "bonus_first",  label: "เพิ่มก่อน-หักทีหลัง" },
      { value: "parallel_cap", label: "คำนวณพร้อมกันแล้ว cap" },
    ],
  },
];

/* ============== Page ============== */

export default function RulesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("settings.manage");

  const [tab, setTab] = useState<"deduction" | "bonus" | "global">("deduction");
  const [rules, setRules] = useState<Rule[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creatingType, setCreatingType] = useState<"deduction" | "bonus" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [rRes, mRes, sRes] = await Promise.all([
        apiFetch<{ data: Rule[] }>(`/payroll-rules`),
        apiFetch<{ data: Meta }>(`/payroll-rules/meta`),
        apiFetch<{ data: Setting[] }>(`/payroll-settings`),
      ]);
      setRules(rRes.data);
      setMeta(mRes.data);
      const map: Record<string, unknown> = {};
      sRes.data.forEach((s) => (map[s.key] = s.value));
      setSettings(map);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deductions = useMemo(() => rules.filter((r) => r.type === "deduction"), [rules]);
  const bonuses = useMemo(() => rules.filter((r) => r.type === "bonus"), [rules]);

  async function toggleRule(rule: Rule) {
    try {
      await apiFetch(`/payroll-rules/${rule.id}/toggle`, { method: "POST" });
      setSuccess(`${rule.active ? "ปิด" : "เปิด"}ใช้งานกฎ "${rule.name}" แล้ว`);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  }

  async function deleteRule(rule: Rule) {
    if (!confirm(`ลบกฎ "${rule.name}" ใช่หรือไม่?`)) return;
    try {
      await apiFetch(`/payroll-rules/${rule.id}`, { method: "DELETE" });
      setSuccess(`ลบกฎ "${rule.name}" แล้ว`);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ");
    }
  }

  async function saveSettings() {
    try {
      const items = GLOBAL_SETTING_KEYS.map((k) => ({
        key: k.key,
        label: k.label,
        category: "global",
        value: settings[k.key] ?? null,
      }));
      await apiFetch(`/payroll-settings`, { method: "PUT", body: { items } });
      setSuccess("บันทึกการตั้งค่ารวมเรียบร้อย");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="กำหนดกฎระเบียบ" />
      <div className="p-6 space-y-4">
        {/* Header + tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-slate-600" />
            <h1 className="text-xl font-semibold">กฎหัก / เพิ่มเงิน และการตั้งค่ารวม</h1>
          </div>
          {canManage && tab !== "global" && (
            <button
              type="button"
              onClick={() => setCreatingType(tab)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="size-4" /> เพิ่มกฎใหม่
            </button>
          )}
        </div>

        {/* Banners */}
        {err && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="size-4 mt-0.5" />
            <span className="whitespace-pre-wrap">{err}</span>
            <button className="ml-auto" onClick={() => setErr(null)}>
              <X className="size-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4 mt-0.5" />
            <span>{success}</span>
            <button className="ml-auto" onClick={() => setSuccess(null)}>
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex gap-1 border-b border-slate-200">
          <TabBtn active={tab === "deduction"} onClick={() => setTab("deduction")}>
            <TrendingDown className="size-4" /> หักเงิน ({deductions.length})
          </TabBtn>
          <TabBtn active={tab === "bonus"} onClick={() => setTab("bonus")}>
            <TrendingUp className="size-4" /> เพิ่มเงิน / โบนัส ({bonuses.length})
          </TabBtn>
          <TabBtn active={tab === "global"} onClick={() => setTab("global")}>
            <Settings2 className="size-4" /> การตั้งค่ารวม
          </TabBtn>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-slate-500 text-sm">กำลังโหลด…</div>
        ) : tab === "global" ? (
          <GlobalSettingsCard
            settings={settings}
            setSettings={setSettings}
            canManage={canManage}
            onSave={saveSettings}
          />
        ) : (
          <RuleList
            rules={tab === "deduction" ? deductions : bonuses}
            meta={meta}
            canManage={canManage}
            onEdit={setEditing}
            onToggle={toggleRule}
            onDelete={deleteRule}
          />
        )}
      </div>

      {(editing || creatingType) && meta && (
        <RuleFormModal
          rule={editing}
          createType={creatingType}
          meta={meta}
          onClose={() => {
            setEditing(null);
            setCreatingType(null);
          }}
          onSaved={async (msg) => {
            setEditing(null);
            setCreatingType(null);
            setSuccess(msg);
            await load();
          }}
        />
      )}
    </>
  );
}

/* ============== Sub components ============== */

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function RuleList({
  rules,
  meta,
  canManage,
  onEdit,
  onToggle,
  onDelete,
}: {
  rules: Rule[];
  meta: Meta | null;
  canManage: boolean;
  onEdit: (r: Rule) => void;
  onToggle: (r: Rule) => void;
  onDelete: (r: Rule) => void;
}) {
  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
        ยังไม่มีกฎในหมวดนี้
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left w-20">รหัส</th>
            <th className="px-3 py-2 text-left">ชื่อกฎ</th>
            <th className="px-3 py-2 text-left">เงื่อนไข</th>
            <th className="px-3 py-2 text-left">การคำนวณ</th>
            <th className="px-3 py-2 text-left">รอบ</th>
            <th className="px-3 py-2 text-center">สถานะ</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
              <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.code}</td>
              <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
              <td className="px-3 py-2 text-slate-700">{describeTrigger(r, meta)}</td>
              <td className="px-3 py-2 text-slate-700">{describeAmount(r, meta)}</td>
              <td className="px-3 py-2 text-slate-600">
                {meta?.periods.find((p) => p.value === r.period)?.label ?? r.period}
              </td>
              <td className="px-3 py-2 text-center">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {r.active ? "เปิดใช้งาน" : "ปิด"}
                </span>
              </td>
              <td className="px-3 py-2">
                {canManage && (
                  <div className="flex justify-end gap-1">
                    <IconBtn title={r.active ? "ปิด" : "เปิด"} onClick={() => onToggle(r)}>
                      <Power className="size-4" />
                    </IconBtn>
                    <IconBtn title="แก้ไข" onClick={() => onEdit(r)}>
                      <Pencil className="size-4" />
                    </IconBtn>
                    <IconBtn title="ลบ" onClick={() => onDelete(r)} danger>
                      <Trash2 className="size-4" />
                    </IconBtn>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 transition ${
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function describeTrigger(r: Rule, meta: Meta | null): string {
  const t = meta?.triggers.find((x) => x.value === r.trigger);
  const label = t?.label ?? r.trigger;
  const unit = t?.unit ?? "";

  if (r.trigger === "no_disqualifier") {
    const dq = r.disqualifiers ?? [];
    if (dq.length === 0) return `${label} (ไม่มีเงื่อนไข)`;
    const dqLabels = dq
      .map((d) => meta?.disqualifiers.find((x) => x.value === d)?.label ?? d)
      .join(", ");
    return `${label} — ไม่มี: ${dqLabels}`;
  }

  if (r.accumulation_mode === "tiered") {
    const tiers = (r.tiers ?? []).map((t) => `${t.threshold}${unit ? unit : ""}→${t.amount}`).join(", ");
    return `${label} (ขั้นบันได: ${tiers || "ยังไม่ตั้ง"})`;
  }
  if (r.accumulation_mode === "repeating") {
    return `${label} ทุกๆ ${r.threshold ?? 0} ${unit}`;
  }
  if (r.accumulation_mode === "per_occurrence") {
    return `${label} ต่อเหตุการณ์ (>${r.threshold ?? 0} ${unit})`;
  }
  return `${label} ${r.comparison} ${r.threshold ?? 0} ${unit}`;
}

function describeAmount(r: Rule, meta: Meta | null): string {
  const t = meta?.amount_types.find((x) => x.value === r.amount_type)?.label ?? r.amount_type;
  const sign = r.type === "deduction" ? "-" : "+";
  if (r.amount_type === "formula") return `${sign} สูตร: ${r.formula ?? "-"}`;
  if (r.amount_type === "percent_salary") return `${sign}${r.amount}% ของเงินเดือน`;
  if (r.amount_type === "daily_rate") return `${sign}เรทรายวัน × ${r.amount || 1}`;
  if (r.amount_type === "per_occurrence") return `${sign}${r.amount} × จำนวน`;
  return `${sign}${r.amount} (${t})`;
}

/* ============== Global Settings ============== */

function GlobalSettingsCard({
  settings,
  setSettings,
  canManage,
  onSave,
}: {
  settings: Record<string, unknown>;
  setSettings: (s: Record<string, unknown>) => void;
  canManage: boolean;
  onSave: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <p className="text-sm text-slate-600">
        ค่าที่ตั้งในนี้จะมีผลกับ <strong>ทุกกฎ</strong> ในระบบ Payroll
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {GLOBAL_SETTING_KEYS.map((cfg) => (
          <div key={cfg.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{cfg.label}</label>
            {cfg.type === "select" ? (
              <select
                disabled={!canManage}
                value={(settings[cfg.key] as string) ?? ""}
                onChange={(e) => setSettings({ ...settings, [cfg.key]: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— ไม่กำหนด —</option>
                {cfg.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  disabled={!canManage}
                  value={(settings[cfg.key] as number | string) ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      [cfg.key]: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {cfg.suffix && <span className="text-slate-500 text-sm">{cfg.suffix}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
      {canManage && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            บันทึกการตั้งค่ารวม
          </button>
        </div>
      )}
    </div>
  );
}

/* ============== Rule Form Modal ============== */

type FormState = {
  code: string;
  name: string;
  type: "deduction" | "bonus";
  trigger: string;
  accumulation_mode: Rule["accumulation_mode"];
  threshold: string;
  comparison: Rule["comparison"];
  tiers: Tier[];
  amount_type: Rule["amount_type"];
  amount: string;
  formula: string;
  disqualifiers: string[];
  min_per_period: string;
  max_per_period: string;
  period: Rule["period"];
  priority: string;
  active: boolean;
  effective_from: string;
  effective_to: string;
  note: string;
};

function ruleToForm(r: Rule | null, createType: "deduction" | "bonus" | null): FormState {
  if (r) {
    return {
      code: r.code,
      name: r.name,
      type: r.type,
      trigger: r.trigger,
      accumulation_mode: r.accumulation_mode,
      threshold: r.threshold == null ? "" : String(r.threshold),
      comparison: r.comparison,
      tiers: r.tiers ?? [],
      amount_type: r.amount_type,
      amount: String(r.amount ?? 0),
      formula: r.formula ?? "",
      disqualifiers: r.disqualifiers ?? [],
      min_per_period: r.min_per_period == null ? "" : String(r.min_per_period),
      max_per_period: r.max_per_period == null ? "" : String(r.max_per_period),
      period: r.period,
      priority: String(r.priority ?? 100),
      active: r.active,
      effective_from: r.effective_from ?? "",
      effective_to: r.effective_to ?? "",
      note: r.note ?? "",
    };
  }
  return {
    code: "",
    name: "",
    type: createType ?? "deduction",
    trigger: createType === "bonus" ? "no_disqualifier" : "late_count",
    accumulation_mode: "one_shot",
    threshold: "1",
    comparison: ">=",
    tiers: [],
    amount_type: "fixed",
    amount: "100",
    formula: "",
    disqualifiers: createType === "bonus" ? ["absent", "late"] : [],
    min_per_period: "",
    max_per_period: "",
    period: "monthly",
    priority: "100",
    active: true,
    effective_from: "",
    effective_to: "",
    note: "",
  };
}

function RuleFormModal({
  rule,
  createType,
  meta,
  onClose,
  onSaved,
}: {
  rule: Rule | null;
  createType: "deduction" | "bonus" | null;
  meta: Meta;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState<FormState>(() => ruleToForm(rule, createType));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isTiered = form.accumulation_mode === "tiered";
  const isNoDQ = form.trigger === "no_disqualifier";
  const isFormula = form.amount_type === "formula";

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleDQ(value: string) {
    const has = form.disqualifiers.includes(value);
    set(
      "disqualifiers",
      has ? form.disqualifiers.filter((d) => d !== value) : [...form.disqualifiers, value],
    );
  }

  function addTier() {
    set("tiers", [...form.tiers, { threshold: 0, amount: 0 }]);
  }
  function removeTier(i: number) {
    set("tiers", form.tiers.filter((_, idx) => idx !== i));
  }
  function updateTier(i: number, key: keyof Tier, v: number) {
    set(
      "tiers",
      form.tiers.map((t, idx) => (idx === i ? { ...t, [key]: v } : t)),
    );
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        code: form.code || null,
        name: form.name,
        type: form.type,
        trigger: form.trigger,
        accumulation_mode: form.accumulation_mode,
        threshold: form.threshold === "" ? null : Number(form.threshold),
        comparison: form.comparison,
        tiers: isTiered ? form.tiers : null,
        amount_type: form.amount_type,
        amount: form.amount === "" ? 0 : Number(form.amount),
        formula: isFormula ? form.formula : null,
        disqualifiers: isNoDQ ? form.disqualifiers : null,
        min_per_period: form.min_per_period === "" ? null : Number(form.min_per_period),
        max_per_period: form.max_per_period === "" ? null : Number(form.max_per_period),
        period: form.period,
        priority: Number(form.priority) || 100,
        active: form.active,
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
        note: form.note || null,
      };
      if (rule) {
        await apiFetch(`/payroll-rules/${rule.id}`, { method: "PUT", body });
        onSaved("แก้ไขกฎเรียบร้อย");
      } else {
        await apiFetch(`/payroll-rules`, { method: "POST", body });
        onSaved("สร้างกฎใหม่เรียบร้อย");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        const errs = (e.data as { errors?: Record<string, string[]> })?.errors;
        if (errs) {
          setErr(Object.values(errs).flat().join("\n"));
        } else {
          setErr(e.message);
        }
      } else {
        setErr("บันทึกไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
    }
  }

  const triggerUnit = meta.triggers.find((t) => t.value === form.trigger)?.unit ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="text-lg font-semibold">
            {rule ? "แก้ไขกฎ" : `เพิ่มกฎ${form.type === "deduction" ? "หักเงิน" : "เพิ่มเงิน"}`}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {err && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 whitespace-pre-wrap">
              {err}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ชื่อกฎ *">
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="เช่น สาย 3 ครั้งหัก 100 บาท"
              />
            </Field>
            <Field label="รหัส (ปล่อยว่างเพื่อสร้างอัตโนมัติ)">
              <input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </Field>

            <Field label="ประเภท *">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as "deduction" | "bonus")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="deduction">🔻 หักเงิน</option>
                <option value="bonus">🔺 เพิ่มเงิน / โบนัส</option>
              </select>
            </Field>

            <Field label="เงื่อนไขจาก (Trigger) *">
              <select
                value={form.trigger}
                onChange={(e) => set("trigger", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {meta.triggers.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>

            {!isNoDQ && (
              <>
                <Field label="โหมดการนับ *">
                  <select
                    value={form.accumulation_mode}
                    onChange={(e) =>
                      set("accumulation_mode", e.target.value as Rule["accumulation_mode"])
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {meta.accumulation_modes.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {!isTiered && (
                  <Field label={`ค่าเทียบ (${triggerUnit || "-"})`}>
                    <div className="flex items-center gap-2">
                      <select
                        value={form.comparison}
                        onChange={(e) => set("comparison", e.target.value as Rule["comparison"])}
                        className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      >
                        {meta.comparisons.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.value}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={form.threshold}
                        onChange={(e) => set("threshold", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </Field>
                )}
              </>
            )}
          </div>

          {/* Tiers */}
          {isTiered && (
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">ขั้นบันได (Tiers)</span>
                <button
                  type="button"
                  onClick={addTier}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200"
                >
                  <Plus className="size-3" /> เพิ่มขั้น
                </button>
              </div>
              {form.tiers.length === 0 ? (
                <p className="text-xs text-slate-500">ยังไม่มีขั้น — กด "เพิ่มขั้น"</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-slate-600">
                    <tr>
                      <th className="text-left py-1">เมื่อครบ ({triggerUnit})</th>
                      <th className="text-left py-1">{form.type === "deduction" ? "หัก" : "เพิ่ม"} (บาท)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.tiers.map((t, i) => (
                      <tr key={i}>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            value={t.threshold}
                            onChange={(e) => updateTier(i, "threshold", Number(e.target.value))}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            value={t.amount}
                            onChange={(e) => updateTier(i, "amount", Number(e.target.value))}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-1">
                          <button
                            type="button"
                            onClick={() => removeTier(i)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Disqualifiers */}
          {isNoDQ && (
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-medium mb-2">
                ถือว่า &quot;เสียสิทธิ์&quot; เมื่อมีเหตุการณ์ใดเหล่านี้ในรอบ:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {meta.disqualifiers.map((d) => (
                  <label key={d.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.disqualifiers.includes(d.value)}
                      onChange={() => toggleDQ(d.value)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="รูปแบบจำนวนเงิน *">
              <select
                value={form.amount_type}
                onChange={(e) => set("amount_type", e.target.value as Rule["amount_type"])}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {meta.amount_types.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>

            {!isFormula ? (
              <Field
                label={
                  form.amount_type === "percent_salary"
                    ? "อัตรา (%)"
                    : form.amount_type === "daily_rate"
                      ? "ตัวคูณ × เรทรายวัน"
                      : "จำนวนเงิน (บาท)"
                }
              >
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
            ) : (
              <Field label="สูตร">
                <input
                  value={form.formula}
                  onChange={(e) => set("formula", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  placeholder="{salary} * 0.05 * {count}"
                />
              </Field>
            )}
          </div>

          {isFormula && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="font-medium mb-1">ตัวแปรที่ใช้ได้:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3">
                {Object.entries(meta.formula_variables).map(([k, v]) => (
                  <div key={k}>
                    <span className="font-mono text-slate-800">{k}</span> — {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Caps + period */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="ขั้นต่ำต่อรอบ (บาท)">
              <input
                type="number"
                step="0.01"
                value={form.min_per_period}
                onChange={(e) => set("min_per_period", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="ขั้นสูงต่อรอบ (บาท)">
              <input
                type="number"
                step="0.01"
                value={form.max_per_period}
                onChange={(e) => set("max_per_period", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="รอบที่นับ *">
              <select
                value={form.period}
                onChange={(e) => set("period", e.target.value as Rule["period"])}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {meta.periods.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="ลำดับการคำนวณ">
              <input
                type="number"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="เริ่มมีผล">
              <input
                type="date"
                value={form.effective_from}
                onChange={(e) => set("effective_from", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="สิ้นสุด">
              <input
                type="date"
                value={form.effective_to}
                onChange={(e) => set("effective_to", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="หมายเหตุ">
            <textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            เปิดใช้งานกฎนี้
          </label>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            disabled={saving || !form.name}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

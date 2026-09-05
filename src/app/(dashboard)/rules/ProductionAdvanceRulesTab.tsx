"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/Badge";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  ProductionAdvanceRule,
  ProductionAdvanceRuleScope,
  ProductionAdvanceMetricType,
  ProductionRateItemBrief,
} from "@/lib/advance";
import { Loader2, Target, Plus, X, Edit, Trash2, AlertCircle, Search } from "lucide-react";

type Department = { id: number; code: string; name: string };

const CATEGORY_LABEL: Record<string, string> = {
  pae_front: "แพหน้า",
  pae_back: "แพหลัง",
  prestress: "อัดแรง",
  i15: "ไอ 15",
  i18: "ไอ 18",
  fence: "เสารั้ว",
  pile: "เสาเข็ม",
};

const WORK_TYPE_LABEL: Record<string, string> = {
  cast: "เท",
  lift: "ยก",
  cast_lift: "เท + ยก",
  flat: "อัตราเดียว",
};

function errMsg(e: unknown, fallback: string): string {
  return e instanceof ApiError && typeof e.data === "object" && e.data
    ? (e.data as { message?: string }).message ?? e.message
    : e instanceof Error
    ? e.message
    : fallback;
}

type RuleForm = {
  name: string;
  unit: string;
  target_qty: string;
  scope: ProductionAdvanceRuleScope;
  department_id: number | "";
  metric_type: ProductionAdvanceMetricType;
  applies_to_department_ids: number[];
  is_active: boolean;
  note: string;
  item_ids: number[];
};

const emptyRuleForm: RuleForm = {
  name: "",
  unit: "raft",
  target_qty: "",
  scope: "company",
  department_id: "",
  metric_type: "production_qty",
  applies_to_department_ids: [],
  is_active: true,
  note: "",
  item_ids: [],
};

export default function ProductionAdvanceRulesTab({ canManage }: { canManage: boolean }) {
  const [rules, setRules] = useState<ProductionAdvanceRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [items, setItems] = useState<ProductionRateItemBrief[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductionAdvanceRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyRuleForm);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  function loadRules() {
    setRulesLoading(true);
    apiFetch<{ data: ProductionAdvanceRule[] }>("/production-advance-rules")
      .then((r) => setRules(r.data))
      .catch(() => {})
      .finally(() => setRulesLoading(false));
  }

  useEffect(() => {
    loadRules();
    apiFetch<{ data: ProductionRateItemBrief[] }>("/payroll/production-rates?only_active=1")
      .then((r) => setItems(r.data))
      .catch(() => {});
    apiFetch<{ data: Department[] }>("/departments")
      .then((r) => setDepartments(r.data))
      .catch(() => {});
  }, []);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ProductionRateItemBrief[]>();
    for (const it of items) {
      const cat = it.category ?? "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(it);
    }
    return map;
  }, [items]);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => r.name.toLowerCase().includes(q));
  }, [rules, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyRuleForm);
    setFormErr(null);
    setShowForm(true);
  }

  function openEdit(rule: ProductionAdvanceRule) {
    setEditing(rule);
    setForm({
      name: rule.name,
      unit: rule.unit,
      target_qty: rule.target_qty,
      scope: rule.scope,
      department_id: rule.department_id ?? "",
      metric_type: rule.metric_type ?? "production_qty",
      applies_to_department_ids: rule.applies_to_department_ids ?? [],
      is_active: rule.is_active,
      note: rule.note ?? "",
      item_ids: (rule.production_rate_items ?? []).map((i) => i.id),
    });
    setFormErr(null);
    setShowForm(true);
  }

  function toggleItem(id: number) {
    setForm((f) => ({
      ...f,
      item_ids: f.item_ids.includes(id) ? f.item_ids.filter((x) => x !== id) : [...f.item_ids, id],
    }));
  }

  function toggleAppliesToDept(id: number) {
    setForm((f) => ({
      ...f,
      applies_to_department_ids: f.applies_to_department_ids.includes(id)
        ? f.applies_to_department_ids.filter((x) => x !== id)
        : [...f.applies_to_department_ids, id],
    }));
  }

  async function submitRule() {
    if (!form.name.trim()) return setFormErr("กรุณากรอกชื่อเงื่อนไข");
    if (!form.target_qty || Number(form.target_qty) <= 0) return setFormErr("กรุณากรอกเป้าหมายให้ถูกต้อง");
    if (form.scope === "department" && !form.department_id) return setFormErr("กรุณาเลือกแผนก");
    if (form.metric_type === "production_qty" && form.item_ids.length === 0) {
      return setFormErr("กรุณาเลือกรายการผลิตที่ใช้นับยอดอย่างน้อย 1 รายการ");
    }

    setSubmitting(true);
    setFormErr(null);
    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim() || "raft",
        target_qty: Number(form.target_qty),
        scope: form.scope,
        department_id: form.scope === "department" ? form.department_id : null,
        metric_type: form.metric_type,
        applies_to_department_ids: form.applies_to_department_ids.length ? form.applies_to_department_ids : null,
        is_active: form.is_active,
        note: form.note || null,
        item_ids: form.metric_type === "production_qty" ? form.item_ids : [],
      };
      const path = editing ? `/production-advance-rules/${editing.id}` : "/production-advance-rules";
      await apiFetch(path, { method: editing ? "PUT" : "POST", body: payload });
      setShowForm(false);
      loadRules();
    } catch (e) {
      setFormErr(errMsg(e, "บันทึกไม่สำเร็จ"));
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRule(rule: ProductionAdvanceRule) {
    if (!confirm(`ลบเงื่อนไข "${rule.name}"?`)) return;
    try {
      await apiFetch(`/production-advance-rules/${rule.id}`, { method: "DELETE" });
      loadRules();
    } catch (e) {
      alert(errMsg(e, "ลบไม่สำเร็จ"));
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-50 text-primary-600 border border-primary-100 p-2">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">เงื่อนไขเป้าหมายผลิตก่อนเบิกเงิน</h3>
              <p className="text-sm text-muted">
                ต้องผลิตได้ตามเป้าหมายที่กำหนด (นับยอดวันนี้จาก Work Order) จึงจะเบิกเงินผ่านเครื่อง Tiger ได้
              </p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium hover:from-primary-600 hover:to-accent-600"
            >
              <Plus className="w-4 h-4" /> เพิ่มเงื่อนไข
            </button>
          )}
        </div>

        {rules.length > 0 && (
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อเงื่อนไข..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm"
            />
          </div>
        )}

        {rulesLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center text-muted py-8 text-sm">ยังไม่มีเงื่อนไข</div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center text-muted py-8 text-sm">ไม่พบเงื่อนไขที่ตรงกับ "{search}"</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-2">ชื่อเงื่อนไข</th>
                  <th className="px-3 py-2">เป้าหมาย</th>
                  <th className="px-3 py-2">วิธีนับ</th>
                  <th className="px-3 py-2">บังคับใช้กับแผนก</th>
                  <th className="px-3 py-2">รายการผลิตที่นับ</th>
                  <th className="px-3 py-2">สถานะ</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium">{r.name}</td>
                    <td className="px-3 py-3">{Number(r.target_qty).toLocaleString()} {r.unit}</td>
                    <td className="px-3 py-3 text-xs">
                      {r.metric_type === "attendance_days" ? "วันมาทำงาน" : "ยอดผลิต"}
                      {r.metric_type !== "attendance_days" && (
                        <div className="text-muted">{r.scope === "company" ? "ทั้งบริษัท" : `แผนก: ${r.department?.name ?? "-"}`}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">
                      {r.applies_to_department_ids?.length
                        ? departments.filter((d) => r.applies_to_department_ids!.includes(d.id)).map((d) => d.name).join(", ")
                        : "ทุกแผนก"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted max-w-xs">
                      {(r.production_rate_items ?? []).map((i) => i.name).join(", ") || "-"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge label={r.is_active ? "ใช้งาน" : "ปิดใช้งาน"} variant={r.is_active ? "success" : "default"} />
                    </td>
                    <td className="px-3 py-3">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(r)} className="p-1.5 text-gray-500 hover:text-primary-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteRule(r)} className="p-1.5 text-gray-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rule form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "แก้ไขเงื่อนไข" : "เพิ่มเงื่อนไข"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="ชื่อเงื่อนไข *">
                <input
                  className="payroll-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น เป้าหมายการผลิต (แผ่นพื้น)"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="เป้าหมาย (จำนวน) *">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="payroll-input"
                    value={form.target_qty}
                    onChange={(e) => setForm({ ...form, target_qty: e.target.value })}
                  />
                </Field>
                <Field label="หน่วย">
                  <input
                    className="payroll-input"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="แพ / เมตร / วัน"
                  />
                </Field>
              </div>

              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">วิธีนับยอด</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={form.metric_type === "production_qty"}
                      onChange={() => setForm({ ...form, metric_type: "production_qty" })}
                    />
                    ยอดผลิต (จาก Work Order)
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={form.metric_type === "attendance_days"}
                      onChange={() => setForm({ ...form, metric_type: "attendance_days" })}
                    />
                    วันมาทำงานของพนักงานคนนั้น (นับตั้งแต่ต้นงวดปัจจุบัน)
                  </label>
                </div>
              </div>

              {form.metric_type === "production_qty" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ขอบเขตการนับยอด">
                    <select
                      className="payroll-input"
                      value={form.scope}
                      onChange={(e) => setForm({ ...form, scope: e.target.value as ProductionAdvanceRuleScope })}
                    >
                      <option value="company">นับรวมทั้งบริษัท</option>
                      <option value="department">นับเฉพาะแผนกนี้</option>
                    </select>
                  </Field>
                  {form.scope === "department" && (
                    <Field label="แผนกที่นับยอด *">
                      <select
                        className="payroll-input"
                        value={form.department_id}
                        onChange={(e) => setForm({ ...form, department_id: e.target.value ? Number(e.target.value) : "" })}
                      >
                        <option value="">— เลือก —</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  บังคับใช้กับแผนก (เลือกได้หลายแผนก — เว้นว่าง = ทุกแผนก)
                </label>
                <div className="border border-border rounded-lg p-2 grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                  {departments.map((d) => (
                    <label key={d.id} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={form.applies_to_department_ids.includes(d.id)}
                        onChange={() => toggleAppliesToDept(d.id)}
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>

              {form.metric_type === "production_qty" && (
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  รายการผลิตที่ใช้นับยอด (เลือกได้หลายรายการ — รวมยอดจากทุกรายการที่เลือก) *
                </label>
                <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                  {[...itemsByCategory.entries()].map(([cat, catItems]) => (
                    <div key={cat} className="p-2">
                      <div className="text-xs font-semibold text-muted px-1 mb-1">{CATEGORY_LABEL[cat] ?? cat}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {catItems.map((it) => (
                          <label key={it.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={form.item_ids.includes(it.id)}
                              onChange={() => toggleItem(it.id)}
                            />
                            <span>{it.name} <span className="text-xs text-muted">({WORK_TYPE_LABEL[it.work_type] ?? it.work_type})</span></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              <Field label="หมายเหตุ">
                <textarea
                  className="payroll-input"
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                ใช้งานเงื่อนไขนี้
              </label>

              {formErr && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {formErr}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border">
                ยกเลิก
              </button>
              <button
                onClick={submitRule}
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
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { apiFetch } from "@/lib/api";
import { fmtDate, type PayrollPeriod, type PeriodStatus } from "@/lib/payroll";
import { useAuth } from "@/lib/auth-context";
import { Plus, Calendar, X, Loader2, FileText } from "lucide-react";

type PeriodForm = {
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  note?: string;
};

const STATUS_LABEL: Record<PeriodStatus, string> = {
  draft: "ร่าง",
  computing: "กำลังคำนวณ",
  pending_l1: "รอผู้จัดการอนุมัติ",
  pending_l2: "รอเจ้าของอนุมัติ",
  approved: "อนุมัติแล้ว",
  paid: "จ่ายเงินแล้ว",
  cancelled: "ยกเลิก",
};

const STATUS_VARIANT: Record<PeriodStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  computing: "info",
  pending_l1: "warning",
  pending_l2: "warning",
  approved: "info",
  paid: "success",
  cancelled: "default",
};

export default function PayrollPeriodsPage() {
  const { hasPermission } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<PeriodForm>({
    name: "",
    code: "",
    start_date: "",
    end_date: "",
    pay_date: "",
    note: "",
  });

  const canCreate = hasPermission("payroll.compute");

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { data: PayrollPeriod[] } }>("/payroll/periods?per_page=50");
      setPeriods(res.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await apiFetch("/payroll/periods", { method: "POST", body: form });
      setShowForm(false);
      setForm({ name: "", code: "", start_date: "", end_date: "", pay_date: "", note: "" });
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Topbar title="งวดจ่ายเงินเดือน" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">รายการงวดจ่ายเงินเดือน</h2>
            <p className="text-sm text-muted">สร้างงวดจ่ายได้หลายครั้งต่อเดือน • ห้ามวันที่ซ้ำกับพนักงานเดียวกัน</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25"
            >
              <Plus className="w-4 h-4" /> สร้างงวดใหม่
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : periods.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted/40 mb-3" />
            <p className="text-sm text-muted">ยังไม่มีงวดจ่ายเงินเดือน</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-4 py-3">รหัส</th>
                  <th className="px-4 py-3">ชื่องวด</th>
                  <th className="px-4 py-3">ช่วงวันที่</th>
                  <th className="px-4 py-3">วันจ่าย</th>
                  <th className="px-4 py-3 text-center">สลิป</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted">
                      {fmtDate(p.start_date)} – {fmtDate(p.end_date)}
                    </td>
                    <td className="px-4 py-3">{fmtDate(p.pay_date)}</td>
                    <td className="px-4 py-3 text-center">{p.slips_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge label={STATUS_LABEL[p.status]} variant={STATUS_VARIANT[p.status]} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/payroll/periods/${p.id}`}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" /> รายละเอียด
                      </Link>
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
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold">สร้างงวดจ่ายเงินเดือน</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {err && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{err}</div>}
              <Field label="ชื่องวด *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น งวด 1 พ.ค. 2569"
                  className="payroll-input"
                />
              </Field>
              <Field label="รหัสงวด *">
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="2026-05-A"
                  className="payroll-input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="เริ่มงวด *">
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="payroll-input"
                  />
                </Field>
                <Field label="สิ้นสุดงวด *">
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="payroll-input"
                  />
                </Field>
              </div>
              <Field label="วันที่จ่ายเงิน *">
                <input
                  type="date"
                  required
                  value={form.pay_date}
                  onChange={(e) => setForm({ ...form, pay_date: e.target.value })}
                  className="payroll-input"
                />
              </Field>
              <Field label="หมายเหตุ">
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="payroll-input min-h-[80px]"
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                สร้างงวด
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

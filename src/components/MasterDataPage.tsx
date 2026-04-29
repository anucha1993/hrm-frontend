"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import Link from "next/link";
import { ArrowLeft, Plus, Edit2, Trash2, X, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export type MasterField = {
  key: string;
  label: string;
  type?: "text" | "textarea";
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
};

export type MasterRecord = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  [k: string]: unknown;
};

type Props = {
  title: string;
  endpoint: string; // e.g. "departments"
  extraFields?: MasterField[]; // beyond code+name+is_active
  codeMaxLength?: number;
};

export default function MasterDataPage({ title, endpoint, extraFields = [], codeMaxLength = 50 }: Props) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("master_data.manage");

  const [items, setItems] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ code: "", name: "", is_active: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await apiFetch<{ data: MasterRecord[] }>(`/${endpoint}?${params.toString()}`);
      setItems(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    const initial: Record<string, unknown> = { code: "", name: "", is_active: true };
    extraFields.forEach((f) => (initial[f.key] = ""));
    setForm(initial);
    setError(null);
    setShowModal(true);
  }

  function openEdit(r: MasterRecord) {
    setForm({ ...r });
    setError(null);
    setShowModal(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const id = form.id as number | undefined;
      const body: Record<string, unknown> = { ...form };
      delete body.id;
      if (id) {
        await apiFetch(`/${endpoint}/${id}`, { method: "PUT", body });
      } else {
        await apiFetch(`/${endpoint}`, { method: "POST", body });
      }
      setShowModal(false);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { errors?: Record<string, string[]>; message?: string } | undefined;
        const fieldErr = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
        setError(fieldErr || data?.message || err.message);
      } else {
        setError("บันทึกไม่สำเร็จ");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(r: MasterRecord) {
    if (!confirm(`ลบ "${r.name}" ?`)) return;
    try {
      await apiFetch(`/${endpoint}/${r.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string } | undefined;
        alert(data?.message || err.message);
      } else {
        alert("ลบไม่สำเร็จ");
      }
    }
  }

  return (
    <>
      <Topbar title={title} />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-2 rounded-lg hover:bg-white border border-border">
              <ArrowLeft className="w-4 h-4 text-muted" />
            </Link>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          {canManage && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> เพิ่มข้อมูล
            </button>
          )}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white"
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
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">รหัส</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">ชื่อ</th>
                    {extraFields.map((f) => (
                      <th key={f.key} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                        {f.label}
                      </th>
                    ))}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">สถานะ</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5 + extraFields.length} className="px-5 py-10 text-center text-sm text-muted">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.id} className="hover:bg-surface/50">
                        <td className="px-5 py-3 text-sm font-mono text-foreground">{r.code}</td>
                        <td className="px-5 py-3 text-sm font-medium text-foreground">{r.name}</td>
                        {extraFields.map((f) => (
                          <td key={f.key} className="px-5 py-3 text-sm text-muted">
                            {(r[f.key] as string) ?? "-"}
                          </td>
                        ))}
                        <td className="px-5 py-3">
                          <Badge
                            label={r.is_active ? "เปิดใช้" : "ปิดใช้"}
                            variant={r.is_active ? "success" : "default"}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {canManage && (
                              <>
                                <button
                                  onClick={() => openEdit(r)}
                                  className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => remove(r)}
                                  className="p-1.5 rounded-lg hover:bg-accent-50 text-accent-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {form.id ? "แก้ไขข้อมูล" : "เพิ่มข้อมูล"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-surface text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">รหัส</label>
                <input
                  required
                  maxLength={codeMaxLength}
                  value={(form.code as string) ?? ""}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">ชื่อ</label>
                <input
                  required
                  value={(form.name as string) ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                />
              </div>
              {extraFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-foreground mb-1">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      rows={3}
                      maxLength={f.maxLength}
                      value={(form[f.key] as string) ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                    />
                  ) : (
                    <input
                      maxLength={f.maxLength}
                      value={(form[f.key] as string) ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                    />
                  )}
                </div>
              ))}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span className="text-sm text-foreground">เปิดใช้งาน</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

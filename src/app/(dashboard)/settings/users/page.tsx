"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { ArrowLeft, Plus, Search, Edit2, Trash2, Shield, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Paginated, Role, User } from "@/lib/types";

type UserForm = {
  id?: number;
  name: string;
  email: string;
  password: string;
  role_id: number | "";
  is_active: boolean;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role_id: "",
  is_active: true,
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("users.create");
  const canUpdate = hasPermission("users.update");
  const canDelete = hasPermission("users.delete");

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "50" });
      if (search) params.set("search", search);
      const [usersRes, rolesRes] = await Promise.all([
        apiFetch<{ data: Paginated<User> }>(`/users?${params.toString()}`),
        apiFetch<{ data: Role[] }>("/roles").catch(() => ({ data: [] as Role[] })),
      ]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = users.length;
    const byRole = users.reduce<Record<string, number>>((acc, u) => {
      const k = u.role?.display_name ?? "ไม่ระบุ";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    return { total, byRole };
  }, [users]);

  function openCreate() {
    setForm({ ...emptyForm, role_id: roles[0]?.id ?? "" });
    setError(null);
    setShowModal(true);
  }

  function openEdit(u: User) {
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      password: "",
      role_id: u.role?.id ?? "",
      is_active: u.is_active,
    });
    setError(null);
    setShowModal(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.role_id) {
      setError("กรุณาเลือกบทบาท");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role_id: form.role_id,
        is_active: form.is_active,
      };
      if (form.password) body.password = form.password;

      if (form.id) {
        await apiFetch(`/users/${form.id}`, { method: "PUT", body });
      } else {
        body.password = form.password || "password";
        await apiFetch("/users", { method: "POST", body });
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

  async function remove(u: User) {
    if (!confirm(`ลบผู้ใช้ "${u.name}" ?`)) return;
    try {
      await apiFetch(`/users/${u.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="จัดการผู้ใช้งาน" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-2 rounded-lg hover:bg-white border border-border">
              <ArrowLeft className="w-4 h-4 text-muted" />
            </Link>
            <h3 className="text-lg font-semibold text-foreground">จัดการผู้ใช้งาน</h3>
          </div>
          {canCreate && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งาน
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary-50 text-primary-600 rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <div>
              <p className="text-xs opacity-70">ผู้ใช้ทั้งหมด</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
          {Object.entries(stats.byRole).slice(0, 2).map(([name, count]) => (
            <div key={name} className="bg-blue-50 text-blue-600 rounded-xl p-4 flex items-center gap-3">
              <Shield className="w-5 h-5" />
              <div>
                <p className="text-xs opacity-70">{name}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาผู้ใช้งาน..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white"
          />
        </div>

        {/* Table */}
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
                    {["ชื่อ", "อีเมล", "บทบาท", "สถานะ", "จัดการ"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                        ไม่พบข้อมูลผู้ใช้
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-surface/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted">{u.email}</td>
                        <td className="px-5 py-3">
                          <Badge
                            label={u.role?.display_name ?? "-"}
                            variant={
                              u.role?.name === "super_admin"
                                ? "warning"
                                : u.role?.name === "admin"
                                  ? "info"
                                  : "default"
                            }
                          />
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            label={u.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                            variant={u.is_active ? "success" : "default"}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {canUpdate && (
                              <button
                                onClick={() => openEdit(u)}
                                className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => remove(u)}
                                className="p-1.5 rounded-lg hover:bg-accent-50 text-accent-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {form.id ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"}
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
                <label className="block text-sm font-medium text-foreground mb-1">ชื่อ</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">อีเมล</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  รหัสผ่าน {form.id && <span className="text-muted text-xs">(เว้นว่างถ้าไม่เปลี่ยน)</span>}
                </label>
                <input
                  type="password"
                  required={!form.id}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">บทบาท</label>
                <select
                  required
                  value={form.role_id}
                  onChange={(e) =>
                    setForm({ ...form, role_id: e.target.value ? Number(e.target.value) : "" })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white"
                >
                  <option value="">— เลือกบทบาท —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span>ใช้งาน</span>
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

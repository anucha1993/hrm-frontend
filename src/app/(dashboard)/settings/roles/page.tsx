"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { ArrowLeft, Plus, Edit2, Shield, Trash2, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Permission, Role } from "@/lib/types";

type RoleForm = {
  id?: number;
  name: string;
  display_name: string;
  description: string;
  permission_ids: Set<number>;
  is_system?: boolean;
};

const emptyForm: RoleForm = {
  name: "",
  display_name: "",
  description: "",
  permission_ids: new Set(),
};

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("roles.create");
  const canUpdate = hasPermission("roles.update");
  const canDelete = hasPermission("roles.delete");

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiFetch<{ data: Role[] }>("/roles"),
        apiFetch<{ data: Record<string, Permission[]> }>("/permissions"),
      ]);
      setRoles(rolesRes.data);
      setPermissionGroups(permsRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({ ...emptyForm, permission_ids: new Set() });
    setError(null);
    setShowModal(true);
  }

  function openEdit(role: Role) {
    setForm({
      id: role.id,
      name: role.name,
      display_name: role.display_name,
      description: role.description ?? "",
      permission_ids: new Set((role.permissions ?? []).map((p) => p.id)),
      is_system: role.is_system,
    });
    setError(null);
    setShowModal(true);
  }

  function togglePerm(id: number) {
    const next = new Set(form.permission_ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setForm({ ...form, permission_ids: next });
  }

  function toggleGroup(perms: Permission[]) {
    const next = new Set(form.permission_ids);
    const allSelected = perms.every((p) => next.has(p.id));
    if (allSelected) perms.forEach((p) => next.delete(p.id));
    else perms.forEach((p) => next.add(p.id));
    setForm({ ...form, permission_ids: next });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        display_name: form.display_name,
        description: form.description,
        permissions: Array.from(form.permission_ids),
      };
      if (form.id) {
        await apiFetch(`/roles/${form.id}`, { method: "PUT", body });
      } else {
        await apiFetch("/roles", { method: "POST", body });
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

  async function remove(role: Role) {
    if (!confirm(`ลบบทบาท "${role.display_name}" ?`)) return;
    try {
      await apiFetch(`/roles/${role.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="จัดการสิทธิ์" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-2 rounded-lg hover:bg-white border border-border">
              <ArrowLeft className="w-4 h-4 text-muted" />
            </Link>
            <h3 className="text-lg font-semibold text-foreground">จัดการสิทธิ์และบทบาท</h3>
          </div>
          {canCreate && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> เพิ่มบทบาท
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      role.name === "super_admin"
                        ? "bg-amber-50 text-amber-600"
                        : role.name === "admin"
                          ? "bg-primary-50 text-primary-600"
                          : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{role.display_name}</h4>
                      <Badge label={`${role.users_count ?? 0} ผู้ใช้`} variant="info" />
                      {role.is_system && <Badge label="ระบบ" variant="warning" />}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(role)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-muted hover:bg-surface"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> แก้ไข
                    </button>
                  )}
                  {canDelete && !role.is_system && (
                    <button
                      onClick={() => remove(role)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> ลบ
                    </button>
                  )}
                </div>
              </div>
              <div className="p-5">
                {role.name === "super_admin" ? (
                  <p className="text-sm text-muted">มีสิทธิ์เข้าถึงทุกฟังก์ชันโดยอัตโนมัติ</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(role.permissions ?? []).length === 0 ? (
                      <span className="text-sm text-muted">ยังไม่ได้กำหนดสิทธิ์</span>
                    ) : (
                      role.permissions!.map((p) => (
                        <span
                          key={p.id}
                          className="px-2.5 py-1 rounded-md bg-surface border border-border text-xs text-foreground"
                        >
                          {p.display_name}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {form.id ? "แก้ไขบทบาท" : "เพิ่มบทบาท"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-surface text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="overflow-y-auto p-6 space-y-4 flex-1">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    รหัส (a-z, 0-9, _)
                  </label>
                  <input
                    required
                    pattern="[a-z0-9_]+"
                    disabled={form.is_system}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm disabled:bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">ชื่อแสดง</label>
                  <input
                    required
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">คำอธิบาย</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">สิทธิ์การใช้งาน</label>
                {form.name === "super_admin" ? (
                  <p className="text-sm text-muted">Super Admin มีสิทธิ์ทั้งหมดโดยอัตโนมัติ</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(permissionGroups).map(([group, perms]) => {
                      const allSelected = perms.every((p) => form.permission_ids.has(p.id));
                      return (
                        <div key={group} className="border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-foreground capitalize">{group}</p>
                            <button
                              type="button"
                              onClick={() => toggleGroup(perms)}
                              className="text-xs text-primary-600 hover:underline"
                            >
                              {allSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {perms.map((p) => (
                              <label
                                key={p.id}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permission_ids.has(p.id)}
                                  onChange={() => togglePerm(p.id)}
                                />
                                <span>{p.display_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </form>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold disabled:opacity-60"
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

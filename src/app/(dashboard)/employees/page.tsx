"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import Link from "next/link";
import { Plus, Search, Edit2, Trash2, Eye, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Department, Employee, EmployeeStatus, EmploymentType, Paginated } from "@/lib/types";

const STATUS_LABEL: Record<EmployeeStatus, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  active: { label: "ทำงาน", variant: "success" },
  suspended: { label: "พักงาน", variant: "warning" },
  resigned: { label: "ลาออก", variant: "default" },
  terminated: { label: "เลิกจ้าง", variant: "danger" },
};

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("employees.create");
  const canUpdate = hasPermission("employees.update");
  const canDelete = hasPermission("employees.delete");

  const [items, setItems] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [types, setTypes] = useState<EmploymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [employmentTypeId, setEmploymentTypeId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "50" });
      if (search) params.set("search", search);
      if (departmentId) params.set("department_id", departmentId);
      if (employmentTypeId) params.set("employment_type_id", employmentTypeId);
      if (status) params.set("status", status);
      const res = await apiFetch<{ data: Paginated<Employee> }>(`/employees?${params.toString()}`);
      setItems(res.data.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, departmentId, employmentTypeId, status]);

  useEffect(() => {
    apiFetch<{ data: Department[] }>("/departments").then((r) => setDepartments(r.data)).catch(() => undefined);
    apiFetch<{ data: EmploymentType[] }>("/employment-types").then((r) => setTypes(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(e: Employee) {
    if (!confirm(`ลบพนักงาน "${e.full_name}" ?`)) return;
    try {
      await apiFetch(`/employees/${e.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="รายชื่อพนักงาน" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground">รายชื่อพนักงาน</h3>
          {canCreate && (
            <Link
              href="/employees/create"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> เพิ่มพนักงาน
            </Link>
          )}
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, เลขบัตร..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white"
            />
          </div>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
          >
            <option value="">ทุกแผนก</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={employmentTypeId}
            onChange={(e) => setEmploymentTypeId(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
          >
            <option value="">ทุกประเภทการจ้าง</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">ทำงาน</option>
            <option value="suspended">พักงาน</option>
            <option value="resigned">ลาออก</option>
            <option value="terminated">เลิกจ้าง</option>
          </select>
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
                    {["รหัส", "ชื่อ-นามสกุล", "อายุ", "แผนก", "ประเภทการจ้าง", "ตำแหน่ง", "เบอร์", "สถานะ", "จัดการ"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    items.map((e) => {
                      const st = STATUS_LABEL[e.status];
                      return (
                        <tr key={e.id} className="hover:bg-surface/50">
                          <td className="px-4 py-3 text-sm font-mono text-foreground">{e.employee_code}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">
                                {e.first_name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{e.full_name}</p>
                                {e.nickname && <p className="text-xs text-muted">({e.nickname})</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted">{e.age ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted">{e.department?.name ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted">{e.employment_type?.name ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted">{e.position ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted">{e.phone ?? "-"}</td>
                          <td className="px-4 py-3">
                            <Badge label={st.label} variant={st.variant} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/employees/${e.id}/edit`}
                                className="p-1.5 rounded-lg hover:bg-surface text-muted"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {canUpdate && (
                                <Link
                                  href={`/employees/${e.id}/edit`}
                                  className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Link>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => remove(e)}
                                  className="p-1.5 rounded-lg hover:bg-accent-50 text-accent-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

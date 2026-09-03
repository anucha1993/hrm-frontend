"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/Badge";
import { apiFetch, apiDownload, ApiError } from "@/lib/api";
import { Attendance, AttendanceAuditLog, AttendanceRosterRow, Employee, WorkShift, OfficeLocation, Department } from "@/lib/types";
import { LogIn, LogOut, AlertTriangle, X, Filter, RefreshCw, Plus, Edit2, Trash2, History, Loader2, Wand2, Download, Upload, Fingerprint } from "lucide-react";
import AttendanceImportModal from "@/components/attendance/AttendanceImportModal";
import EmployeeCombobox from "@/components/EmployeeCombobox";

function dayStatusInfo(s: AttendanceRosterRow["day_status"]) {
  const map: Record<AttendanceRosterRow["day_status"], { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    normal: { label: "ปกติ", variant: "success" },
    late: { label: "สาย", variant: "warning" },
    early_leave: { label: "ออกก่อนเวลา", variant: "warning" },
    overtime: { label: "ทำงานล่วงเวลา", variant: "info" },
    leave: { label: "ลา", variant: "info" },
    holiday: { label: "วันหยุด", variant: "default" },
    day_off: { label: "วันหยุดประจำสัปดาห์", variant: "default" },
    absent: { label: "ขาดงาน", variant: "danger" },
    upcoming: { label: "ยังไม่ถึงวัน", variant: "default" },
    no_track: { label: "งานเหมา / ไม่บันทึกเวลา", variant: "info" },
  };
  return map[s] || map.normal;
}

const ALL_DAY_STATUSES: AttendanceRosterRow["day_status"][] = [
  "normal", "late", "early_leave", "overtime", "leave", "holiday", "day_off", "absent", "upcoming", "no_track",
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

type EditTarget = {
  id: number;
  employeeId: number;
  employeeName: string;
  type: "check_in" | "check_out";
  checked_at: string;
};

export default function AttendanceManagePage() {
  const [rows, setRows] = useState<AttendanceRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<AttendanceRosterRow["day_status"] | "">("");
  const [date, setDate] = useState(todayStr());
  const [importOpen, setImportOpen] = useState(false);

  // ===== Manual entry / edit / delete / audit =====
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EditTarget | null>(null);
  const [auditTarget, setAuditTarget] = useState<{ id: number } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const blankForm = {
    employee_id: "",
    type: "check_in" as "check_in" | "check_out",
    checked_at: "",
    work_shift_id: "",
    office_location_id: "",
    status: "normal" as Attendance["status"],
    late_minutes: "",
    note: "",
    reason: "",
  };
  const [form, setForm] = useState(blankForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (employeeId) params.set("employee_id", employeeId);
      if (departmentId) params.set("department_id", departmentId);
      const res = await apiFetch<{ data: { date: string; rows: AttendanceRosterRow[] } }>(`/attendance/roster?${params.toString()}`);
      setRows(res.data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [date, employeeId, departmentId]);

  useEffect(() => {
    apiFetch<{ data: { data: Employee[] } | Employee[] } | Employee[]>("/employees?per_page=500")
      .then((res) => {
        let list: Employee[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (Array.isArray(res.data)) {
          list = res.data;
        } else if (res.data && Array.isArray((res.data as { data: Employee[] }).data)) {
          list = (res.data as { data: Employee[] }).data;
        }
        setEmployees(list);
      })
      .catch(() => {});

    apiFetch<{ data: WorkShift[] }>("/work-shifts")
      .then((res) => setShifts(res.data || []))
      .catch(() => {});
    apiFetch<{ data: OfficeLocation[] }>("/office-locations")
      .then((res) => setOffices(res.data || []))
      .catch(() => {});
    apiFetch<{ data: Department[] }>("/departments")
      .then((res) => setDepartments(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = statusFilter ? rows.filter((r) => r.day_status === statusFilter) : rows;

  function openCreate(row?: AttendanceRosterRow, type: "check_in" | "check_out" = "check_in") {
    setForm({
      ...blankForm,
      employee_id: row ? String(row.employee.id) : "",
      type,
      checked_at: `${date}T${type === "check_in" ? "08:00" : "17:00"}`,
      work_shift_id: row?.shift ? String(row.shift.id) : "",
    });
    setFormErr(null);
    setShowCreate(true);
  }

  function openEdit(row: AttendanceRosterRow, type: "check_in" | "check_out") {
    const entry = type === "check_in" ? row.check_in : row.check_out;
    if (!entry) return;
    setEditTarget({
      id: entry.id,
      employeeId: row.employee.id,
      employeeName: `${row.employee.first_name} ${row.employee.last_name}`,
      type,
      checked_at: entry.checked_at,
    });
    setForm({
      employee_id: String(row.employee.id),
      type,
      checked_at: new Date(entry.checked_at).toISOString().slice(0, 16),
      work_shift_id: row.shift ? String(row.shift.id) : "",
      office_location_id: "",
      status: entry.status,
      late_minutes: entry.late_minutes != null ? String(entry.late_minutes) : "",
      note: "",
      reason: "",
    });
    setFormErr(null);
  }

  async function submitForm() {
    setBusy(true);
    setFormErr(null);
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        checked_at: form.checked_at ? new Date(form.checked_at).toISOString() : undefined,
        status: form.status,
        late_minutes: form.late_minutes ? Number(form.late_minutes) : null,
        work_shift_id: form.work_shift_id ? Number(form.work_shift_id) : null,
        office_location_id: form.office_location_id ? Number(form.office_location_id) : null,
        note: form.note || null,
        reason: form.reason,
      };
      if (showCreate) {
        body.employee_id = Number(form.employee_id);
        await apiFetch("/attendance/manual", { method: "POST", body });
      } else if (editTarget) {
        await apiFetch(`/attendance/${editTarget.id}`, { method: "PATCH", body });
      }
      setShowCreate(false);
      setEditTarget(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      setFormErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setFormErr(null);
    try {
      await apiFetch(`/attendance/${deleteTarget.id}`, {
        method: "DELETE",
        body: { reason: form.reason },
      });
      setDeleteTarget(null);
      setForm(blankForm);
      await load();
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function openAudit(id: number) {
    setAuditTarget({ id });
    setAuditLogs([]);
    try {
      const res = await apiFetch<{ data: AttendanceAuditLog[] }>(`/attendance/${id}/audit-logs`);
      setAuditLogs(res.data);
    } catch {
      // ignore
    }
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">จัดการเวลาทำงาน</h2>
          <p className="text-sm text-muted">ภาพรวมพนักงานทั้งหมด — 1 คน 1 แถวต่อวัน (เข้างาน/ออกงาน/ลา/ขาด/วันหยุด)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                await apiDownload(`/attendance/export`, `attendance-history-${date}.xlsx`, {
                  params: { from: date, to: date, employee_id: employeeId || undefined, department_id: departmentId || undefined },
                });
              } catch (e) {
                alert(e instanceof Error ? e.message : "ดาวน์โหลดไม่สำเร็จ");
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-border text-foreground rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">นำเข้า</span>
          </button>
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg text-sm font-semibold hover:from-primary-600 hover:to-accent-600"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">เพิ่มเวลาย้อนหลัง</span>
          </button>
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg text-sm hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted">
          <Filter className="w-4 h-4" />
          ตัวกรอง
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-muted mb-1">พนักงาน</label>
            <EmployeeCombobox
              employees={employees}
              value={employeeId}
              onChange={(id) => setEmployeeId(id)}
              placeholder="ทั้งหมด"
              clearLabel="ทั้งหมด"
              className="w-full px-3 py-2 pr-8 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">แผนก</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">ทั้งหมด</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">สถานะ</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceRosterRow["day_status"] | "")}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">ทั้งหมด</option>
              {ALL_DAY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {dayStatusInfo(s).label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => load()}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700"
            >
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">พนักงาน</th>
                <th className="px-4 py-3 text-left font-semibold">แผนก</th>
                <th className="px-4 py-3 text-left font-semibold">เข้างาน</th>
                <th className="px-4 py-3 text-left font-semibold">ออกงาน</th>
                <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">กำลังโหลด...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">ไม่พบข้อมูลพนักงาน</td></tr>
              ) : filteredRows.map((row) => {
                const ds = dayStatusInfo(row.day_status);
                return (
                  <tr key={row.employee.id} className="border-b border-border hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.employee.first_name} {row.employee.last_name}</div>
                      <div className="text-xs text-muted">{row.employee.employee_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.employee.department?.name
                        ? <span className="text-sm">{row.employee.department.name}</span>
                        : <span className="text-xs text-muted italic">ไม่ระบุ</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.check_in ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-emerald-700"><LogIn className="w-4 h-4" /> {fmtTime(row.check_in.checked_at)}</span>
                          {row.check_in.late_minutes ? <span className="text-xs text-muted">({row.check_in.late_minutes} นาที)</span> : null}
                          {row.check_in.source === "manual" ? (
                            <span title="เพิ่มย้อนหลังโดย HR"><Wand2 className="w-3 h-3 text-amber-600" /></span>
                          ) : (
                            <span title="ซิงค์อัตโนมัติจากเครื่องสแกน HIP Time"><Fingerprint className="w-3 h-3 text-teal-600" /></span>
                          )}
                          <button onClick={() => openEdit(row, "check_in")} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="แก้ไข">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openAudit(row.check_in!.id)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="ประวัติ">
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: row.check_in!.id, employeeId: row.employee.id, employeeName: `${row.employee.first_name} ${row.employee.last_name}`, type: "check_in", checked_at: row.check_in!.checked_at })}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : row.day_status === "leave" ? (
                        <span className="text-xs text-muted italic" title="วันลา ไม่สามารถเพิ่มเวลาเข้างานได้">- ลา -</span>
                      ) : (
                        <button onClick={() => openCreate(row, "check_in")} className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary-600" title="เพิ่มเวลาเข้างาน">
                          <Plus className="w-3.5 h-3.5" /> เพิ่ม
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.check_out ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-rose-700"><LogOut className="w-4 h-4" /> {fmtTime(row.check_out.checked_at)}</span>
                          {row.check_out.source === "manual" ? (
                            <span title="เพิ่มย้อนหลังโดย HR"><Wand2 className="w-3 h-3 text-amber-600" /></span>
                          ) : (
                            <span title="ซิงค์อัตโนมัติจากเครื่องสแกน HIP Time"><Fingerprint className="w-3 h-3 text-teal-600" /></span>
                          )}
                          <button onClick={() => openEdit(row, "check_out")} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="แก้ไข">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openAudit(row.check_out!.id)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="ประวัติ">
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: row.check_out!.id, employeeId: row.employee.id, employeeName: `${row.employee.first_name} ${row.employee.last_name}`, type: "check_out", checked_at: row.check_out!.checked_at })}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : row.day_status === "leave" ? (
                        <span className="text-xs text-muted italic" title="วันลา ไม่สามารถเพิ่มเวลาออกงานได้">- ลา -</span>
                      ) : (
                        <button onClick={() => openCreate(row, "check_out")} className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary-600" title="เพิ่มเวลาออกงาน">
                          <Plus className="w-3.5 h-3.5" /> เพิ่ม
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ds.variant} label={ds.label} />
                      {row.leave && <div className="text-xs text-muted mt-0.5">{row.leave.type}{row.leave.is_half_day ? " (ครึ่งวัน)" : ""}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {loading ? (
            <div className="px-4 py-8 text-center text-muted">กำลังโหลด...</div>
          ) : filteredRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted">ไม่พบข้อมูลพนักงาน</div>
          ) : filteredRows.map((row) => {
            const ds = dayStatusInfo(row.day_status);
            return (
              <div key={row.employee.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{row.employee.first_name} {row.employee.last_name}</div>
                    <div className="text-xs text-muted">{row.employee.employee_code}{row.employee.department?.name ? ` · ${row.employee.department.name}` : ""}</div>
                  </div>
                  <Badge variant={ds.variant} label={ds.label} />
                </div>
                <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <LogIn className="w-3.5 h-3.5" />
                    {row.check_in ? fmtTime(row.check_in.checked_at) : row.day_status === "leave" ? (
                      <span className="text-muted italic">- ลา -</span>
                    ) : (
                      <button onClick={() => openCreate(row, "check_in")} className="text-muted underline">เพิ่ม</button>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-rose-700">
                    <LogOut className="w-3.5 h-3.5" />
                    {row.check_out ? fmtTime(row.check_out.checked_at) : row.day_status === "leave" ? (
                      <span className="text-muted italic">- ลา -</span>
                    ) : (
                      <button onClick={() => openCreate(row, "check_out")} className="text-muted underline">เพิ่ม</button>
                    )}
                  </span>
                  {row.leave && <span className="text-muted">{row.leave.type}{row.leave.is_half_day ? " (ครึ่งวัน)" : ""}</span>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {row.check_in && (
                    <>
                      <button onClick={() => openEdit(row, "check_in")} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget({ id: row.check_in!.id, employeeId: row.employee.id, employeeName: `${row.employee.first_name} ${row.employee.last_name}`, type: "check_in", checked_at: row.check_in!.checked_at })} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                  {row.check_out && (
                    <>
                      <button onClick={() => openEdit(row, "check_out")} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget({ id: row.check_out!.id, employeeId: row.employee.id, employeeName: `${row.employee.first_name} ${row.employee.last_name}`, type: "check_out", checked_at: row.check_out!.checked_at })} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Import modal */}
      <AttendanceImportModal open={importOpen} onClose={() => setImportOpen(false)} onSuccess={load} />

      {/* Create / Edit modal */}
      {(showCreate || editTarget) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">
                {showCreate ? "เพิ่มเวลาย้อนหลัง" : `แก้ไขเวลา — ${editTarget?.employeeName}`}
              </h3>
              <button onClick={() => { setShowCreate(false); setEditTarget(null); }} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {showCreate && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">พนักงาน *</label>
                  <EmployeeCombobox
                    employees={employees}
                    value={form.employee_id}
                    onChange={(id) => setForm({ ...form, employee_id: id })}
                    className="w-full px-3 py-2 pr-8 border border-border rounded-lg text-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">ประเภท *</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "check_in" | "check_out" })}>
                    <option value="check_in">เข้างาน</option>
                    <option value="check_out">เลิกงาน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">วัน/เวลา *</label>
                  <input type="datetime-local" className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.checked_at} onChange={(e) => setForm({ ...form, checked_at: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">กะ</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.work_shift_id} onChange={(e) => setForm({ ...form, work_shift_id: e.target.value })}>
                    <option value="">— ตามกะปกติ —</option>
                    {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">สถานที่</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.office_location_id} onChange={(e) => setForm({ ...form, office_location_id: e.target.value })}>
                    <option value="">— ไม่ระบุ —</option>
                    {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">สถานะ</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Attendance["status"] })}>
                    <option value="normal">ปกติ</option>
                    <option value="late">สาย</option>
                    <option value="early_leave">ออกก่อนเวลา</option>
                    <option value="overtime">ทำงานล่วงเวลา</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">นาทีสาย</label>
                  <input type="number" min={0} className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.late_minutes} onChange={(e) => setForm({ ...form, late_minutes: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">หมายเหตุ</label>
                <input className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">เหตุผลการแก้ไข * <span className="text-muted font-normal">(บังคับ — เก็บใน audit log)</span></label>
                <textarea rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="เช่น พนักงานลืมลงเวลา / ระบบมีปัญหา" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              {formErr && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg p-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {formErr}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => { setShowCreate(false); setEditTarget(null); }} className="px-4 py-2 text-sm rounded-lg border border-border">ยกเลิก</button>
              <button
                onClick={submitForm}
                disabled={busy || !form.reason || (showCreate && !form.employee_id) || !form.checked_at}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-red-700">ยืนยันการลบเวลา</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm">
                ลบบันทึกเวลา <strong>{deleteTarget.type === "check_in" ? "เข้างาน" : "เลิกงาน"}</strong> ของ{" "}
                <strong>{deleteTarget.employeeName}</strong>{" "}
                เมื่อ {fmtDateTime(deleteTarget.checked_at)}?
              </p>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">เหตุผล *</label>
                <textarea rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              {formErr && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-2">{formErr}</div>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-border">ยกเลิก</button>
              <button onClick={submitDelete} disabled={busy || !form.reason} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit log modal */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">ประวัติการแก้ไข — เวลา #{auditTarget.id}</h3>
              <button onClick={() => setAuditTarget(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {auditLogs.length === 0 ? (
                <div className="text-muted text-center py-6">ยังไม่มีประวัติการแก้ไข</div>
              ) : auditLogs.map((log) => (
                <div key={log.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={log.action === "create" ? "success" : log.action === "delete" ? "danger" : "info"}
                      label={log.action === "create" ? "สร้าง" : log.action === "delete" ? "ลบ" : "แก้ไข"}
                    />
                    <span className="text-xs text-muted">โดย {log.user?.name ?? "-"} · {fmtDateTime(log.created_at)}</span>
                  </div>
                  {log.reason && <div className="text-xs text-foreground mb-2">เหตุผล: {log.reason}</div>}
                  {log.action === "update" && log.old_values && log.new_values && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-red-50 rounded p-2">
                        <div className="font-medium text-red-700 mb-1">เดิม</div>
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(log.old_values, null, 2)}</pre>
                      </div>
                      <div className="bg-green-50 rounded p-2">
                        <div className="font-medium text-green-700 mb-1">ใหม่</div>
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(log.new_values, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                  {(log.action === "create" || log.action === "delete") && (log.new_values || log.old_values) && (
                    <pre className="text-xs bg-gray-50 rounded p-2 whitespace-pre-wrap break-all">
                      {JSON.stringify(log.new_values ?? log.old_values, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

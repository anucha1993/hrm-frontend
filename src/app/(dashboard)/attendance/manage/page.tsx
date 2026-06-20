"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/Badge";
import { apiFetch, apiDownload, ApiError } from "@/lib/api";
import { Attendance, AttendanceAuditLog, Employee, WorkShift, OfficeLocation } from "@/lib/types";
import { LogIn, LogOut, MapPin, AlertTriangle, Image as ImageIcon, X, Filter, RefreshCw, Plus, Edit2, Trash2, History, Loader2, Wand2, Download, Upload } from "lucide-react";
import AttendanceImportModal from "@/components/attendance/AttendanceImportModal";

type Paginated<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number; per_page: number };
  current_page?: number;
  last_page?: number;
  total?: number;
  per_page?: number;
};

function statusInfo(s: Attendance["status"]) {
  const map: Record<Attendance["status"], { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
    normal: { label: "ปกติ", variant: "success" },
    late: { label: "สาย", variant: "warning" },
    early_leave: { label: "ออกก่อน", variant: "warning" },
    overtime: { label: "ทำงานล่วงเวลา", variant: "info" },
  };
  return map[s] || map.normal;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
function todayStr() {
  return new Date().toISOString().substring(0, 10);
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().substring(0, 10);
}

export default function AttendanceManagePage() {
  const [items, setItems] = useState<Attendance[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [from, setFrom] = useState(daysAgoStr(7));
  const [to, setTo] = useState(todayStr());
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // ===== Manual entry / edit / delete / audit =====
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [editTarget, setEditTarget] = useState<Attendance | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<Attendance | null>(null);
  const [auditTarget, setAuditTarget] = useState<Attendance | null>(null);
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
      const params = new URLSearchParams({ from, to, page: page.toString(), per_page: "30" });
      if (employeeId) params.set("employee_id", employeeId);
      if (type) params.set("type", type);
      const res = await apiFetch<{ data: Paginated<Attendance> } | Paginated<Attendance>>(`/attendance?${params.toString()}`);
      // backend wraps: { data: paginator }
      const paginator: Paginated<Attendance> =
        (res as { data: Paginated<Attendance> }).data && Array.isArray(((res as { data: Paginated<Attendance> }).data as Paginated<Attendance>).data)
          ? (res as { data: Paginated<Attendance> }).data
          : (res as Paginated<Attendance>);
      setItems(paginator.data || []);
      const m = paginator.meta || {
        current_page: paginator.current_page || 1,
        last_page: paginator.last_page || 1,
        total: paginator.total || 0,
        per_page: paginator.per_page || 30,
      };
      setMeta({ current_page: m.current_page, last_page: m.last_page, total: m.total });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [from, to, page, employeeId, type]);

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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({ ...blankForm, checked_at: new Date().toISOString().slice(0, 16) });
    setFormErr(null);
    setShowCreate(true);
  }

  function openEdit(a: Attendance) {
    setEditTarget(a);
    setForm({
      employee_id: String(a.employee_id),
      type: a.type,
      checked_at: a.checked_at ? new Date(a.checked_at).toISOString().slice(0, 16) : "",
      work_shift_id: a.work_shift_id ? String(a.work_shift_id) : "",
      office_location_id: a.office_location_id ? String(a.office_location_id) : "",
      status: a.status,
      late_minutes: a.late_minutes != null ? String(a.late_minutes) : "",
      note: a.note ?? "",
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
    if (!showDelete) return;
    setBusy(true);
    setFormErr(null);
    try {
      await apiFetch(`/attendance/${showDelete.id}`, {
        method: "DELETE",
        body: { reason: form.reason },
      });
      setShowDelete(null);
      setForm(blankForm);
      await load();
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function openAudit(a: Attendance) {
    setAuditTarget(a);
    setAuditLogs([]);
    try {
      const res = await apiFetch<{ data: AttendanceAuditLog[] }>(`/attendance/${a.id}/audit-logs`);
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
          <p className="text-sm text-muted">ดูภาพรวมการลงเวลาเข้า-ออกของพนักงานทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                await apiDownload(`/attendance/export`, `attendance-history-${from}-to-${to}.xlsx`, {
                  params: { from, to, employee_id: employeeId || undefined, type: type || undefined },
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
            onClick={openCreate}
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
            <select
              value={employeeId}
              onChange={(e) => { setPage(1); setEmployeeId(e.target.value); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">ทั้งหมด</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} - {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">ประเภท</label>
            <select
              value={type}
              onChange={(e) => { setPage(1); setType(e.target.value); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">ทั้งหมด</option>
              <option value="check_in">เข้างาน</option>
              <option value="check_out">เลิกงาน</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">ตั้งแต่</label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setPage(1); setFrom(e.target.value); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">ถึง</label>
            <input
              type="date"
              value={to}
              onChange={(e) => { setPage(1); setTo(e.target.value); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setPage(1); load(); }}
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
                <th className="px-4 py-3 text-left font-semibold">ประเภท</th>
                <th className="px-4 py-3 text-left font-semibold">เวลา</th>
                <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
                <th className="px-4 py-3 text-left font-semibold">สถานที่</th>
                <th className="px-4 py-3 text-center font-semibold">ภาพ</th>
                <th className="px-4 py-3 text-center font-semibold">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">กำลังโหลด...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">ไม่พบข้อมูล</td></tr>
              ) : items.map((a) => {
                const s = statusInfo(a.status);
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.employee?.first_name} {a.employee?.last_name}</div>
                      <div className="text-xs text-muted">{a.employee?.employee_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      {a.type === "check_in" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700"><LogIn className="w-4 h-4" /> เข้างาน</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700"><LogOut className="w-4 h-4" /> เลิกงาน</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{fmtDateTime(a.checked_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.variant} label={s.label} />
                      {a.late_minutes ? <span className="ml-1 text-xs text-muted">({a.late_minutes} นาที)</span> : null}
                      {a.source === "manual" && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="เพิ่มย้อนหลังโดย HR">
                          <Wand2 className="w-2.5 h-2.5" /> manual
                        </span>
                      )}
                      {a.is_edited && a.source !== "manual" && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800" title="แก้ไขแล้ว">edited</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <MapPin className="w-3 h-3 text-muted" />
                        {a.office_location?.name || <span className="text-muted italic">ไม่ระบุสถานที่</span>}
                        {a.outside_geofence && (
                          <span className="inline-flex items-center gap-1 text-amber-600 ml-1">
                            <AlertTriangle className="w-3 h-3" /> นอกพื้นที่
                          </span>
                        )}
                      </div>
                      {a.distance_m !== null && (
                        <div className="text-xs text-muted">ห่าง {a.distance_m} ม.</div>
                      )}
                      {a.latitude !== null && a.longitude !== null && (
                        <a
                          href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                          title="เปิดใน Google Maps"
                        >
                          {Number(a.latitude).toFixed(5)}, {Number(a.longitude).toFixed(5)}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.photo_url ? (
                        <button onClick={() => setPreview(a.photo_url)} className="inline-flex p-1.5 rounded hover:bg-gray-100">
                          <ImageIcon className="w-4 h-4 text-primary-600" />
                        </button>
                      ) : <span className="text-muted">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button onClick={() => openEdit(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="แก้ไข">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => openAudit(a)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="ประวัติการแก้ไข">
                        <History className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowDelete(a); setForm({ ...blankForm, reason: "" }); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="ลบ">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted">ไม่พบข้อมูล</div>
          ) : items.map((a) => {
            const s = statusInfo(a.status);
            return (
              <div key={a.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{a.employee?.first_name} {a.employee?.last_name}</div>
                    <div className="text-xs text-muted">{a.employee?.employee_code}</div>
                  </div>
                  {a.type === "check_in" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs"><LogIn className="w-3 h-3" />เข้า</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 text-xs"><LogOut className="w-3 h-3" />ออก</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted">{fmtDateTime(a.checked_at)}</div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant={s.variant} label={s.label} />
                  {a.outside_geofence && (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                      <AlertTriangle className="w-3 h-3" /> นอกพื้นที่
                    </span>
                  )}
                  {a.office_location?.name && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <MapPin className="w-3 h-3" /> {a.office_location.name}
                    </span>
                  )}
                  {!a.office_location?.name && a.latitude !== null && a.longitude !== null && (
                    <a
                      href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary-600"
                    >
                      <MapPin className="w-3 h-3" /> {Number(a.latitude).toFixed(4)}, {Number(a.longitude).toFixed(4)}
                    </a>
                  )}
                  {a.photo_url && (
                    <button onClick={() => setPreview(a.photo_url)} className="inline-flex items-center gap-1 text-xs text-primary-600 ml-auto">
                      <ImageIcon className="w-3 h-3" /> ดูภาพ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted">หน้า {meta.current_page} / {meta.last_page} (รวม {meta.total} รายการ)</span>
            <div className="flex gap-2">
              <button
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-border rounded disabled:opacity-50"
              >ก่อนหน้า</button>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-border rounded disabled:opacity-50"
              >ถัดไป</button>
            </div>
          </div>
        )}
      </div>

      {/* Image preview */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="attendance" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {/* Import modal */}
      <AttendanceImportModal open={importOpen} onClose={() => setImportOpen(false)} onSuccess={load} />

      {/* Create / Edit modal */}
      {(showCreate || editTarget) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">
                {showCreate ? "เพิ่มเวลาย้อนหลัง" : `แก้ไขเวลา #${editTarget?.id}`}
              </h3>
              <button onClick={() => { setShowCreate(false); setEditTarget(null); }} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {showCreate && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">พนักงาน *</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                    <option value="">— เลือก —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
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
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-red-700">ยืนยันการลบเวลา</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm">
                ลบบันทึกเวลา <strong>{showDelete.type === "check_in" ? "เข้างาน" : "เลิกงาน"}</strong> ของ{" "}
                <strong>{showDelete.employee?.first_name} {showDelete.employee?.last_name}</strong>{" "}
                เมื่อ {fmtDateTime(showDelete.checked_at)}?
              </p>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">เหตุผล *</label>
                <textarea rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              {formErr && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-2">{formErr}</div>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
              <button onClick={() => setShowDelete(null)} className="px-4 py-2 text-sm rounded-lg border border-border">ยกเลิก</button>
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

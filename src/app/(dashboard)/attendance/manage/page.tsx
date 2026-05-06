"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/Badge";
import { apiFetch } from "@/lib/api";
import { Attendance, Employee } from "@/lib/types";
import { LogIn, LogOut, MapPin, AlertTriangle, Image as ImageIcon, X, Filter, RefreshCw } from "lucide-react";

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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">จัดการเวลาทำงาน</h2>
          <p className="text-sm text-muted">ดูภาพรวมการลงเวลาเข้า-ออกของพนักงานทั้งหมด</p>
        </div>
        <button
          onClick={() => load()}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg text-sm hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">รีเฟรช</span>
        </button>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">กำลังโหลด...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">ไม่พบข้อมูล</td></tr>
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
    </div>
  );
}

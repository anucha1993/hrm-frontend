"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, AlertTriangle, CalendarPlus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Employee, WorkShift, OfficeLocation } from "@/lib/types";

type DayRow = {
  date: string;
  check_in: string;
  check_out: string;
  note: string;
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildRange(from: string, to: string, skipSunday: boolean, defaultIn: string, defaultOut: string): DayRow[] {
  if (!from || !to) return [];
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  if (start > end) return [];
  const rows: DayRow[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (skipSunday && d.getDay() === 0) continue;
    rows.push({ date: toDateStr(d), check_in: defaultIn, check_out: defaultOut, note: "" });
  }
  return rows;
}

export default function BulkManualEntryModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [empQuery, setEmpQuery] = useState("");
  const [from, setFrom] = useState(toDateStr(new Date()));
  const [to, setTo] = useState(toDateStr(new Date()));
  const [skipSunday, setSkipSunday] = useState(true);
  const [defaultIn, setDefaultIn] = useState("08:00");
  const [defaultOut, setDefaultOut] = useState("17:00");
  const [rows, setRows] = useState<DayRow[]>([]);
  const [workShiftId, setWorkShiftId] = useState("");
  const [officeLocationId, setOfficeLocationId] = useState("");
  const [reason, setReason] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; days: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    apiFetch<{ data: { data: Employee[] } | Employee[] } | Employee[]>("/employees?per_page=500&status=active")
      .then((res) => {
        let list: Employee[] = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res.data)) list = res.data;
        else if (res.data && Array.isArray((res.data as { data: Employee[] }).data)) list = (res.data as { data: Employee[] }).data;
        setEmployees(list);
      })
      .catch(() => {});
    apiFetch<{ data: WorkShift[] }>("/work-shifts").then((res) => setShifts(res.data || [])).catch(() => {});
    apiFetch<{ data: OfficeLocation[] }>("/office-locations").then((res) => setOffices(res.data || [])).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) {
      // reset when closed
      setEmployeeId(""); setEmpQuery(""); setRows([]); setReason(""); setErr(null); setResult(null);
    }
  }, [open]);

  const filteredEmployees = useMemo(() => {
    if (!empQuery.trim()) return employees;
    const q = empQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.employee_code.toLowerCase().includes(q) ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        (e.nickname ?? "").toLowerCase().includes(q)
    );
  }, [employees, empQuery]);

  function generateRows() {
    setRows(buildRange(from, to, skipSunday, defaultIn, defaultOut));
    setResult(null);
  }

  function updateRow(idx: number, patch: Partial<DayRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    setErr(null);
    if (!employeeId) { setErr("กรุณาเลือกพนักงาน"); return; }
    if (rows.length === 0) { setErr("กรุณาเพิ่มอย่างน้อย 1 วัน"); return; }
    if (!reason || reason.trim().length < 5) { setErr("กรุณาระบุเหตุผล อย่างน้อย 5 ตัวอักษร"); return; }
    const usableDays = rows.filter((r) => r.check_in || r.check_out);
    if (usableDays.length === 0) { setErr("แต่ละวันต้องมีเวลาเข้างานหรือเลิกงานอย่างน้อย 1 ค่า"); return; }

    setBusy(true);
    try {
      const res = await apiFetch<{ message: string; summary: { created: number; skipped: number; days: number } }>(
        "/attendance/manual-bulk",
        {
          method: "POST",
          body: {
            employee_id: Number(employeeId),
            reason: reason.trim(),
            work_shift_id: workShiftId ? Number(workShiftId) : null,
            office_location_id: officeLocationId ? Number(officeLocationId) : null,
            days: usableDays.map((r) => ({
              date: r.date,
              check_in: r.check_in || null,
              check_out: r.check_out || null,
              note: r.note || null,
            })),
          },
        }
      );
      setResult(res.summary);
      onSuccess();
    } catch (e) {
      const msg = e instanceof ApiError ? ((e.data as { message?: string } | null)?.message ?? e.message) : "บันทึกไม่สำเร็จ";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-semibold">เพิ่มเวลาย้อนหลัง — รายคนเดียว หลายวัน</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {/* Employee picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">พนักงาน *</label>
            <input
              type="text"
              placeholder="ค้นหารหัส/ชื่อ..."
              value={empQuery}
              onChange={(e) => setEmpQuery(e.target.value)}
              className="w-full mb-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              size={employeeId ? 1 : Math.min(6, Math.max(3, filteredEmployees.length))}
            >
              <option value="">— เลือกพนักงาน —</option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} — {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Range + defaults */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ตั้งแต่วันที่</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ถึงวันที่</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">เวลาเข้างาน (ค่าเริ่มต้น)</label>
              <input type="time" value={defaultIn} onChange={(e) => setDefaultIn(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">เวลาเลิกงาน (ค่าเริ่มต้น)</label>
              <input type="time" value={defaultOut} onChange={(e) => setDefaultOut(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={skipSunday} onChange={(e) => setSkipSunday(e.target.checked)} />
              ข้ามวันอาทิตย์
            </label>
            <button
              type="button"
              onClick={generateRows}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              สร้างรายการวันจากช่วงวันที่
            </button>
          </div>

          {/* Rows table */}
          {rows.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 text-left">วันที่</th>
                    <th className="px-2 py-1.5 text-left">เข้างาน</th>
                    <th className="px-2 py-1.5 text-left">เลิกงาน</th>
                    <th className="px-2 py-1.5 text-left">หมายเหตุ</th>
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, idx) => (
                    <tr key={r.date}>
                      <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                        {new Date(r.date + "T00:00:00").toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", weekday: "short" })}
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="time" value={r.check_in} onChange={(e) => updateRow(idx, { check_in: e.target.value })} className="px-2 py-1 border border-slate-300 rounded text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="time" value={r.check_out} onChange={(e) => updateRow(idx, { check_out: e.target.value })} className="px-2 py-1 border border-slate-300 rounded text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={r.note} onChange={(e) => updateRow(idx, { note: e.target.value })} placeholder="(ถ้ามี)" className="w-full px-2 py-1 border border-slate-300 rounded text-xs" />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button type="button" onClick={() => removeRow(idx)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Shared shift/office/reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">กะ (ใช้กับทุกวัน)</label>
              <select value={workShiftId} onChange={(e) => setWorkShiftId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">— ตามกะปกติ —</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">สถานที่ (ใช้กับทุกวัน)</label>
              <select value={officeLocationId} onChange={(e) => setOfficeLocationId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">— ไม่ระบุ —</option>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              เหตุผลการเพิ่มเวลาย้อนหลัง * <span className="font-normal text-slate-400">(บังคับ — เก็บใน audit log ทุกวัน)</span>
            </label>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น พนักงานลืมลงเวลาช่วง 1-5 ส.ค." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>

          {err && (
            <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {err}
            </div>
          )}
          {result && (
            <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-2">
              บันทึกสำเร็จ: สร้าง {result.created} รายการ, ข้าม (มีอยู่แล้ว) {result.skipped} รายการ จากทั้งหมด {result.days} วัน
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300">ปิด</button>
          <button
            onClick={submit}
            disabled={busy || rows.length === 0 || !employeeId}
            className="px-4 py-2 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            บันทึกทั้งหมด ({rows.length} วัน)
          </button>
        </div>
      </div>
    </div>
  );
}

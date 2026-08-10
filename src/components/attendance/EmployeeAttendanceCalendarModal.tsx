"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Clock, CalendarOff, CheckSquare, Square, Ban } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Attendance, ShiftDayOverride } from "@/lib/types";

const TZ = "Asia/Bangkok";
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function ymd(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD (Bangkok calendar day)
}
function hm(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
function monthLabel(d: Date) {
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", timeZone: TZ });
}
function apiErrMsg(e: unknown, fallback: string) {
  if (e instanceof ApiError) return (e.data as { message?: string } | null)?.message ?? e.message;
  return e instanceof Error ? e.message : fallback;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function isCompleteTime(v: string) {
  return v === "" || TIME_RE.test(v);
}

// Plain masked text field for HH:MM (24-hour). Native <input type="time"> was replaced because
// on 12-hour-locale browsers it silently keeps value="" until the AM/PM segment is picked too —
// which caused check-in times to be dropped without any error when only "08:00" was typed.
function TimeField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    onChange(digits.length >= 3 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
  }
  function handleBlur() {
    if (!value) return;
    const digits = value.replace(/\D/g, "");
    if (!digits) { onChange(""); return; }
    const h = Math.min(23, parseInt(digits.slice(0, 2) || "0", 10));
    const m = Math.min(59, parseInt(digits.slice(2, 4) || "0", 10));
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      maxLength={5}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}

type DayCell = {
  date: string; // YYYY-MM-DD
  inMonth: boolean;
  checkIn?: Attendance;
  checkOut?: Attendance;
  override?: ShiftDayOverride;
};


export default function EmployeeAttendanceCalendarModal({
  open,
  employee,
  initialMonth,
  onClose,
  onChanged,
}: {
  open: boolean;
  employee: { id: number; code: string; name: string } | null;
  initialMonth?: string; // YYYY-MM-DD, defaults calendar to this month
  onClose: () => void;
  onChanged: () => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [records, setRecords] = useState<Attendance[]>([]);
  const [overrides, setOverrides] = useState<ShiftDayOverride[]>([]);
  const [loading, setLoading] = useState(false);

  // multi-select mode (select many days to set the same time / mark as holiday at once)
  const [multiMode, setMultiMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [bulkCheckIn, setBulkCheckIn] = useState("");
  const [bulkCheckOut, setBulkCheckOut] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkIsOt, setBulkIsOt] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkErr, setBulkErr] = useState<string | null>(null);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  // single-day panel
  const [selected, setSelected] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [isOt, setIsOt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCursor(initialMonth ? new Date(initialMonth + "T00:00:00") : new Date());
    setSelected(null);
    setMultiMode(false);
    setSelectedDays(new Set());
    setErr(null);
    setMsg(null);
    setBulkErr(null);
    setBulkMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id]);

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const load = useCallback(async () => {
    if (!open || !employee) return;
    setLoading(true);
    setErr(null);
    try {
      const from = ymd(monthStart);
      const to = ymd(monthEnd);
      const [attRes, ovRes] = await Promise.all([
        apiFetch<{ data: { data: Attendance[] } }>(`/attendance?employee_id=${employee.id}&from=${from}&to=${to}&per_page=200`),
        apiFetch<{ data: ShiftDayOverride[] }>(`/shift-overrides?employee_id=${employee.id}&from=${from}&to=${to}`),
      ]);
      setRecords(attRes.data.data || []);
      setOverrides(ovRes.data || []);
    } catch (e) {
      setErr(apiErrMsg(e, "โหลดข้อมูลไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id, monthStart, monthEnd]);

  useEffect(() => { load(); }, [load]);

  const cells: DayCell[] = useMemo(() => {
    const byDate = new Map<string, { checkIn?: Attendance; checkOut?: Attendance }>();
    for (const r of records) {
      const key = ymd(new Date(r.checked_at));
      const entry = byDate.get(key) ?? {};
      if (r.type === "check_in") entry.checkIn = r; else entry.checkOut = r;
      byDate.set(key, entry);
    }
    const overrideByDate = new Map<string, ShiftDayOverride>();
    for (const o of overrides) overrideByDate.set(o.date.slice(0, 10), o);
    const firstWeekday = monthStart.getDay(); // 0=Sun
    const daysInMonth = monthEnd.getDate();
    const out: DayCell[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      const d = new Date(monthStart);
      d.setDate(d.getDate() - (firstWeekday - i));
      out.push({ date: ymd(d), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const key = ymd(d);
      const entry = byDate.get(key) ?? {};
      out.push({ date: key, inMonth: true, checkIn: entry.checkIn, checkOut: entry.checkOut, override: overrideByDate.get(key) });
    }
    while (out.length % 7 !== 0) {
      const last = new Date(out[out.length - 1].date + "T00:00:00");
      last.setDate(last.getDate() + 1);
      out.push({ date: ymd(last), inMonth: false });
    }
    return out;
  }, [records, overrides, monthStart, monthEnd, cursor]);

  function selectDay(cell: DayCell) {
    if (multiMode) {
      if (!cell.inMonth) return;
      setSelectedDays((prev) => {
        const next = new Set(prev);
        if (next.has(cell.date)) next.delete(cell.date); else next.add(cell.date);
        return next;
      });
      return;
    }
    setSelected(cell.date);
    setCheckIn(cell.checkIn ? hm(cell.checkIn.checked_at) : "");
    setCheckOut(cell.checkOut ? hm(cell.checkOut.checked_at) : "");
    setNote("");
    setReason("");
    setIsOt(cell.checkOut?.status === "overtime");
    setErr(null);
    setMsg(null);
  }

  function toggleMultiMode() {
    setMultiMode((m) => !m);
    setSelected(null);
    setSelectedDays(new Set());
    setBulkIsOt(false);
    setBulkErr(null);
    setBulkMsg(null);
  }

  const selectedCell = selected ? cells.find((c) => c.date === selected) : undefined;
  const selectedOverride = selectedCell?.override;

  async function submitDay() {
    if (!employee || !selected) return;
    setErr(null);
    if (!checkIn && !checkOut) { setErr("กรุณาระบุเวลาเข้างานหรือเลิกงานอย่างน้อย 1 ค่า"); return; }
    if (!isCompleteTime(checkIn) || !isCompleteTime(checkOut)) { setErr("รูปแบบเวลาไม่ครบ กรุณากรอกเป็น HH:MM เช่น 08:00"); return; }
    if (!reason || reason.trim().length < 5) { setErr("กรุณาระบุเหตุผล อย่างน้อย 5 ตัวอักษร"); return; }

    const existingIn = selectedCell?.checkIn;
    const existingOut = selectedCell?.checkOut;
    const outUnchanged = !!existingOut && checkOut === hm(existingOut.checked_at);
    const inUnchanged = !!existingIn && checkIn === hm(existingIn.checked_at);
    // เวลาออกงานไม่เปลี่ยน แต่ต้องการแก้สถานะ OT/หมายเหตุ -> ต้องแก้ไขรายการเดิม (สร้างใหม่จะถูกข้ามเพราะเวลาซ้ำ)
    const needsOtUpdate = outUnchanged && !!existingOut && (isOt !== (existingOut.status === "overtime") || note !== (existingOut.note ?? ""));
    const dayPayload: { date: string; check_in?: string; check_out?: string; note?: string | null; is_ot?: boolean } = { date: selected };
    let hasNewEntry = false;
    if (checkIn && !inUnchanged) { dayPayload.check_in = checkIn; hasNewEntry = true; }
    if (checkOut && !outUnchanged) { dayPayload.check_out = checkOut; dayPayload.is_ot = isOt; hasNewEntry = true; }
    if (hasNewEntry) dayPayload.note = note || null;

    if (!hasNewEntry && !needsOtUpdate) {
      setErr("ไม่มีการเปลี่ยนแปลงที่จะบันทึก (เวลาที่กรอกตรงกับข้อมูลเดิมอยู่แล้ว)");
      return;
    }

    setBusy(true);
    try {
      if (needsOtUpdate && existingOut) {
        await apiFetch(`/attendance/${existingOut.id}`, {
          method: "PATCH",
          body: { status: isOt ? "overtime" : "normal", note: note || null, reason: reason.trim() },
        });
      }
      let created = 0;
      let skipped = 0;
      if (hasNewEntry) {
        const res = await apiFetch<{ summary: { created: number; skipped: number } }>("/attendance/manual-bulk", {
          method: "POST",
          body: { employee_id: employee.id, reason: reason.trim(), days: [dayPayload] },
        });
        created = res.summary.created;
        skipped = res.summary.skipped;
      }
      setMsg(
        needsOtUpdate
          ? `บันทึกสำเร็จ (อัปเดตสถานะ OT/หมายเหตุของรายการเดิม${hasNewEntry ? ` + สร้าง ${created}, ข้าม ${skipped}` : ""})`
          : `บันทึกสำเร็จ (สร้าง ${created}, ข้าม ${skipped})`
      );
      setReason("");
      await load();
      onChanged();
    } catch (e) {
      setErr(apiErrMsg(e, "บันทึกไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  async function markDayOff(date: string, dayNote: string) {
    if (!employee) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch("/shift-overrides", {
        method: "POST",
        body: { employee_id: employee.id, date, is_day_off: true, note: dayNote || null },
      });
      setMsg("แจ้งเป็นวันหยุดเรียบร้อย");
      await load();
      onChanged();
    } catch (e) {
      setErr(apiErrMsg(e, "แจ้งวันหยุดไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  async function unmarkDayOff(overrideId: number) {
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/shift-overrides/${overrideId}`, { method: "DELETE" });
      setMsg("ยกเลิกวันหยุดเรียบร้อย");
      await load();
      onChanged();
    } catch (e) {
      setErr(apiErrMsg(e, "ยกเลิกไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  async function submitBulkTime() {
    if (!employee || selectedDays.size === 0) return;
    setBulkErr(null);
    if (!bulkCheckIn && !bulkCheckOut) { setBulkErr("กรุณาระบุเวลาเข้างานหรือเลิกงานอย่างน้อย 1 ค่า"); return; }
    if (!isCompleteTime(bulkCheckIn) || !isCompleteTime(bulkCheckOut)) { setBulkErr("รูปแบบเวลาไม่ครบ กรุณากรอกเป็น HH:MM เช่น 08:00"); return; }
    if (!bulkReason || bulkReason.trim().length < 5) { setBulkErr("กรุณาระบุเหตุผล อย่างน้อย 5 ตัวอักษร"); return; }
    setBulkBusy(true);
    try {
      const createDays: { date: string; check_in?: string; check_out?: string; note?: string | null; is_ot?: boolean }[] = [];
      let otUpdated = 0;
      let otUpdateFailed = 0;

      for (const date of Array.from(selectedDays).sort()) {
        const cell = cells.find((c) => c.date === date);
        const existingIn = cell?.checkIn;
        const existingOut = cell?.checkOut;
        const inUnchanged = !!existingIn && bulkCheckIn === hm(existingIn.checked_at);
        const outUnchanged = !!existingOut && bulkCheckOut === hm(existingOut.checked_at);

        // เวลาออกงานไม่เปลี่ยน แต่ต้องการแก้สถานะ OT -> ต้องแก้ไขรายการเดิม (สร้างใหม่จะถูกข้ามเพราะเวลาซ้ำ)
        if (outUnchanged && existingOut && bulkIsOt !== (existingOut.status === "overtime")) {
          try {
            await apiFetch(`/attendance/${existingOut.id}`, {
              method: "PATCH",
              body: { status: bulkIsOt ? "overtime" : "normal", note: bulkNote || null, reason: bulkReason.trim() },
            });
            otUpdated++;
          } catch {
            otUpdateFailed++;
          }
        }

        const day: { date: string; check_in?: string; check_out?: string; note?: string | null; is_ot?: boolean } = { date };
        let hasNewEntry = false;
        if (bulkCheckIn && !inUnchanged) { day.check_in = bulkCheckIn; hasNewEntry = true; }
        if (bulkCheckOut && !outUnchanged) { day.check_out = bulkCheckOut; day.is_ot = bulkIsOt; hasNewEntry = true; }
        if (hasNewEntry) { day.note = bulkNote || null; createDays.push(day); }
      }

      let created = 0;
      let skipped = 0;
      if (createDays.length > 0) {
        const res = await apiFetch<{ summary: { created: number; skipped: number } }>("/attendance/manual-bulk", {
          method: "POST",
          body: { employee_id: employee.id, reason: bulkReason.trim(), days: createDays },
        });
        created = res.summary.created;
        skipped = res.summary.skipped;
      }

      if (createDays.length === 0 && otUpdated === 0 && otUpdateFailed === 0) {
        setBulkMsg("ไม่มีการเปลี่ยนแปลงที่จะบันทึก (เวลาที่กรอกตรงกับข้อมูลเดิมของทุกวันที่เลือกอยู่แล้ว)");
      } else {
        setBulkMsg(
          `บันทึกสำเร็จ (สร้าง ${created}, ข้าม ${skipped}` +
          (otUpdated ? `, อัปเดต OT ${otUpdated} วัน` : "") +
          (otUpdateFailed ? `, อัปเดต OT ล้มเหลว ${otUpdateFailed} วัน` : "") +
          `) จาก ${selectedDays.size} วันที่เลือก`
        );
      }
      setSelectedDays(new Set());
      setBulkReason("");
      setBulkIsOt(false);
      await load();
      onChanged();
    } catch (e) {
      setBulkErr(apiErrMsg(e, "บันทึกไม่สำเร็จ"));
    } finally {
      setBulkBusy(false);
    }
  }

  async function submitBulkDayOff() {
    if (!employee || selectedDays.size === 0) return;
    setBulkErr(null);
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const date of Array.from(selectedDays).sort()) {
        try {
          await apiFetch("/shift-overrides", {
            method: "POST",
            body: { employee_id: employee.id, date, is_day_off: true, note: bulkNote || null },
          });
          ok++;
        } catch {
          fail++;
        }
      }
      setBulkMsg(`แจ้งวันหยุดสำเร็จ ${ok} วัน${fail > 0 ? `, ล้มเหลว ${fail} วัน` : ""}`);
      setSelectedDays(new Set());
      await load();
      onChanged();
    } finally {
      setBulkBusy(false);
    }
  }

  if (!open || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-semibold">ปฏิทินเวลางาน — {employee.code} {employee.name}</h3>
            <p className="text-xs text-slate-500">คลิกวันที่เพื่อเพิ่มเวลา / OT / แจ้งวันหยุด — หรือเปิดโหมดเลือกหลายวัน</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Month nav + multi-select toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold w-36 text-center">{monthLabel(cursor)}</span>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={toggleMultiMode}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                multiMode ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-300 bg-white hover:bg-slate-50"
              }`}
            >
              {multiMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              เลือกหลายวันพร้อมกัน
            </button>
          </div>

          {/* Calendar grid */}
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            )}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-1">
              {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c) => {
                const hasIn = !!c.checkIn;
                const hasOut = !!c.checkOut;
                const isLate = c.checkIn?.status === "late";
                const isOtDay = c.checkOut?.status === "overtime";
                const isDayOff = !!c.override?.is_day_off;
                const isSelected = multiMode ? selectedDays.has(c.date) : selected === c.date;
                return (
                  <button
                    key={c.date}
                    type="button"
                    onClick={() => selectDay(c)}
                    disabled={!c.inMonth}
                    className={`rounded-lg border p-1.5 text-left min-h-[64px] text-xs transition ${
                      !c.inMonth
                        ? "border-transparent text-slate-300 cursor-default"
                        : isSelected
                          ? "border-primary-500 ring-2 ring-primary-200 bg-primary-50"
                          : isDayOff
                            ? "border-orange-200 bg-orange-50 hover:bg-orange-100"
                            : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`font-medium ${isLate ? "text-amber-600" : ""}`}>
                      {Number(c.date.slice(-2))}
                    </div>
                    {c.inMonth && isDayOff && (
                      <div className="mt-1 text-orange-600 leading-tight font-medium">วันหยุด</div>
                    )}
                    {c.inMonth && (hasIn || hasOut) && (
                      <div className="mt-1 space-y-0.5">
                        {hasIn && <div className="text-emerald-700 leading-tight">เข้า {hm(c.checkIn!.checked_at)}</div>}
                        {hasOut && (
                          <div className={`leading-tight ${isOtDay ? "text-violet-700 font-medium" : "text-slate-600"}`}>
                            ออก {hm(c.checkOut!.checked_at)}{isOtDay ? " (OT)" : ""}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multi-select bulk panel */}
          {multiMode && (
            <div className="border border-primary-200 rounded-lg p-4 bg-primary-50/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm font-semibold">เลือกแล้ว {selectedDays.size} วัน</div>
                {selectedDays.size > 0 && (
                  <button type="button" onClick={() => setSelectedDays(new Set())} className="text-xs text-slate-500 hover:underline">
                    ล้างที่เลือก
                  </button>
                )}
              </div>
              {selectedDays.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedDays).sort().map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs">
                      {new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" })}
                      <button type="button" onClick={() => setSelectedDays((prev) => { const n = new Set(prev); n.delete(d); return n; })} className="text-slate-400 hover:text-rose-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">เวลาเข้างาน (ใช้กับทุกวันที่เลือก)</label>
                  <TimeField value={bulkCheckIn} onChange={setBulkCheckIn} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">เวลาเลิกงาน (ใช้กับทุกวันที่เลือก)</label>
                  <TimeField value={bulkCheckOut} onChange={setBulkCheckOut} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={bulkIsOt} onChange={(e) => setBulkIsOt(e.target.checked)} className="rounded border-slate-300" />
                ระบุว่าเป็นวัน OT (ล่วงเวลา) ทุกวันที่เลือก
              </label>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุ</label>
                <input type="text" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="(ถ้ามี)" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  เหตุผล (ใช้กับ &quot;บันทึกเวลา&quot;) * <span className="font-normal text-slate-400">(บังคับ — เก็บใน audit log)</span>
                </label>
                <input type="text" value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} placeholder="เช่น พนักงานลืมลงเวลาช่วงนี้" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>

              {bulkErr && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {bulkErr}
                </div>
              )}
              {bulkMsg && <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-2">{bulkMsg}</div>}

              <div className="flex justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={submitBulkDayOff}
                  disabled={bulkBusy || selectedDays.size === 0}
                  className="px-3 py-1.5 text-sm rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {bulkBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CalendarOff className="w-4 h-4" />
                  แจ้งเป็นวันหยุดทุกวันที่เลือก
                </button>
                <button
                  type="button"
                  onClick={submitBulkTime}
                  disabled={bulkBusy || selectedDays.size === 0}
                  className="px-4 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {bulkBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึกเวลาให้ทุกวันที่เลือก ({selectedDays.size})
                </button>
              </div>
            </div>
          )}

          {/* Single-day quick add/edit panel */}
          {!multiMode && selected && (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="w-4 h-4 text-primary-600" />
                วันที่ {new Date(selected + "T00:00:00").toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" })}
              </div>

              {selectedOverride?.is_day_off && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm flex items-center justify-between flex-wrap gap-2">
                  <span className="text-orange-700">วันนี้ถูกแจ้งเป็นวันหยุดแล้ว{selectedOverride.note ? ` — ${selectedOverride.note}` : ""}</span>
                  {selectedOverride.source === "manual" && (
                    <button type="button" onClick={() => unmarkDayOff(selectedOverride.id)} disabled={busy} className="px-2.5 py-1 rounded-lg border border-orange-300 text-orange-700 text-xs hover:bg-orange-100 disabled:opacity-50">
                      ยกเลิกวันหยุด
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">เวลาเข้างาน</label>
                  <TimeField value={checkIn} onChange={setCheckIn} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">เวลาเลิกงาน</label>
                  <TimeField value={checkOut} onChange={setCheckOut} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isOt} onChange={(e) => setIsOt(e.target.checked)} className="rounded border-slate-300" />
                ระบุว่าวันนี้เป็นวัน OT (ล่วงเวลา){selectedOverride?.is_day_off ? " — มาทำงานในวันหยุด" : ""}
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุ</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="(ถ้ามี)" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  เหตุผล (ใช้กับ &quot;บันทึกเวลา&quot;) * <span className="font-normal text-slate-400">(บังคับ — เก็บใน audit log)</span>
                </label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น พนักงานลืมลงเวลา" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>

              {err && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {err}
                </div>
              )}
              {msg && <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-2">{msg}</div>}

              <div className="flex justify-end gap-2 flex-wrap">
                <button type="button" onClick={() => setSelected(null)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300">ปิด</button>
                {!selectedOverride?.is_day_off && (
                  <button
                    type="button"
                    onClick={() => markDayOff(selected, note)}
                    disabled={busy}
                    className="px-3 py-1.5 text-sm rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    แจ้งเป็นวันหยุด
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitDay}
                  disabled={busy}
                  className="px-4 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึกเวลา
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


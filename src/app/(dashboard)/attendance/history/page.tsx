"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/Badge";
import { apiFetch } from "@/lib/api";
import { Attendance } from "@/lib/types";
import { LogIn, LogOut, MapPin, AlertTriangle, Image as ImageIcon, X } from "lucide-react";

type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
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

export default function AttendanceHistoryPage() {
  const [items, setItems] = useState<Attendance[]>([]);
  const [meta, setMeta] = useState<Paginated<Attendance>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(daysAgoStr(30));
  const [to, setTo] = useState(todayStr());
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, page: page.toString() });
      const data = await apiFetch<Paginated<Attendance>>(`/attendance/my-history?${params.toString()}`);
      setItems(data.data || []);
      setMeta(data.meta || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-4 py-4 space-y-4 max-w-md mx-auto">
      <h2 className="text-lg font-bold">ประวัติการลงเวลาของฉัน</h2>

        <div className="bg-white rounded-xl border border-border p-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">ตั้งแต่</label>
            <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">ถึง</label>
            <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <button onClick={() => load()} className="col-span-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">รีเฟรช</button>
        </div>

        {/* Mobile card list */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-xl border border-border p-6 text-center text-muted text-sm">กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-6 text-center text-muted text-sm">ไม่พบประวัติในช่วงนี้</div>
          ) : items.map((a) => {
            const st = statusInfo(a.status);
            return (
              <div key={a.id} className="bg-white rounded-xl border border-border p-3 flex gap-3">
                {a.photo_url ? (
                  <button onClick={() => setPreview(a.photo_url)} className="w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.photo_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-surface flex items-center justify-center text-muted shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    {a.type === "check_in" ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600"><LogIn className="w-4 h-4" /> เข้างาน</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-500"><LogOut className="w-4 h-4" /> ออกงาน</span>
                    )}
                    <Badge label={st.label} variant={st.variant} />
                  </div>
                  <div className="text-xs text-muted">{fmtDateTime(a.checked_at)}</div>
                  {a.office_location && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <MapPin className="w-3 h-3 text-muted" />
                      <span className="truncate">{a.office_location.name}</span>
                      {a.distance_m != null && <span className="text-muted">{a.distance_m.toFixed(0)}ม.</span>}
                      {a.outside_geofence && (
                        <span className="inline-flex items-center gap-1 text-red-600"><AlertTriangle className="w-3 h-3" /> นอกพื้นที่</span>
                      )}
                    </div>
                  )}
                  {a.note && <div className="text-xs text-muted truncate">{a.note}</div>}
                  {a.status === "late" && a.late_minutes ? <div className="text-xs text-amber-600">สาย {a.late_minutes} นาที</div> : null}
                </div>
              </div>
            );
          })}
        </div>

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted text-xs">หน้า {meta.current_page} / {meta.last_page} • {meta.total} รายการ</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50">ก่อน</button>
              <button disabled={page >= meta.last_page} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50">ถัด</button>
            </div>
          </div>
        )}

      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

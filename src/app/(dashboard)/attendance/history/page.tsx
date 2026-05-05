"use client";

import { useEffect, useState, useCallback } from "react";
import Topbar from "@/components/Topbar";
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
    <>
      <Topbar title="ประวัติการลงเวลาของฉัน" />
      <div className="p-6 space-y-4">
        <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">ตั้งแต่</label>
            <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">ถึง</label>
            <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <button onClick={() => load()} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">รีเฟรช</button>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border text-left text-xs font-semibold text-muted uppercase">
                <th className="px-5 py-3">รูป</th>
                <th className="px-5 py-3">วันเวลา</th>
                <th className="px-5 py-3">ประเภท</th>
                <th className="px-5 py-3">สถานะ</th>
                <th className="px-5 py-3">สถานที่</th>
                <th className="px-5 py-3">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">กำลังโหลด...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">ไม่พบประวัติในช่วงนี้</td></tr>
              ) : items.map((a) => {
                const st = statusInfo(a.status);
                return (
                  <tr key={a.id} className="hover:bg-surface/50">
                    <td className="px-5 py-3">
                      {a.photo_url ? (
                        <button onClick={() => setPreview(a.photo_url)} className="w-12 h-12 rounded-lg overflow-hidden border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.photo_url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-muted">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm">{fmtDateTime(a.checked_at)}</td>
                    <td className="px-5 py-3">
                      {a.type === "check_in" ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600"><LogIn className="w-3.5 h-3.5" /> เข้างาน</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-red-500"><LogOut className="w-3.5 h-3.5" /> ออกงาน</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge label={st.label} variant={st.variant} />
                      {a.status === "late" && a.late_minutes ? <span className="ml-2 text-xs text-amber-600">({a.late_minutes} นาที)</span> : null}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {a.office_location ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-muted" />{a.office_location.name}</span>
                          {a.distance_m != null && <span className="text-xs text-muted">{a.distance_m.toFixed(0)} ม.</span>}
                          {a.outside_geofence && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3 h-3" /> นอกพื้นที่</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">ไม่ระบุ</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted">{a.note || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted">หน้า {meta.current_page} / {meta.last_page} • {meta.total} รายการ</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50">ก่อนหน้า</button>
              <button disabled={page >= meta.last_page} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50">ถัดไป</button>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </>
  );
}

"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { Calendar, Download, Camera, Fingerprint } from "lucide-react";

const history = [
  { date: "20 เม.ย. 2026", day: "จันทร์", checkIn: "07:55", checkOut: "17:05", hours: "8:10", ot: "1:05", status: "ตรงเวลา", badge: "success" as const, method: "selfie" as const },
  { date: "19 เม.ย. 2026", day: "อาทิตย์", checkIn: "-", checkOut: "-", hours: "-", ot: "-", status: "วันหยุด", badge: "default" as const, method: "-" as const },
  { date: "18 เม.ย. 2026", day: "เสาร์", checkIn: "08:00", checkOut: "12:00", hours: "4:00", ot: "4:00", status: "OT", badge: "info" as const, method: "fingerprint" as const },
  { date: "17 เม.ย. 2026", day: "ศุกร์", checkIn: "08:00", checkOut: "17:00", hours: "8:00", ot: "-", status: "ตรงเวลา", badge: "success" as const, method: "fingerprint" as const },
  { date: "16 เม.ย. 2026", day: "พฤหัสบดี", checkIn: "08:20", checkOut: "17:00", hours: "7:40", ot: "-", status: "สาย", badge: "warning" as const, method: "selfie" as const },
  { date: "15 เม.ย. 2026", day: "พุธ", checkIn: "-", checkOut: "-", hours: "-", ot: "-", status: "ลา", badge: "info" as const, method: "-" as const },
  { date: "14 เม.ย. 2026", day: "อังคาร", checkIn: "-", checkOut: "-", hours: "-", ot: "-", status: "วันหยุด", badge: "default" as const, method: "-" as const },
  { date: "13 เม.ย. 2026", day: "จันทร์", checkIn: "-", checkOut: "-", hours: "-", ot: "-", status: "วันหยุด", badge: "default" as const, method: "-" as const },
];

export default function AttendanceHistoryPage() {
  return (
    <>
      <Topbar title="ประวัติเวลา" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground">ประวัติการลงเวลา</h3>
          <div className="flex items-center gap-3">
            <select className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm">
              <option>เมษายน 2026</option>
              <option>มีนาคม 2026</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface">
              <Download className="w-4 h-4" />
              ส่งออก
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "วันทำงาน", value: "15 วัน", color: "text-foreground" },
            { label: "ตรงเวลา", value: "12 วัน", color: "text-green-600" },
            { label: "สาย", value: "2 วัน", color: "text-yellow-600" },
            { label: "ลา", value: "1 วัน", color: "text-blue-600" },
            { label: "OT รวม", value: "5:05 ชม.", color: "text-primary-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="text-xs text-muted">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {["วันที่", "วัน", "ระบบ", "เวลาเข้า", "เวลาออก", "ชั่วโมงงาน", "OT", "สถานะ"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="px-5 py-4 text-sm text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted" />
                      {h.date}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted">{h.day}</td>
                    <td className="px-5 py-4">
                      {h.method === "selfie" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                          <Camera className="w-3 h-3" /> เซลฟี่
                        </span>
                      )}
                      {h.method === "fingerprint" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                          <Fingerprint className="w-3 h-3" /> สแกนนิ้ว
                        </span>
                      )}
                      {h.method === "-" && <span className="text-xs text-muted">-</span>}
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-foreground">{h.checkIn}</td>
                    <td className="px-5 py-4 text-sm font-mono text-foreground">{h.checkOut}</td>
                    <td className="px-5 py-4 text-sm font-mono text-muted">{h.hours}</td>
                    <td className="px-5 py-4 text-sm font-mono text-primary-600 font-medium">{h.ot}</td>
                    <td className="px-5 py-4"><Badge label={h.status} variant={h.badge} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

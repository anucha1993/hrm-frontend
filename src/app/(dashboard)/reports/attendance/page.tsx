"use client";

import Topbar from "@/components/Topbar";
import { ArrowLeft, Download, Clock, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import Link from "next/link";

export default function AttendanceReportPage() {
  return (
    <>
      <Topbar title="รายงานเวลางาน" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/reports" className="p-2 rounded-lg hover:bg-white border border-border"><ArrowLeft className="w-4 h-4 text-muted" /></Link>
            <h3 className="text-lg font-semibold text-foreground">รายงานเวลาทำงาน</h3>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm">
              <option>เมษายน 2026</option>
              <option>มีนาคม 2026</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold">
              <Download className="w-4 h-4" /> ดาวน์โหลด
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "วันทำงานรวม", value: "15 วัน", icon: Calendar, color: "bg-primary-50 text-primary-600" },
            { label: "ตรงเวลาเฉลี่ย", value: "91%", icon: CheckCircle, color: "bg-green-50 text-green-600" },
            { label: "สายเฉลี่ย", value: "6%", icon: AlertTriangle, color: "bg-yellow-50 text-yellow-600" },
            { label: "OT รวม", value: "340 ชม.", icon: Clock, color: "bg-blue-50 text-blue-600" },
          ].map((s) => { const Icon = s.icon; return (
            <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.color}`}>
              <Icon className="w-5 h-5" /><div><p className="text-xs opacity-70">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </div>
          ); })}
        </div>

        {/* Weekly Chart Mock */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4">สรุปรายสัปดาห์</h4>
          <div className="space-y-4">
            {[
              { week: "สัปดาห์ที่ 1", onTime: 125, late: 15, absent: 10, leave: 6 },
              { week: "สัปดาห์ที่ 2", onTime: 130, late: 12, absent: 8, leave: 6 },
              { week: "สัปดาห์ที่ 3", onTime: 128, late: 14, absent: 8, leave: 6 },
            ].map((w) => (
              <div key={w.week} className="flex items-center gap-4">
                <span className="text-sm text-muted w-28">{w.week}</span>
                <div className="flex-1 flex h-6 rounded-lg overflow-hidden">
                  <div className="bg-green-400 h-full" style={{ width: `${(w.onTime / 156) * 100}%` }} title={`ตรงเวลา ${w.onTime}`}></div>
                  <div className="bg-yellow-400 h-full" style={{ width: `${(w.late / 156) * 100}%` }} title={`สาย ${w.late}`}></div>
                  <div className="bg-red-400 h-full" style={{ width: `${(w.absent / 156) * 100}%` }} title={`ขาด ${w.absent}`}></div>
                  <div className="bg-blue-400 h-full" style={{ width: `${(w.leave / 156) * 100}%` }} title={`ลา ${w.leave}`}></div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-400"></div><span className="text-xs text-muted">ตรงเวลา</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-400"></div><span className="text-xs text-muted">สาย</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400"></div><span className="text-xs text-muted">ขาด</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-400"></div><span className="text-xs text-muted">ลา</span></div>
            </div>
          </div>
        </div>

        {/* Top Late */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4">พนักงานที่มาสายบ่อยที่สุด</h4>
          <div className="space-y-3">
            {[
              { name: "ประยุทธ์ มั่นคง", count: 5, dept: "ฝ่ายขาย" },
              { name: "ชัยวุฒิ แกร่ง", count: 4, dept: "ฝ่ายผลิต" },
              { name: "สมชาย ใจดี", count: 2, dept: "ฝ่ายผลิต" },
            ].map((e, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent-100 text-accent-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-muted">{e.dept}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-accent-600">{e.count} ครั้ง</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

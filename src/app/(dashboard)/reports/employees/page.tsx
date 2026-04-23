"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { ArrowLeft, Download, Users, Building2, UserCheck, UserX } from "lucide-react";
import Link from "next/link";

export default function EmployeesReportPage() {
  return (
    <>
      <Topbar title="รายงานพนักงาน" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 rounded-lg hover:bg-white border border-border"><ArrowLeft className="w-4 h-4 text-muted" /></Link>
          <h3 className="text-lg font-semibold text-foreground">รายงานข้อมูลพนักงาน</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "พนักงานทั้งหมด", value: "156", icon: Users, color: "bg-primary-50 text-primary-600" },
            { label: "ทำงานอยู่", value: "148", icon: UserCheck, color: "bg-green-50 text-green-600" },
            { label: "ลาพัก", value: "5", icon: UserX, color: "bg-yellow-50 text-yellow-600" },
            { label: "แผนกทั้งหมด", value: "6", icon: Building2, color: "bg-blue-50 text-blue-600" },
          ].map((s) => { const Icon = s.icon; return (
            <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.color}`}>
              <Icon className="w-5 h-5" /><div><p className="text-xs opacity-70">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </div>
          ); })}
        </div>

        {/* Department Chart Mock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-4">พนักงานตามแผนก</h4>
            <div className="space-y-3">
              {[
                { dept: "ฝ่ายผลิต", count: 60, pct: 38 },
                { dept: "ฝ่ายบัญชี", count: 20, pct: 13 },
                { dept: "ฝ่ายขาย", count: 30, pct: 19 },
                { dept: "ฝ่ายบุคคล", count: 10, pct: 6 },
                { dept: "ฝ่ายไอที", count: 16, pct: 10 },
                { dept: "ฝ่ายการตลาด", count: 20, pct: 13 },
              ].map((d) => (
                <div key={d.dept} className="flex items-center gap-3">
                  <span className="text-sm text-muted w-24">{d.dept}</span>
                  <div className="flex-1 bg-surface rounded-full h-4 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-400 to-accent-400 rounded-full" style={{ width: `${d.pct}%` }}></div>
                  </div>
                  <span className="text-sm font-semibold text-foreground w-16 text-right">{d.count} คน</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-4">สรุปสถิติ</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "อายุเฉลี่ย", value: "32 ปี" },
                { label: "อายุงานเฉลี่ย", value: "2.5 ปี" },
                { label: "เพศชาย", value: "85 คน" },
                { label: "เพศหญิง", value: "71 คน" },
                { label: "เข้าใหม่เดือนนี้", value: "3 คน" },
                { label: "ลาออกเดือนนี้", value: "1 คน" },
              ].map((s) => (
                <div key={s.label} className="bg-surface rounded-xl p-3">
                  <p className="text-xs text-muted">{s.label}</p>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold">
            <Download className="w-4 h-4" /> ดาวน์โหลดรายงาน
          </button>
        </div>
      </div>
    </>
  );
}

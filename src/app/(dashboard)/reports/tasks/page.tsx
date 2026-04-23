"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { ArrowLeft, Download, ClipboardList, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function TasksReportPage() {
  return (
    <>
      <Topbar title="รายงานงาน" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/reports" className="p-2 rounded-lg hover:bg-white border border-border"><ArrowLeft className="w-4 h-4 text-muted" /></Link>
            <h3 className="text-lg font-semibold text-foreground">รายงานงาน</h3>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold">
            <Download className="w-4 h-4" /> ดาวน์โหลด
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "งานทั้งหมด", value: "45", icon: ClipboardList, color: "bg-primary-50 text-primary-600" },
            { label: "เสร็จสิ้น", value: "28", icon: CheckCircle, color: "bg-green-50 text-green-600" },
            { label: "กำลังทำ", value: "12", icon: Clock, color: "bg-blue-50 text-blue-600" },
            { label: "เลยกำหนด", value: "5", icon: AlertCircle, color: "bg-accent-50 text-accent-600" },
          ].map((s) => { const Icon = s.icon; return (
            <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.color}`}>
              <Icon className="w-5 h-5" /><div><p className="text-xs opacity-70">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </div>
          ); })}
        </div>

        {/* Task Completion Rate */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4">อัตราส่งงานตรงเวลาตามพนักงาน</h4>
          <div className="space-y-3">
            {[
              { name: "สมชาย ใจดี", completed: 8, total: 10, rate: 80 },
              { name: "สมหญิง รักงาน", completed: 6, total: 6, rate: 100 },
              { name: "มนัส ทำดี", completed: 7, total: 8, rate: 88 },
              { name: "นภา สวยงาม", completed: 4, total: 5, rate: 80 },
              { name: "ประยุทธ์ มั่นคง", completed: 3, total: 6, rate: 50 },
            ].map((e) => (
              <div key={e.name} className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-40">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">{e.name[0]}</div>
                  <span className="text-sm text-foreground truncate">{e.name}</span>
                </div>
                <div className="flex-1 bg-surface rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${e.rate >= 80 ? "bg-green-500" : e.rate >= 60 ? "bg-yellow-500" : "bg-accent-500"}`}
                    style={{ width: `${e.rate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold w-16 text-right">{e.rate}%</span>
                <span className="text-xs text-muted w-20 text-right">{e.completed}/{e.total} งาน</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4">งานที่เลยกำหนด</h4>
          <div className="space-y-3">
            {[
              { title: "ตรวจสอบสต็อกสินค้า", assignee: "สมหญิง รักงาน", due: "22 เม.ย. 2026", days: 2 },
              { title: "ส่งรายงานภาษี", assignee: "สมหญิง รักงาน", due: "15 เม.ย. 2026", days: 5 },
              { title: "จัดเตรียมห้องประชุม", assignee: "ชัยวุฒิ แกร่ง", due: "18 เม.ย. 2026", days: 2 },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent-50 border border-accent-100">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted">{t.assignee} | กำหนด {t.due}</p>
                </div>
                <Badge label={`เลย ${t.days} วัน`} variant="danger" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

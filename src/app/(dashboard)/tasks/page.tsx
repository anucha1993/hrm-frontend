"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { Plus, Search, Eye, MessageSquare, CheckCircle, Clock, AlertCircle, Filter } from "lucide-react";

const tasks = [
  { id: "TSK001", title: "จัดทำรายงานประจำเดือน", assignee: "สมชาย ใจดี", assigner: "วิภา สดใส", due: "25 เม.ย. 2026", priority: "สูง", priorityBadge: "danger" as const, status: "กำลังดำเนินการ", statusBadge: "info" as const, progress: 65 },
  { id: "TSK002", title: "ตรวจสอบสต็อกสินค้า", assignee: "สมหญิง รักงาน", assigner: "วิภา สดใส", due: "22 เม.ย. 2026", priority: "สูง", priorityBadge: "danger" as const, status: "ใกล้ครบกำหนด", statusBadge: "warning" as const, progress: 80 },
  { id: "TSK003", title: "อบรมพนักงานใหม่", assignee: "วิภา สดใส", assigner: "Admin", due: "30 เม.ย. 2026", priority: "ปานกลาง", priorityBadge: "warning" as const, status: "ยังไม่เริ่ม", statusBadge: "default" as const, progress: 0 },
  { id: "TSK004", title: "ปรับปรุงระบบบัญชี", assignee: "มนัส ทำดี", assigner: "สมหญิง รักงาน", due: "28 เม.ย. 2026", priority: "ปานกลาง", priorityBadge: "warning" as const, status: "กำลังดำเนินการ", statusBadge: "info" as const, progress: 40 },
  { id: "TSK005", title: "จัดทำ Proposal ลูกค้า", assignee: "ประยุทธ์ มั่นคง", assigner: "วิภา สดใส", due: "21 เม.ย. 2026", priority: "สูง", priorityBadge: "danger" as const, status: "ส่งงานแล้ว", statusBadge: "success" as const, progress: 100 },
  { id: "TSK006", title: "ออกแบบโลโก้ใหม่", assignee: "นภา สวยงาม", assigner: "Admin", due: "5 พ.ค. 2026", priority: "ต่ำ", priorityBadge: "default" as const, status: "กำลังดำเนินการ", statusBadge: "info" as const, progress: 20 },
];

export default function TasksPage() {
  return (
    <>
      <Topbar title="มอบหมายงาน" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">รายการงานทั้งหมด</h3>
            <p className="text-sm text-muted">{tasks.length} งาน</p>
          </div>
          <a
            href="/tasks/create"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25"
          >
            <Plus className="w-4 h-4" />
            สร้างงานใหม่
          </a>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "ทั้งหมด", value: 6, icon: Clock, color: "bg-surface text-foreground" },
            { label: "กำลังดำเนินการ", value: 3, icon: AlertCircle, color: "bg-blue-50 text-blue-600" },
            { label: "ส่งงานแล้ว", value: 1, icon: CheckCircle, color: "bg-green-50 text-green-600" },
            { label: "ใกล้ครบกำหนด", value: 1, icon: AlertCircle, color: "bg-yellow-50 text-yellow-600" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.color}`}>
                <Icon className="w-5 h-5" />
                <div>
                  <p className="text-xs opacity-70">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" placeholder="ค้นหางาน..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-muted" />
          </div>
          <select className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm">
            <option>ทุกสถานะ</option>
            <option>กำลังดำเนินการ</option>
            <option>ส่งงานแล้ว</option>
            <option>ยังไม่เริ่ม</option>
          </select>
        </div>

        {/* Task Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-muted font-mono">{task.id}</p>
                  <h4 className="text-sm font-semibold text-foreground mt-1">{task.title}</h4>
                </div>
                <Badge label={task.priority} variant={task.priorityBadge} />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">มอบหมายให้:</span>
                  <span className="font-medium text-foreground">{task.assignee}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">มอบหมายโดย:</span>
                  <span className="text-muted">{task.assigner}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">กำหนดส่ง:</span>
                  <span className="font-medium text-foreground">{task.due}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted">ความคืบหน้า</span>
                  <span className="font-medium text-foreground">{task.progress}%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Badge label={task.status} variant={task.statusBadge} />
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-blue-600">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary-600">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

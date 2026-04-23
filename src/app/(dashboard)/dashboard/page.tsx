"use client";

import Topbar from "@/components/Topbar";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import {
  Users,
  Clock,
  Calculator,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <Topbar title="แดชบอร์ด" />
      <div className="p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute right-20 bottom-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-1">สวัสดี, Admin 👋</h2>
            <p className="text-white/80">
              ยินดีต้อนรับกลับ! นี่คือภาพรวมระบบวันนี้
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="พนักงานทั้งหมด"
            value={156}
            icon={<Users className="w-5 h-5" />}
            change="▲ เพิ่ม 3 คนเดือนนี้"
            changeType="up"
            color="orange"
          />
          <StatCard
            title="มาทำงานวันนี้"
            value={142}
            icon={<Clock className="w-5 h-5" />}
            change="91% อัตราการเข้างาน"
            changeType="up"
            color="green"
          />
          <StatCard
            title="งานที่รอดำเนินการ"
            value={23}
            icon={<ClipboardList className="w-5 h-5" />}
            change="5 งานใกล้ครบกำหนด"
            changeType="neutral"
            color="blue"
          />
          <StatCard
            title="เงินเดือนรออนุมัติ"
            value="฿1.2M"
            icon={<Calculator className="w-5 h-5" />}
            change="รอบเดือน เม.ย. 2026"
            changeType="neutral"
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Attendance */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-border">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                สรุปการเข้างานวันนี้
              </h3>
              <a
                href="/attendance"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                ดูทั้งหมด <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
            <div className="p-5">
              {/* Attendance Summary Bars */}
              <div className="space-y-4">
                {[
                  { label: "ตรงเวลา", count: 128, total: 156, color: "bg-green-500" },
                  { label: "สาย", count: 14, total: 156, color: "bg-yellow-500" },
                  { label: "ขาด", count: 8, total: 156, color: "bg-accent-500" },
                  { label: "ลา", count: 6, total: 156, color: "bg-blue-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <span className="text-sm text-muted w-16">{item.label}</span>
                    <div className="flex-1 bg-surface rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{
                          width: `${(item.count / item.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">
                      {item.count} คน
                    </span>
                  </div>
                ))}
              </div>

              {/* Recent log */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-3">
                  ลงเวลาล่าสุด
                </p>
                <div className="space-y-3">
                  {[
                    { name: "สมชาย ใจดี", time: "08:02", status: "ตรงเวลา", badge: "success" as const },
                    { name: "สมหญิง รักงาน", time: "08:05", status: "ตรงเวลา", badge: "success" as const },
                    { name: "ประยุทธ์ มั่นคง", time: "08:32", status: "สาย", badge: "warning" as const },
                    { name: "วิภา สดใส", time: "08:45", status: "สาย", badge: "warning" as const },
                  ].map((log, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">
                          {log.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {log.name}
                          </p>
                          <p className="text-xs text-muted">เข้างาน {log.time} น.</p>
                        </div>
                      </div>
                      <Badge label={log.status} variant={log.badge} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Alerts */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">
                ทางลัดด่วน
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "เพิ่มพนักงาน", icon: Users, href: "/employees/create", color: "from-primary-500 to-primary-600" },
                  { label: "บันทึกเวลา", icon: Clock, href: "/attendance", color: "from-green-500 to-green-600" },
                  { label: "สร้างงาน", icon: ClipboardList, href: "/tasks/create", color: "from-blue-500 to-blue-600" },
                  { label: "คำนวณเงิน", icon: Calculator, href: "/payroll", color: "from-accent-500 to-accent-600" },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={action.label}
                      href={action.href}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface hover:shadow-md transition-all border border-border group"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {action.label}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">
                การแจ้งเตือน
              </h3>
              <div className="space-y-3">
                {[
                  {
                    icon: AlertTriangle,
                    text: "พนักงาน 3 คน ใกล้หมดสัญญา",
                    color: "text-yellow-500 bg-yellow-50",
                  },
                  {
                    icon: CheckCircle2,
                    text: "รอบเงินเดือนพร้อมอนุมัติ",
                    color: "text-green-500 bg-green-50",
                  },
                  {
                    icon: TrendingUp,
                    text: "OT รวมเดือนนี้ 340 ชั่วโมง",
                    color: "text-blue-500 bg-blue-50",
                  },
                  {
                    icon: AlertTriangle,
                    text: "ใบลา 5 ใบรออนุมัติ",
                    color: "text-accent-500 bg-accent-50",
                  },
                ].map((alert, i) => {
                  const Icon = alert.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm text-foreground">{alert.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">งานล่าสุด</h3>
            <a
              href="/tasks"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    ชื่องาน
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    ผู้รับผิดชอบ
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    กำหนดส่ง
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    สถานะ
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    ความคืบหน้า
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { name: "จัดทำรายงานประจำเดือน", person: "สมชาย ใจดี", due: "25 เม.ย. 2026", status: "กำลังดำเนินการ", badge: "info" as const, progress: 65 },
                  { name: "ตรวจสอบสต็อกสินค้า", person: "สมหญิง รักงาน", due: "22 เม.ย. 2026", status: "ใกล้ครบกำหนด", badge: "warning" as const, progress: 80 },
                  { name: "อบรมพนักงานใหม่", person: "วิภา สดใส", due: "30 เม.ย. 2026", status: "ยังไม่เริ่ม", badge: "default" as const, progress: 0 },
                  { name: "ปรับปรุงเว็บไซต์", person: "ประยุทธ์ มั่นคง", due: "20 เม.ย. 2026", status: "เสร็จสิ้น", badge: "success" as const, progress: 100 },
                ].map((task, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">
                      {task.name}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted">
                      {task.person}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted">{task.due}</td>
                    <td className="px-5 py-4">
                      <Badge label={task.status} variant={task.badge} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface rounded-full h-2 max-w-[100px]">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted">{task.progress}%</span>
                      </div>
                    </td>
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

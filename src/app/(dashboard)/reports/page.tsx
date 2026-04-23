"use client";

import Topbar from "@/components/Topbar";
import { BarChart3, Users, Clock, DollarSign, ClipboardList, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const reportModules = [
  {
    title: "รายงานพนักงาน",
    description: "รายงานข้อมูลพนักงาน จำนวนพนักงานตามแผนก สถานะ และอื่นๆ",
    href: "/reports/employees",
    icon: Users,
    color: "from-primary-500 to-primary-600",
    stats: [
      { label: "พนักงานทั้งหมด", value: "156" },
      { label: "เข้าใหม่เดือนนี้", value: "3" },
    ],
  },
  {
    title: "รายงานเวลางาน",
    description: "รายงานการเข้างาน สาย ขาด ลา และสรุปชั่วโมงทำงาน",
    href: "/reports/attendance",
    icon: Clock,
    color: "from-green-500 to-green-600",
    stats: [
      { label: "อัตราเข้างาน", value: "91%" },
      { label: "OT เฉลี่ย", value: "12 ชม." },
    ],
  },
  {
    title: "รายงานเงินเดือน",
    description: "รายงานเงินเดือน ค่าจ้าง OT รายการหัก และสรุปค่าใช้จ่าย",
    href: "/reports/payroll",
    icon: DollarSign,
    color: "from-blue-500 to-blue-600",
    stats: [
      { label: "ยอดจ่ายเดือนนี้", value: "฿1.2M" },
      { label: "ยอด OT", value: "฿45K" },
    ],
  },
  {
    title: "รายงานงาน",
    description: "รายงานสถานะงาน ความคืบหน้า และประสิทธิภาพการทำงาน",
    href: "/reports/tasks",
    icon: ClipboardList,
    color: "from-purple-500 to-purple-600",
    stats: [
      { label: "งานเสร็จเดือนนี้", value: "28" },
      { label: "เฉลี่ยเสร็จตรงเวลา", value: "85%" },
    ],
  },
];

export default function ReportsPage() {
  return (
    <>
      <Topbar title="รายงาน" />
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">ศูนย์รายงาน</h3>
          <p className="text-sm text-muted">เลือกดูรายงานจากหมวดหมู่ด้านล่าง</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-primary-500 transition-colors" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{mod.title}</h4>
                <p className="text-sm text-muted mb-4">{mod.description}</p>
                <div className="flex items-center gap-6 pt-4 border-t border-border">
                  {mod.stats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-xs text-muted">{stat.label}</p>
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

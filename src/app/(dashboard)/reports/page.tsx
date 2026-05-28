import Link from "next/link";
import {
  Users,
  Clock,
  CalendarDays,
  Hourglass,
  Wallet,
  ListTodo,
} from "lucide-react";
import Topbar from "@/components/Topbar";

const REPORTS = [
  {
    href: "/reports/employees",
    title: "รายงานพนักงาน",
    description: "จำนวนพนักงาน, แยกตามแผนก/ประเภทการจ้าง, เข้า-ออก 12 เดือน",
    icon: Users,
    color: "bg-indigo-500",
  },
  {
    href: "/reports/attendance",
    title: "รายงานเวลางาน",
    description: "อัตราการมาทำงาน, สถิติการมาสาย, แนวโน้มรายวัน",
    icon: Clock,
    color: "bg-sky-500",
  },
  {
    href: "/reports/leave",
    title: "รายงานการลา",
    description: "วันลาแยกตามประเภท, แผนก, และพนักงานที่ใช้สิทธิ์มากสุด",
    icon: CalendarDays,
    color: "bg-rose-500",
  },
  {
    href: "/reports/ot",
    title: "รายงาน OT",
    description: "ชั่วโมง/ค่าใช้จ่าย OT แยกตามแผนกและพนักงาน",
    icon: Hourglass,
    color: "bg-amber-500",
  },
  {
    href: "/reports/payroll",
    title: "รายงานเงินเดือน",
    description: "สรุปรายงวด ค่าใช้จ่ายรวม จ่ายสุทธิ ส่งออก CSV",
    icon: Wallet,
    color: "bg-emerald-500",
  },
  {
    href: "/reports/tasks",
    title: "รายงานงาน",
    description: "สถานะ/ความสำคัญของงาน และพนักงานที่ทำผลงานดีที่สุด",
    icon: ListTodo,
    color: "bg-purple-500",
  },
];

export default function ReportsIndexPage() {
  return (
    <>
      <Topbar title="ศูนย์รายงาน" />
      <div className="p-6">
        <p className="mb-4 text-sm text-slate-600">
          เลือกรายงานที่ต้องการดู — ข้อมูลทั้งหมดมาจากระบบจริง สามารถกรองและส่งออก CSV ได้
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.href}
                href={r.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${r.color} text-white`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-slate-700">
                      {r.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{r.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Clock,
  ClipboardList,
  Calculator,
  CheckCircle,
  BarChart3,
  Package,
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  Briefcase,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  {
    label: "แดชบอร์ด",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "จัดการพนักงาน",
    href: "/employees",
    icon: Users,
    children: [
      { label: "รายชื่อพนักงาน", href: "/employees" },
      { label: "เพิ่มพนักงาน", href: "/employees/create" },
    ],
  },
  {
    label: "กำหนดกฎระเบียบ",
    href: "/rules",
    icon: Shield,
  },
  {
    label: "ค่าจ้างรายสินค้า",
    href: "/product-wages",
    icon: Package,
  },
  {
    label: "ลงเวลางาน",
    href: "/attendance",
    icon: Clock,
    children: [
      { label: "บันทึกเวลา", href: "/attendance" },
      { label: "ประวัติเวลา", href: "/attendance/history" },
    ],
  },
  {
    label: "มอบหมายงาน",
    href: "/tasks",
    icon: ClipboardList,
    children: [
      { label: "รายการงาน", href: "/tasks" },
      { label: "สร้างงานใหม่", href: "/tasks/create" },
    ],
  },
  {
    label: "คำนวณเงินเดือน",
    href: "/payroll",
    icon: Calculator,
    children: [
      { label: "คำนวณเงินเดือน", href: "/payroll" },
      { label: "OT / หักเงิน", href: "/payroll/ot-deductions" },
    ],
  },
  {
    label: "อนุมัติเงินเดือน",
    href: "/payroll-approval",
    icon: CheckCircle,
  },
  {
    label: "รายงาน",
    href: "/reports",
    icon: BarChart3,
    children: [
      { label: "รายงานพนักงาน", href: "/reports/employees" },
      { label: "รายงานเวลางาน", href: "/reports/attendance" },
      { label: "รายงานเงินเดือน", href: "/reports/payroll" },
      { label: "รายงานงาน", href: "/reports/tasks" },
    ],
  },
  {
    label: "ตั้งค่าระบบ",
    href: "/settings",
    icon: Settings,
    children: [
      { label: "ข้อมูลบริษัท", href: "/settings" },
      { label: "จัดการผู้ใช้", href: "/settings/users" },
      { label: "สิทธิ์การใช้งาน", href: "/settings/roles" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 bg-gradient-to-b from-primary-700 to-accent-800 text-white flex flex-col min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Briefcase className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CYC-HRM</h1>
            <p className="text-xs text-white/60">ระบบบริหารงานบุคคล</p>
          </div>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const expanded = expandedItems.includes(item.label);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <li key={item.label}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-white/20 text-white shadow-sm"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {expanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expanded && (
                      <ul className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`block px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                pathname === child.href
                                  ? "bg-white/20 text-white font-medium"
                                  : "text-white/60 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-xs text-white/50">ผู้ดูแลระบบ</p>
          </div>
          <button className="text-white/50 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

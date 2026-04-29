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
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

type ChildItem = { label: string; href: string; permission?: string | string[] };
type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string | string[];
  children?: ChildItem[];
};

const menuItems: MenuItem[] = [
  {
    label: "แดชบอร์ด",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "จัดการพนักงาน",
    href: "/employees",
    icon: Users,
    permission: "employees.view",
    children: [
      { label: "รายชื่อพนักงาน", href: "/employees", permission: "employees.view" },
      { label: "เพิ่มพนักงาน", href: "/employees/create", permission: "employees.create" },
    ],
  },
  {
    label: "กำหนดกฎระเบียบ",
    href: "/rules",
    icon: Shield,
    permission: "settings.view",
  },
  {
    label: "ค่าจ้างรายสินค้า",
    href: "/product-wages",
    icon: Package,
    permission: "payroll.view",
  },
  {
    label: "ลงเวลางาน",
    href: "/attendance",
    icon: Clock,
    permission: "attendance.view",
    children: [
      { label: "บันทึกเวลา", href: "/attendance", permission: "attendance.view" },
      { label: "ประวัติเวลา", href: "/attendance/history", permission: "attendance.view" },
    ],
  },
  {
    label: "มอบหมายงาน",
    href: "/tasks",
    icon: ClipboardList,
    permission: "tasks.view",
    children: [
      { label: "รายการงาน", href: "/tasks", permission: "tasks.view" },
      { label: "สร้างงานใหม่", href: "/tasks/create", permission: "tasks.manage" },
    ],
  },
  {
    label: "คำนวณเงินเดือน",
    href: "/payroll",
    icon: Calculator,
    permission: ["payroll.view", "payroll.compute"],
    children: [
      { label: "คำนวณเงินเดือน", href: "/payroll", permission: "payroll.compute" },
      { label: "OT / หักเงิน", href: "/payroll/ot-deductions", permission: "payroll.compute" },
    ],
  },
  {
    label: "อนุมัติเงินเดือน",
    href: "/payroll-approval",
    icon: CheckCircle,
    permission: "payroll.approve",
  },
  {
    label: "รายงาน",
    href: "/reports",
    icon: BarChart3,
    permission: "reports.view",
    children: [
      { label: "รายงานพนักงาน", href: "/reports/employees", permission: "reports.view" },
      { label: "รายงานเวลางาน", href: "/reports/attendance", permission: "reports.view" },
      { label: "รายงานเงินเดือน", href: "/reports/payroll", permission: "reports.view" },
      { label: "รายงานงาน", href: "/reports/tasks", permission: "reports.view" },
    ],
  },
  {
    label: "ตั้งค่าระบบ",
    href: "/settings",
    icon: Settings,
    permission: ["settings.view", "users.view", "roles.view"],
    children: [
      { label: "ข้อมูลบริษัท", href: "/settings", permission: "settings.view" },
      { label: "จัดการผู้ใช้", href: "/settings/users", permission: "users.view" },
      { label: "สิทธิ์การใช้งาน", href: "/settings/roles", permission: "roles.view" },
      { label: "จัดการแผนก", href: "/settings/departments", permission: "master_data.manage" },
      { label: "ประเทศ", href: "/settings/countries", permission: "master_data.manage" },
      { label: "ประเภทการจ้าง", href: "/settings/employment-types", permission: "master_data.manage" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const can = (perm?: string | string[]) => !perm || hasPermission(perm);

  const visibleItems = menuItems
    .map((item) => {
      if (item.children) {
        const visibleChildren = item.children.filter((c) => can(c.permission));
        if (visibleChildren.length === 0 && !can(item.permission)) return null;
        return { ...item, children: visibleChildren };
      }
      return can(item.permission) ? item : null;
    })
    .filter((item): item is MenuItem => item !== null);

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
          {visibleItems.map((item) => {
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
                        {item.children!.map((child) => (
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
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-white/50 truncate">
              {user?.role?.display_name ?? "ผู้ใช้"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            title="ออกจากระบบ"
            className="text-white/50 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

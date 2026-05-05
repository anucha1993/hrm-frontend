"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, History, User as UserIcon, LogOut, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/attendance", label: "ลงเวลา", icon: Clock },
  { href: "/attendance/history", label: "ประวัติ", icon: History },
  { href: "/attendance/profile", label: "โปรไฟล์", icon: UserIcon },
];

export default function EmployeeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/attendance"
      ? pathname === "/attendance"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-md">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name ?? "พนักงาน"}</p>
              <p className="text-xs text-white/70 truncate">CYC-HRM</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="ออกจากระบบ"
            className="p-2 rounded-lg hover:bg-white/15 active:bg-white/25 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <ul className="grid grid-cols-3 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 py-3 transition ${
                    active
                      ? "text-primary-600"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${active ? "scale-110" : ""} transition`} />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

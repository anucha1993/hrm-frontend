"use client";

import { Bell, Search, Menu } from "lucide-react";
import { useState } from "react";

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button className="lg:hidden text-muted hover:text-foreground">
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center bg-surface rounded-lg px-3 py-2 border border-border">
          <Search className="w-4 h-4 text-muted mr-2" />
          <input
            type="text"
            placeholder="ค้นหา..."
            className="bg-transparent text-sm outline-none w-48 text-foreground placeholder:text-muted"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <Bell className="w-5 h-5 text-muted" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-border py-2 z-50">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-semibold">การแจ้งเตือน</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {[
                  { text: "มีใบลาใหม่รออนุมัติ", time: "5 นาทีที่แล้ว" },
                  { text: "พนักงานลงเวลาสาย 3 คน", time: "30 นาทีที่แล้ว" },
                  { text: "รอบเงินเดือนพร้อมอนุมัติ", time: "1 ชั่วโมงที่แล้ว" },
                ].map((n, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 hover:bg-surface cursor-pointer border-b border-border last:border-0"
                  >
                    <p className="text-sm text-foreground">{n.text}</p>
                    <p className="text-xs text-muted mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}

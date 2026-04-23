"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { ArrowLeft, Plus, Search, Edit2, Trash2, Mail, Shield } from "lucide-react";
import Link from "next/link";

const users = [
  { id: 1, name: "ผู้ดูแลระบบ", email: "admin@cychrm.com", role: "Admin", status: "ใช้งาน", lastLogin: "24 เม.ย. 2026 09:15" },
  { id: 2, name: "สมชาย ใจดี", email: "somchai@cychrm.com", role: "Admin", status: "ใช้งาน", lastLogin: "24 เม.ย. 2026 08:30" },
  { id: 3, name: "สมหญิง รักงาน", email: "somying@cychrm.com", role: "Member", status: "ใช้งาน", lastLogin: "23 เม.ย. 2026 14:20" },
  { id: 4, name: "มนัส ทำดี", email: "manat@cychrm.com", role: "Member", status: "ใช้งาน", lastLogin: "24 เม.ย. 2026 09:00" },
  { id: 5, name: "นภา สวยงาม", email: "napa@cychrm.com", role: "Member", status: "ปิดใช้งาน", lastLogin: "10 เม.ย. 2026 16:45" },
  { id: 6, name: "ประยุทธ์ มั่นคง", email: "prayuth@cychrm.com", role: "Member", status: "ใช้งาน", lastLogin: "22 เม.ย. 2026 11:30" },
];

export default function UsersPage() {
  return (
    <>
      <Topbar title="จัดการผู้ใช้งาน" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-2 rounded-lg hover:bg-white border border-border"><ArrowLeft className="w-4 h-4 text-muted" /></Link>
            <h3 className="text-lg font-semibold text-foreground">จัดการผู้ใช้งาน</h3>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold">
            <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งาน
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary-50 text-primary-600 rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5" /><div><p className="text-xs opacity-70">ผู้ใช้ทั้งหมด</p><p className="text-xl font-bold">6</p></div>
          </div>
          <div className="bg-blue-50 text-blue-600 rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5" /><div><p className="text-xs opacity-70">Admin</p><p className="text-xl font-bold">2</p></div>
          </div>
          <div className="bg-green-50 text-green-600 rounded-xl p-4 flex items-center gap-3">
            <Mail className="w-5 h-5" /><div><p className="text-xs opacity-70">Member</p><p className="text-xl font-bold">4</p></div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" placeholder="ค้นหาผู้ใช้งาน..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {["ชื่อ", "อีเมล", "บทบาท", "สถานะ", "เข้าใช้ล่าสุด", "จัดการ"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">{u.name[0]}</div>
                        <span className="text-sm font-medium text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted">{u.email}</td>
                    <td className="px-5 py-3">
                      <Badge label={u.role} variant={u.role === "Admin" ? "warning" : "info"} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge label={u.status} variant={u.status === "ใช้งาน" ? "success" : "default"} />
                    </td>
                    <td className="px-5 py-3 text-sm text-muted">{u.lastLogin}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500"><Edit2 className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-accent-50 text-accent-500"><Trash2 className="w-4 h-4" /></button>
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

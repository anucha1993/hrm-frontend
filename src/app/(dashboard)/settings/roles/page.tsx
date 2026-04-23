"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { ArrowLeft, Plus, Edit2, Shield, Eye, Users, FileText, DollarSign, Clock, ClipboardList, BarChart3, Settings } from "lucide-react";
import Link from "next/link";

const permissions = [
  { module: "แดชบอร์ด", icon: BarChart3 },
  { module: "จัดการพนักงาน", icon: Users },
  { module: "กฎระเบียบ", icon: FileText },
  { module: "ค่าจ้างรายสินค้า", icon: DollarSign },
  { module: "ลงเวลางาน", icon: Clock },
  { module: "มอบหมายงาน", icon: ClipboardList },
  { module: "คำนวณเงินเดือน", icon: DollarSign },
  { module: "อนุมัติเงินเดือน", icon: Shield },
  { module: "รายงาน", icon: BarChart3 },
  { module: "ตั้งค่าระบบ", icon: Settings },
];

const roles = [
  {
    name: "Admin",
    description: "ผู้ดูแลระบบ สามารถจัดการทุกอย่างในระบบ",
    users: 2,
    permissions: permissions.map((p) => ({ ...p, view: true, create: true, edit: true, delete: true })),
  },
  {
    name: "Member",
    description: "ผู้ใช้งานทั่วไป สามารถดูข้อมูลและจัดการงานที่ได้รับมอบหมาย",
    users: 4,
    permissions: permissions.map((p) => ({
      ...p,
      view: true,
      create: ["ลงเวลางาน", "มอบหมายงาน"].includes(p.module),
      edit: ["ลงเวลางาน"].includes(p.module),
      delete: false,
    })),
  },
];

export default function RolesPage() {
  return (
    <>
      <Topbar title="จัดการสิทธิ์" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-2 rounded-lg hover:bg-white border border-border"><ArrowLeft className="w-4 h-4 text-muted" /></Link>
            <h3 className="text-lg font-semibold text-foreground">จัดการสิทธิ์และบทบาท</h3>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold">
            <Plus className="w-4 h-4" /> เพิ่มบทบาท
          </button>
        </div>

        {roles.map((role) => (
          <div key={role.name} className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${role.name === "Admin" ? "bg-primary-50 text-primary-600" : "bg-blue-50 text-blue-600"}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{role.name}</h4>
                    <Badge label={`${role.users} ผู้ใช้`} variant={role.name === "Admin" ? "warning" : "info"} />
                  </div>
                  <p className="text-xs text-muted mt-0.5">{role.description}</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-muted hover:bg-surface">
                <Edit2 className="w-3.5 h-3.5" /> แก้ไข
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted w-48">โมดูล</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-muted">ดู</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-muted">สร้าง</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-muted">แก้ไข</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-muted">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {role.permissions.map((p) => {
                    const Icon = p.icon;
                    return (
                      <tr key={p.module} className="hover:bg-surface/50">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted" />
                            <span className="text-sm text-foreground">{p.module}</span>
                          </div>
                        </td>
                        {[p.view, p.create, p.edit, p.delete].map((v, i) => (
                          <td key={i} className="px-5 py-2.5 text-center">
                            <div className={`w-5 h-5 mx-auto rounded ${v ? "bg-green-500" : "bg-gray-200"} flex items-center justify-center`}>
                              {v && <span className="text-white text-xs">✓</span>}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

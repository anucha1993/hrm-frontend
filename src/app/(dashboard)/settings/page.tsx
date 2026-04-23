"use client";

import Topbar from "@/components/Topbar";
import { Building, Users, Shield, Bell, Database, Globe } from "lucide-react";
import Link from "next/link";

const settingSections = [
  {
    title: "ข้อมูลบริษัท",
    description: "ตั้งค่าชื่อบริษัท ที่อยู่ โลโก้ และข้อมูลติดต่อ",
    icon: Building,
    color: "bg-primary-50 text-primary-600 border-primary-100",
  },
  {
    title: "จัดการผู้ใช้งาน",
    description: "เพิ่ม ลบ แก้ไขข้อมูลผู้ใช้งานระบบ",
    icon: Users,
    color: "bg-blue-50 text-blue-600 border-blue-100",
    href: "/settings/users",
  },
  {
    title: "จัดการสิทธิ์",
    description: "กำหนดบทบาทและสิทธิ์การเข้าถึงของผู้ใช้",
    icon: Shield,
    color: "bg-accent-50 text-accent-600 border-accent-100",
    href: "/settings/roles",
  },
  {
    title: "การแจ้งเตือน",
    description: "ตั้งค่าการแจ้งเตือนผ่านอีเมลและในระบบ",
    icon: Bell,
    color: "bg-yellow-50 text-yellow-600 border-yellow-100",
  },
  {
    title: "สำรองข้อมูล",
    description: "ตั้งค่าการสำรองข้อมูลอัตโนมัติ",
    icon: Database,
    color: "bg-green-50 text-green-600 border-green-100",
  },
  {
    title: "ภาษาและภูมิภาค",
    description: "ตั้งค่าภาษา สกุลเงิน และรูปแบบวันที่",
    icon: Globe,
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
];

export default function SettingsPage() {
  return (
    <>
      <Topbar title="ตั้งค่าระบบ" />
      <div className="p-6 space-y-6">
        <h3 className="text-lg font-semibold text-foreground">ตั้งค่าระบบ</h3>

        {/* Quick Setting Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {settingSections.map((s) => {
            const Icon = s.icon;
            const Wrapper = s.href ? Link : "div";
            return (
              <Wrapper
                key={s.title}
                href={s.href || "#"}
                className={`rounded-xl border p-5 hover:shadow-md transition cursor-pointer ${s.color}`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/60">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{s.title}</h4>
                    <p className="text-xs mt-1 opacity-70">{s.description}</p>
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>

        {/* Company Info Form */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h4 className="text-sm font-semibold text-foreground mb-5">ข้อมูลบริษัท</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">ชื่อบริษัท</label>
              <input type="text" defaultValue="บริษัท CYC จำกัด" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">เลขทะเบียนนิติบุคคล</label>
              <input type="text" defaultValue="0105564000000" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1.5">ที่อยู่</label>
              <textarea rows={2} defaultValue="123/45 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm resize-none"></textarea>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">โทรศัพท์</label>
              <input type="tel" defaultValue="02-123-4567" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">อีเมล</label>
              <input type="email" defaultValue="info@cychrm.com" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">โลโก้บริษัท</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold">CYC</div>
                <button className="px-4 py-2 border border-border rounded-xl text-sm text-muted hover:bg-surface">เปลี่ยนโลโก้</button>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold">บันทึกข้อมูล</button>
          </div>
        </div>
      </div>
    </>
  );
}

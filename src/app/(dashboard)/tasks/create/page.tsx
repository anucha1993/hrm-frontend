"use client";

import Topbar from "@/components/Topbar";
import { Save, ArrowLeft, CalendarDays, User, Paperclip } from "lucide-react";
import Link from "next/link";

export default function CreateTaskPage() {
  return (
    <>
      <Topbar title="สร้างงานใหม่" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/tasks" className="p-2 rounded-lg hover:bg-white border border-border transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted" />
          </Link>
          <h3 className="text-lg font-semibold text-foreground">มอบหมายงานใหม่</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 pb-3 border-b border-border">รายละเอียดงาน</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">ชื่องาน</label>
                  <input type="text" placeholder="กรอกชื่องาน" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-muted" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">รายละเอียด</label>
                  <textarea rows={5} placeholder="อธิบายรายละเอียดงาน..." className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-muted resize-none"></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">มอบหมายให้</label>
                    <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option>-- เลือกพนักงาน --</option>
                      <option>สมชาย ใจดี</option>
                      <option>สมหญิง รักงาน</option>
                      <option>มนัส ทำดี</option>
                      <option>นภา สวยงาม</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">ความสำคัญ</label>
                    <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option>ต่ำ</option>
                      <option>ปานกลาง</option>
                      <option selected>สูง</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">วันที่เริ่ม</label>
                    <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">กำหนดส่ง</label>
                    <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 pb-3 border-b border-border">แนบไฟล์</h4>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer">
                <Paperclip className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                <p className="text-xs text-muted mt-1">รองรับ PDF, DOC, XLS, JPG, PNG (ไม่เกิน 10MB)</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">สรุป</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <User className="w-4 h-4" />
                  <span>ยังไม่เลือกผู้รับผิดชอบ</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <CalendarDays className="w-4 h-4" />
                  <span>ยังไม่กำหนดวันส่ง</span>
                </div>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25">
              <Save className="w-4 h-4" />
              สร้างงาน
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import Topbar from "@/components/Topbar";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateEmployeePage() {
  return (
    <>
      <Topbar title="เพิ่มพนักงานใหม่" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/employees"
            className="p-2 rounded-lg hover:bg-white border border-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted" />
          </Link>
          <h3 className="text-lg font-semibold text-foreground">
            กรอกข้อมูลพนักงานใหม่
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="bg-white rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 pb-3 border-b border-border">
                ข้อมูลส่วนตัว
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "คำนำหน้า", type: "select", options: ["นาย", "นาง", "นางสาว"] },
                  { label: "ชื่อ", type: "text", placeholder: "กรอกชื่อ" },
                  { label: "นามสกุล", type: "text", placeholder: "กรอกนามสกุล" },
                  { label: "ชื่อเล่น", type: "text", placeholder: "กรอกชื่อเล่น" },
                  { label: "วันเกิด", type: "date" },
                  { label: "เลขบัตรประชาชน", type: "text", placeholder: "x-xxxx-xxxxx-xx-x" },
                  { label: "เบอร์โทรศัพท์", type: "text", placeholder: "0xx-xxx-xxxx" },
                  { label: "อีเมล", type: "email", placeholder: "example@email.com" },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        {field.options?.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-muted"
                      />
                    )}
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    ที่อยู่
                  </label>
                  <textarea
                    rows={3}
                    placeholder="กรอกที่อยู่"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-muted resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Work Info */}
            <div className="bg-white rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 pb-3 border-b border-border">
                ข้อมูลการทำงาน
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "แผนก", type: "select", options: ["ฝ่ายผลิต", "ฝ่ายบัญชี", "ฝ่ายขาย", "ฝ่ายบุคคล", "ฝ่ายไอที", "ฝ่ายการตลาด"] },
                  { label: "ตำแหน่ง", type: "text", placeholder: "กรอกตำแหน่ง" },
                  { label: "วันที่เริ่มงาน", type: "date" },
                  { label: "ประเภทพนักงาน", type: "select", options: ["พนักงานประจำ", "พนักงานชั่วคราว", "พนักงานพาร์ทไทม์"] },
                  { label: "เงินเดือนพื้นฐาน (บาท)", type: "number", placeholder: "0.00" },
                  { label: "ธนาคาร", type: "select", options: ["กสิกรไทย", "กรุงเทพ", "ไทยพาณิชย์", "กรุงไทย"] },
                  { label: "เลขบัญชีธนาคาร", type: "text", placeholder: "xxx-x-xxxxx-x" },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">-- เลือก --</option>
                        {field.options?.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-muted"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">
                รูปพนักงาน
              </h4>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-surface mx-auto mb-3 flex items-center justify-center">
                  <span className="text-3xl text-muted">👤</span>
                </div>
                <p className="text-sm text-muted">คลิกเพื่ออัปโหลดรูป</p>
                <p className="text-xs text-muted mt-1">PNG, JPG ไม่เกิน 2MB</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">
                เอกสาร
              </h4>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer">
                <p className="text-sm text-muted">ลากไฟล์มาวางที่นี่</p>
                <p className="text-xs text-muted mt-1">
                  PDF, DOC ไม่เกิน 5MB
                </p>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25">
              <Save className="w-4 h-4" />
              บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

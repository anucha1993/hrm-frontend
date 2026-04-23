"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import StatCard from "@/components/StatCard";
import { Clock, LogIn, LogOut, Calendar, Users, AlertTriangle, Camera, Fingerprint, MapPin, Wifi, WifiOff, CheckCircle, XCircle } from "lucide-react";

type SystemTab = "selfie" | "fingerprint";

const todayRecords = [
  { name: "สมชาย ใจดี", dept: "ฝ่ายผลิต", checkIn: "07:55", checkOut: "17:05", status: "ตรงเวลา", badge: "success" as const, hours: "8:10", method: "selfie" as const, hasPhoto: true, location: "โรงงาน A" },
  { name: "สมหญิง รักงาน", dept: "ฝ่ายบัญชี", checkIn: "08:02", checkOut: "17:00", status: "ตรงเวลา", badge: "success" as const, hours: "7:58", method: "fingerprint" as const, hasPhoto: false, device: "FP-001" },
  { name: "ประยุทธ์ มั่นคง", dept: "ฝ่ายขาย", checkIn: "08:32", checkOut: "-", status: "สาย", badge: "warning" as const, hours: "-", method: "selfie" as const, hasPhoto: true, location: "สำนักงาน" },
  { name: "วิภา สดใส", dept: "ฝ่ายบุคคล", checkIn: "07:50", checkOut: "17:10", status: "ตรงเวลา", badge: "success" as const, hours: "8:20", method: "fingerprint" as const, hasPhoto: false, device: "FP-002" },
  { name: "สุภาพ ดีเลิศ", dept: "ฝ่ายผลิต", checkIn: "-", checkOut: "-", status: "ขาด", badge: "danger" as const, hours: "-", method: "-" as const, hasPhoto: false },
  { name: "มนัส ทำดี", dept: "ฝ่ายไอที", checkIn: "08:00", checkOut: "-", status: "ตรงเวลา", badge: "success" as const, hours: "-", method: "selfie" as const, hasPhoto: true, location: "สำนักงาน" },
  { name: "นภา สวยงาม", dept: "ฝ่ายการตลาด", checkIn: "-", checkOut: "-", status: "ลา", badge: "info" as const, hours: "-", method: "-" as const, hasPhoto: false },
  { name: "ชัยวุฒิ แกร่ง", dept: "ฝ่ายผลิต", checkIn: "08:45", checkOut: "-", status: "สาย", badge: "warning" as const, hours: "-", method: "fingerprint" as const, hasPhoto: false, device: "FP-001" },
];

const fpDevices = [
  { id: "FP-001", name: "เครื่องสแกนนิ้วมือ #1", location: "อาคารโรงงาน A - ชั้น 1", status: "online", lastSync: "09:15", registered: 85, todayScans: 62 },
  { id: "FP-002", name: "เครื่องสแกนนิ้วมือ #2", location: "อาคารสำนักงาน - ชั้น 1", status: "online", lastSync: "09:14", registered: 72, todayScans: 48 },
  { id: "FP-003", name: "เครื่องสแกนนิ้วมือ #3", location: "อาคารคลังสินค้า", status: "offline", lastSync: "08:30", registered: 30, todayScans: 0 },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<SystemTab>("selfie");

  return (
    <>
      <Topbar title="ลงเวลางาน" />
      <div className="p-6 space-y-6">
        {/* Header with Date & Clock */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-white/70 text-sm">วันนี้</p>
              <h3 className="text-2xl font-bold mt-1">20 เมษายน 2026</h3>
              <p className="text-white/80 mt-1">วันจันทร์</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold font-mono">
                {new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <p className="text-sm text-white/60 mt-1">เวลาปัจจุบัน</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="มาตรงเวลา" value={128} icon={<Clock className="w-5 h-5" />} color="green" change="82% ของทั้งหมด" changeType="up" />
          <StatCard title="มาสาย" value={14} icon={<AlertTriangle className="w-5 h-5" />} color="orange" change="9% ของทั้งหมด" changeType="down" />
          <StatCard title="ขาดงาน" value={8} icon={<Users className="w-5 h-5" />} color="red" change="5% ของทั้งหมด" changeType="down" />
          <StatCard title="ลางาน" value={6} icon={<Calendar className="w-5 h-5" />} color="blue" change="4% ของทั้งหมด" changeType="neutral" />
        </div>

        {/* Tab Switcher */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("selfie")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2 ${activeTab === "selfie" ? "border-primary-500 text-primary-600 bg-primary-50/50" : "border-transparent text-muted hover:text-foreground hover:bg-surface"}`}
            >
              <Camera className="w-4 h-4" /> เซลฟี่ Temptime
            </button>
            <button
              onClick={() => setActiveTab("fingerprint")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2 ${activeTab === "fingerprint" ? "border-primary-500 text-primary-600 bg-primary-50/50" : "border-transparent text-muted hover:text-foreground hover:bg-surface"}`}
            >
              <Fingerprint className="w-4 h-4" /> สแกนนิ้วมือ
            </button>
          </div>

          {/* ===================== SELFIE TAB ===================== */}
          {activeTab === "selfie" && (
            <div className="p-5 space-y-5">
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-50">
                    <Camera className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">ถ่ายเซลฟี่ลงเวลา</h4>
                    <p className="text-xs text-muted">ระบบจะบันทึก GPS และเวลาจาก Server อัตโนมัติ</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition">
                    <LogIn className="w-4 h-4" /> ถ่ายเซลฟี่เข้างาน
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white rounded-xl font-semibold text-sm hover:bg-accent-600 transition">
                    <LogOut className="w-4 h-4" /> ถ่ายเซลฟี่ออกงาน
                  </button>
                </div>
              </div>

              {/* Selfie Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      {["พนักงาน", "แผนก", "ประเภท", "เวลา", "พิกัด GPS", "สถานะรูป", "สถานะ"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { name: "สมชาย ใจดี", dept: "ฝ่ายผลิต", type: "เข้างาน", time: "07:55", gps: "13.7563°N, 100.5018°E", photoOk: true, status: "ตรงเวลา", badge: "success" as const },
                      { name: "มนัส ทำดี", dept: "ฝ่ายไอที", type: "เข้างาน", time: "08:00", gps: "13.7580°N, 100.5025°E", photoOk: true, status: "ตรงเวลา", badge: "success" as const },
                      { name: "ประยุทธ์ มั่นคง", dept: "ฝ่ายขาย", type: "เข้างาน", time: "08:32", gps: "13.7580°N, 100.5025°E", photoOk: true, status: "สาย", badge: "warning" as const },
                      { name: "สมชาย ใจดี", dept: "ฝ่ายผลิต", type: "ออกงาน", time: "17:05", gps: "13.7563°N, 100.5018°E", photoOk: true, status: "ปกติ", badge: "success" as const },
                      { name: "มนัส ทำดี", dept: "ฝ่ายไอที", type: "ออกงาน", time: "17:30", gps: "13.7580°N, 100.5025°E", photoOk: false, status: "รูปไม่ชัด", badge: "danger" as const },
                    ].map((s, i) => (
                      <tr key={i} className="hover:bg-surface/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">{s.name[0]}</div>
                            <span className="text-sm font-medium text-foreground">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted">{s.dept}</td>
                        <td className="px-5 py-3">
                          <Badge label={s.type} variant={s.type === "เข้างาน" ? "success" : "warning"} />
                        </td>
                        <td className="px-5 py-3 text-sm font-mono text-foreground">{s.time}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <MapPin className="w-3 h-3" /> {s.gps}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {s.photoOk ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" /> ผ่าน</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle className="w-3.5 h-3.5" /> ไม่ผ่าน</span>
                          )}
                        </td>
                        <td className="px-5 py-3"><Badge label={s.status} variant={s.badge} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================== FINGERPRINT TAB ===================== */}
          {activeTab === "fingerprint" && (
            <div className="p-5 space-y-5">
              {/* Device Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fpDevices.map((d) => (
                  <div key={d.id} className={`rounded-xl border p-4 ${d.status === "online" ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Fingerprint className={`w-4 h-4 ${d.status === "online" ? "text-green-600" : "text-red-500"}`} />
                        <span className="text-sm font-semibold text-foreground">{d.name}</span>
                      </div>
                      {d.status === "online" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><Wifi className="w-3 h-3" /> ออนไลน์</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><WifiOff className="w-3 h-3" /> ออฟไลน์</span>
                      )}
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" /> {d.location}</p>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>ลงทะเบียน <strong className="text-foreground">{d.registered}</strong></span>
                      <span>สแกนวันนี้ <strong className="text-primary-600">{d.todayScans}</strong></span>
                      <span>ซิงค์ <strong className="text-foreground">{d.lastSync}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fingerprint Table */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">บันทึกสแกนนิ้วมือวันนี้</h4>
                <button className="text-xs text-primary-600 font-medium hover:underline">ซิงค์ข้อมูลล่าสุด</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      {["สถานะ", "พนักงาน", "ประเภท", "เวลา", "เครื่อง", "ความตรงกัน"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { name: "สมหญิง รักงาน", time: "08:02", type: "เข้างาน", device: "FP-001", match: 98, success: true },
                      { name: "วิภา สดใส", time: "07:50", type: "เข้างาน", device: "FP-002", match: 95, success: true },
                      { name: "ชัยวุฒิ แกร่ง", time: "08:45", type: "เข้างาน", device: "FP-001", match: 92, success: true },
                      { name: "สมหญิง รักงาน", time: "17:00", type: "ออกงาน", device: "FP-001", match: 97, success: true },
                      { name: "วิภา สดใส", time: "17:10", type: "ออกงาน", device: "FP-002", match: 94, success: true },
                      { name: "ไม่ระบุตัวตน", time: "09:22", type: "-", device: "FP-001", match: 35, success: false },
                    ].map((s, i) => (
                      <tr key={i} className={`hover:bg-surface/50 ${!s.success ? "bg-red-50" : ""}`}>
                        <td className="px-5 py-3">
                          {s.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${s.success ? "bg-gradient-to-br from-primary-400 to-accent-400" : "bg-red-400"}`}>{s.name[0]}</div>
                            <span className={`text-sm font-medium ${s.success ? "text-foreground" : "text-red-600"}`}>{s.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {s.type !== "-" ? (
                            <Badge label={s.type} variant={s.type === "เข้างาน" ? "success" : "warning"} />
                          ) : (
                            <Badge label="สแกนไม่สำเร็จ" variant="danger" />
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm font-mono text-foreground">{s.time}</td>
                        <td className="px-5 py-3 text-sm text-muted">{s.device}</td>
                        <td className="px-5 py-3">
                          <span className={`text-sm font-bold ${s.match >= 80 ? "text-green-600" : "text-red-600"}`}>{s.match}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

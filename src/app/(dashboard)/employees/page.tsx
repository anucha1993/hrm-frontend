"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
} from "lucide-react";
import { useState } from "react";

const employees = [
  { id: "EMP001", name: "สมชาย ใจดี", department: "ฝ่ายผลิต", position: "หัวหน้าแผนก", phone: "081-234-5678", status: "ทำงาน", badge: "success" as const },
  { id: "EMP002", name: "สมหญิง รักงาน", department: "ฝ่ายบัญชี", position: "พนักงานบัญชี", phone: "082-345-6789", status: "ทำงาน", badge: "success" as const },
  { id: "EMP003", name: "ประยุทธ์ มั่นคง", department: "ฝ่ายขาย", position: "พนักงานขาย", phone: "083-456-7890", status: "ทำงาน", badge: "success" as const },
  { id: "EMP004", name: "วิภา สดใส", department: "ฝ่ายบุคคล", position: "HR Manager", phone: "084-567-8901", status: "ทำงาน", badge: "success" as const },
  { id: "EMP005", name: "สุภาพ ดีเลิศ", department: "ฝ่ายผลิต", position: "พนักงานผลิต", phone: "085-678-9012", status: "ลาพัก", badge: "warning" as const },
  { id: "EMP006", name: "มนัส ทำดี", department: "ฝ่ายไอที", position: "โปรแกรมเมอร์", phone: "086-789-0123", status: "ทำงาน", badge: "success" as const },
  { id: "EMP007", name: "นภา สวยงาม", department: "ฝ่ายการตลาด", position: "Marketing", phone: "087-890-1234", status: "ทำงาน", badge: "success" as const },
  { id: "EMP008", name: "ชัยวุฒิ แกร่ง", department: "ฝ่ายผลิต", position: "พนักงานผลิต", phone: "088-901-2345", status: "ลาออก", badge: "danger" as const },
];

export default function EmployeesPage() {
  const [search, setSearch] = useState("");

  const filtered = employees.filter(
    (e) =>
      e.name.includes(search) ||
      e.id.includes(search) ||
      e.department.includes(search)
  );

  return (
    <>
      <Topbar title="จัดการพนักงาน" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              รายชื่อพนักงาน
            </h3>
            <p className="text-sm text-muted">
              ทั้งหมด {employees.length} คน
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface transition-colors">
              <Download className="w-4 h-4" />
              ส่งออก
            </button>
            <a
              href="/employees/create"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25"
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงาน
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="ค้นหาพนักงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-muted"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface transition-colors">
            <Filter className="w-4 h-4" />
            ตัวกรอง
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    รหัส
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    ชื่อ-นามสกุล
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    แผนก
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    ตำแหน่ง
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    เบอร์โทร
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    สถานะ
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-surface/50">
                    <td className="px-5 py-4 text-sm font-mono text-muted">
                      {emp.id}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-sm font-bold">
                          {emp.name[0]}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {emp.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted">
                      {emp.department}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted">
                      {emp.position}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted">
                      {emp.phone}
                    </td>
                    <td className="px-5 py-4">
                      <Badge label={emp.status} variant={emp.badge} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary-600 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-accent-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted">
              แสดง 1-{filtered.length} จาก {employees.length} รายการ
            </p>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:bg-surface">
                ก่อนหน้า
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-medium">
                1
              </button>
              <button className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:bg-surface">
                2
              </button>
              <button className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:bg-surface">
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

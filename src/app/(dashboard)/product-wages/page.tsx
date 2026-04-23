"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";

const products = [
  { id: 1, code: "PRD001", name: "เสื้อโปโล Size S", category: "เสื้อ", wage: 15, unit: "ตัว", status: "ใช้งาน", badge: "success" as const },
  { id: 2, code: "PRD002", name: "เสื้อโปโล Size M", category: "เสื้อ", wage: 15, unit: "ตัว", status: "ใช้งาน", badge: "success" as const },
  { id: 3, code: "PRD003", name: "เสื้อโปโล Size L", category: "เสื้อ", wage: 18, unit: "ตัว", status: "ใช้งาน", badge: "success" as const },
  { id: 4, code: "PRD004", name: "กางเกงขายาว", category: "กางเกง", wage: 25, unit: "ตัว", status: "ใช้งาน", badge: "success" as const },
  { id: 5, code: "PRD005", name: "กางเกงขาสั้น", category: "กางเกง", wage: 20, unit: "ตัว", status: "ใช้งาน", badge: "success" as const },
  { id: 6, code: "PRD006", name: "ชุดยูนิฟอร์ม", category: "ชุด", wage: 45, unit: "ชุด", status: "ใช้งาน", badge: "success" as const },
  { id: 7, code: "PRD007", name: "หมวกแก๊ป", category: "อุปกรณ์", wage: 8, unit: "ใบ", status: "ปิดใช้", badge: "default" as const },
  { id: 8, code: "PRD008", name: "ผ้ากันเปื้อน", category: "อุปกรณ์", wage: 12, unit: "ผืน", status: "ใช้งาน", badge: "success" as const },
];

export default function ProductWagesPage() {
  return (
    <>
      <Topbar title="ค่าจ้างรายสินค้า" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">กำหนดค่าจ้างรายสินค้า</h3>
            <p className="text-sm text-muted">กำหนดอัตราค่าจ้างต่อชิ้นสำหรับแต่ละสินค้า</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25">
            <Plus className="w-4 h-4" />
            เพิ่มสินค้า
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "สินค้าทั้งหมด", value: products.length, color: "text-primary-600 bg-primary-50" },
            { label: "ใช้งานอยู่", value: products.filter(p => p.status === "ใช้งาน").length, color: "text-green-600 bg-green-50" },
            { label: "ค่าจ้างเฉลี่ย", value: "฿" + Math.round(products.reduce((a, b) => a + b.wage, 0) / products.length), color: "text-blue-600 bg-blue-50" },
            { label: "หมวดหมู่", value: [...new Set(products.map(p => p.category))].length, color: "text-purple-600 bg-purple-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-muted"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {["รหัส", "ชื่อสินค้า", "หมวดหมู่", "ค่าจ้าง/ชิ้น", "หน่วย", "สถานะ", "จัดการ"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/50">
                    <td className="px-5 py-4 text-sm font-mono text-muted">{p.code}</td>
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{p.name}</td>
                    <td className="px-5 py-4 text-sm text-muted">{p.category}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-primary-600">฿{p.wage}</td>
                    <td className="px-5 py-4 text-sm text-muted">{p.unit}</td>
                    <td className="px-5 py-4">
                      <Badge label={p.status} variant={p.badge} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-accent-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
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

"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { Plus, Edit2, Trash2, Shield, Clock, Calendar, AlertTriangle } from "lucide-react";

const rules = [
  {
    id: 1,
    category: "เวลาทำงาน",
    name: "เวลาเข้างานปกติ",
    description: "เข้างาน 08:00 - เลิกงาน 17:00 พักเที่ยง 12:00-13:00",
    status: "ใช้งาน",
    badge: "success" as const,
    icon: Clock,
  },
  {
    id: 2,
    category: "เวลาทำงาน",
    name: "กฏการมาสาย",
    description: "สายเกิน 15 นาที หัก 50 บาท, เกิน 30 นาที หัก 100 บาท",
    status: "ใช้งาน",
    badge: "success" as const,
    icon: AlertTriangle,
  },
  {
    id: 3,
    category: "การลา",
    name: "ลาป่วย",
    description: "ลาป่วยได้ 30 วัน/ปี โดยได้รับค่าจ้าง",
    status: "ใช้งาน",
    badge: "success" as const,
    icon: Calendar,
  },
  {
    id: 4,
    category: "การลา",
    name: "ลากิจ",
    description: "ลากิจได้ 10 วัน/ปี โดยได้รับค่าจ้าง",
    status: "ใช้งาน",
    badge: "success" as const,
    icon: Calendar,
  },
  {
    id: 5,
    category: "การลา",
    name: "ลาพักร้อน",
    description: "ลาพักร้อนได้ 6 วัน/ปี (อายุงาน 1 ปีขึ้นไป)",
    status: "ใช้งาน",
    badge: "success" as const,
    icon: Calendar,
  },
  {
    id: 6,
    category: "OT",
    name: "ค่าล่วงเวลาวันปกติ",
    description: "OT วันปกติ x1.5 เท่าของค่าจ้างรายชั่วโมง",
    status: "ใช้งาน",
    badge: "success" as const,
    icon: Clock,
  },
  {
    id: 7,
    category: "OT",
    name: "ค่าล่วงเวลาวันหยุด",
    description: "OT วันหยุด x3.0 เท่าของค่าจ้างรายชั่วโมง",
    status: "ใช้งาน",
    badge: "success" as const,
    icon: Clock,
  },
  {
    id: 8,
    category: "สวัสดิการ",
    name: "ประกันสังคม",
    description: "หักประกันสังคม 5% ของเงินเดือน (สูงสุด 750 บาท)",
    status: "ใช้งาน",
    badge: "success" as const,
    icon: Shield,
  },
];

export default function RulesPage() {
  const categories = [...new Set(rules.map((r) => r.category))];

  return (
    <>
      <Topbar title="กำหนดกฎระเบียบ" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">กฎและระเบียบบริษัท</h3>
            <p className="text-sm text-muted">กำหนดกฎเกณฑ์ต่างๆ สำหรับการบริหารงานบุคคล</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25">
            <Plus className="w-4 h-4" />
            เพิ่มกฎใหม่
          </button>
        </div>

        {categories.map((cat) => (
          <div key={cat}>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
              {cat}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules
                .filter((r) => r.category === cat)
                .map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div
                      key={rule.id}
                      className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-foreground">
                              {rule.name}
                            </h5>
                            <p className="text-sm text-muted mt-1">
                              {rule.description}
                            </p>
                            <div className="mt-3">
                              <Badge label={rule.status} variant={rule.badge} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary-600">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-accent-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

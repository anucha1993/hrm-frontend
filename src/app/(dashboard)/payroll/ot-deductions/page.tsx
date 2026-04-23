"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { Clock, DollarSign, MinusCircle, Search } from "lucide-react";

const otRecords = [
  { name: "สมชาย ใจดี", date: "18 เม.ย. 2026", hours: 3, rate: "x1.5", amount: 2700, type: "OT วันปกติ", badge: "info" as const },
  { name: "สมหญิง รักงาน", date: "19 เม.ย. 2026", hours: 4, rate: "x3.0", amount: 1800, type: "OT วันหยุด", badge: "warning" as const },
  { name: "มนัส ทำดี", date: "17 เม.ย. 2026", hours: 4, rate: "x1.5", amount: 3600, type: "OT วันปกติ", badge: "info" as const },
  { name: "ประยุทธ์ มั่นคง", date: "16 เม.ย. 2026", hours: 2, rate: "x1.5", amount: 900, type: "OT วันปกติ", badge: "info" as const },
];

const deductions = [
  { name: "ประยุทธ์ มั่นคง", type: "สาย", date: "16 เม.ย. 2026", detail: "สาย 20 นาที", amount: 100 },
  { name: "ประยุทธ์ มั่นคง", type: "สาย", date: "18 เม.ย. 2026", detail: "สาย 45 นาที", amount: 100 },
  { name: "สมชาย ใจดี", type: "สาย", date: "14 เม.ย. 2026", detail: "สาย 10 นาที", amount: 50 },
  { name: "ชัยวุฒิ แกร่ง", type: "ขาดงาน", date: "15 เม.ย. 2026", detail: "ขาดโดยไม่แจ้ง", amount: 500 },
];

const formatMoney = (n: number) => n.toLocaleString("th-TH");

export default function OTDeductionsPage() {
  return (
    <>
      <Topbar title="OT / หักเงิน" />
      <div className="p-6 space-y-6">
        {/* OT Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">รายการ OT</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { label: "OT วันปกติ (x1.5)", value: `฿${formatMoney(7200)}`, color: "bg-blue-50 text-blue-600" },
              { label: "OT วันหยุด (x3.0)", value: `฿${formatMoney(1800)}`, color: "bg-yellow-50 text-yellow-600" },
              { label: "OT รวมทั้งเดือน", value: `฿${formatMoney(9000)}`, color: "bg-primary-50 text-primary-600" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                <p className="text-xs opacity-70">{s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    {["พนักงาน", "วันที่", "ชั่วโมง", "อัตรา", "ประเภท", "จำนวนเงิน"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {otRecords.map((r, i) => (
                    <tr key={i} className="hover:bg-surface/50">
                      <td className="px-5 py-3 text-sm font-medium text-foreground">{r.name}</td>
                      <td className="px-5 py-3 text-sm text-muted">{r.date}</td>
                      <td className="px-5 py-3 text-sm text-foreground">{r.hours} ชม.</td>
                      <td className="px-5 py-3 text-sm font-semibold text-blue-600">{r.rate}</td>
                      <td className="px-5 py-3"><Badge label={r.type} variant={r.badge} /></td>
                      <td className="px-5 py-3 text-sm font-semibold text-green-600">+฿{formatMoney(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Deductions Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center">
              <MinusCircle className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">รายการหักเงิน</h3>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    {["พนักงาน", "ประเภท", "วันที่", "รายละเอียด", "จำนวนเงิน"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deductions.map((d, i) => (
                    <tr key={i} className="hover:bg-surface/50">
                      <td className="px-5 py-3 text-sm font-medium text-foreground">{d.name}</td>
                      <td className="px-5 py-3"><Badge label={d.type} variant={d.type === "ขาดงาน" ? "danger" : "warning"} /></td>
                      <td className="px-5 py-3 text-sm text-muted">{d.date}</td>
                      <td className="px-5 py-3 text-sm text-muted">{d.detail}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-accent-600">-฿{formatMoney(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

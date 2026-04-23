"use client";

import Topbar from "@/components/Topbar";
import { ArrowLeft, Download, DollarSign, TrendingUp, TrendingDown, Percent } from "lucide-react";
import Link from "next/link";

const formatMoney = (n: number) => n.toLocaleString("th-TH");

export default function PayrollReportPage() {
  return (
    <>
      <Topbar title="รายงานเงินเดือน" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/reports" className="p-2 rounded-lg hover:bg-white border border-border"><ArrowLeft className="w-4 h-4 text-muted" /></Link>
            <h3 className="text-lg font-semibold text-foreground">รายงานเงินเดือน</h3>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold">
            <Download className="w-4 h-4" /> ดาวน์โหลด
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "เงินเดือนรวม", value: `฿${formatMoney(1245000)}`, icon: DollarSign, color: "bg-primary-50 text-primary-600" },
            { label: "OT รวม", value: `฿${formatMoney(45000)}`, icon: TrendingUp, color: "bg-green-50 text-green-600" },
            { label: "หักรวม", value: `฿${formatMoney(32500)}`, icon: TrendingDown, color: "bg-accent-50 text-accent-600" },
            { label: "สุทธิรวม", value: `฿${formatMoney(1257500)}`, icon: Percent, color: "bg-blue-50 text-blue-600" },
          ].map((s) => { const Icon = s.icon; return (
            <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.color}`}>
              <Icon className="w-5 h-5" /><div><p className="text-xs opacity-70">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </div>
          ); })}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4">แนวโน้มเงินเดือนรายเดือน</h4>
          <div className="space-y-3">
            {[
              { month: "ม.ค. 2026", amount: 1200000 },
              { month: "ก.พ. 2026", amount: 1215000 },
              { month: "มี.ค. 2026", amount: 1230000 },
              { month: "เม.ย. 2026", amount: 1245000 },
            ].map((m) => (
              <div key={m.month} className="flex items-center gap-4">
                <span className="text-sm text-muted w-24">{m.month}</span>
                <div className="flex-1 bg-surface rounded-full h-5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-400 to-accent-400 rounded-full" style={{ width: `${(m.amount / 1300000) * 100}%` }}></div>
                </div>
                <span className="text-sm font-semibold text-foreground w-28 text-right">฿{formatMoney(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Cost */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4">ค่าใช้จ่ายเงินเดือนตามแผนก</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {["แผนก", "จำนวนคน", "เงินเดือนรวม", "OT รวม", "หักรวม", "สุทธิ"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { dept: "ฝ่ายผลิต", count: 60, salary: 480000, ot: 25000, deduct: 15000, net: 490000 },
                  { dept: "ฝ่ายบัญชี", count: 20, salary: 200000, ot: 5000, deduct: 5000, net: 200000 },
                  { dept: "ฝ่ายขาย", count: 30, salary: 250000, ot: 8000, deduct: 6000, net: 252000 },
                  { dept: "ฝ่ายบุคคล", count: 10, salary: 120000, ot: 2000, deduct: 3000, net: 119000 },
                  { dept: "ฝ่ายไอที", count: 16, salary: 130000, ot: 3000, deduct: 2500, net: 130500 },
                  { dept: "ฝ่ายการตลาด", count: 20, salary: 165000, ot: 2000, deduct: 3000, net: 164000 },
                ].map((d) => (
                  <tr key={d.dept} className="hover:bg-surface/50">
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{d.dept}</td>
                    <td className="px-5 py-3 text-sm text-muted">{d.count} คน</td>
                    <td className="px-5 py-3 text-sm text-foreground text-right">฿{formatMoney(d.salary)}</td>
                    <td className="px-5 py-3 text-sm text-blue-600 text-right">฿{formatMoney(d.ot)}</td>
                    <td className="px-5 py-3 text-sm text-accent-600 text-right">-฿{formatMoney(d.deduct)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-primary-600 text-right">฿{formatMoney(d.net)}</td>
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

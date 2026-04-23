"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import StatCard from "@/components/StatCard";
import { Calculator, DollarSign, Clock, TrendingDown, Search, Download, Settings } from "lucide-react";

const payrollData = [
  { id: "EMP001", name: "สมชาย ใจดี", dept: "ฝ่ายผลิต", baseSalary: 18000, productWage: 4500, ot: 2700, totalEarning: 25200, socialSecurity: 750, tax: 0, late: 100, totalDeduct: 850, netPay: 24350 },
  { id: "EMP002", name: "สมหญิง รักงาน", dept: "ฝ่ายบัญชี", baseSalary: 22000, productWage: 0, ot: 1800, totalEarning: 23800, socialSecurity: 750, tax: 350, late: 0, totalDeduct: 1100, netPay: 22700 },
  { id: "EMP003", name: "ประยุทธ์ มั่นคง", dept: "ฝ่ายขาย", baseSalary: 20000, productWage: 0, ot: 900, totalEarning: 20900, socialSecurity: 750, tax: 0, late: 200, totalDeduct: 950, netPay: 19950 },
  { id: "EMP004", name: "วิภา สดใส", dept: "ฝ่ายบุคคล", baseSalary: 35000, productWage: 0, ot: 0, totalEarning: 35000, socialSecurity: 750, tax: 1500, late: 0, totalDeduct: 2250, netPay: 32750 },
  { id: "EMP005", name: "มนัส ทำดี", dept: "ฝ่ายไอที", baseSalary: 30000, productWage: 0, ot: 3600, totalEarning: 33600, socialSecurity: 750, tax: 1200, late: 0, totalDeduct: 1950, netPay: 31650 },
  { id: "EMP006", name: "นภา สวยงาม", dept: "ฝ่ายการตลาด", baseSalary: 25000, productWage: 0, ot: 0, totalEarning: 25000, socialSecurity: 750, tax: 500, late: 0, totalDeduct: 1250, netPay: 23750 },
];

const formatMoney = (n: number) => n.toLocaleString("th-TH");

export default function PayrollPage() {
  const totalNet = payrollData.reduce((a, b) => a + b.netPay, 0);
  const totalOT = payrollData.reduce((a, b) => a + b.ot, 0);
  const totalDeductions = payrollData.reduce((a, b) => a + b.totalDeduct, 0);

  return (
    <>
      <Topbar title="คำนวณเงินเดือน" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">สรุปเงินเดือนประจำเดือน</h3>
            <p className="text-sm text-muted">เมษายน 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm">
              <option>เมษายน 2026</option>
              <option>มีนาคม 2026</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25">
              <Calculator className="w-4 h-4" />
              คำนวณใหม่
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="เงินเดือนสุทธิรวม" value={`฿${formatMoney(totalNet)}`} icon={<DollarSign className="w-5 h-5" />} color="orange" />
          <StatCard title="ค่า OT รวม" value={`฿${formatMoney(totalOT)}`} icon={<Clock className="w-5 h-5" />} color="blue" />
          <StatCard title="ยอดหักรวม" value={`฿${formatMoney(totalDeductions)}`} icon={<TrendingDown className="w-5 h-5" />} color="red" />
          <StatCard title="จำนวนพนักงาน" value={payrollData.length} icon={<Calculator className="w-5 h-5" />} color="green" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">รายละเอียดเงินเดือน</h4>
            <button className="flex items-center gap-2 text-sm text-primary-600 font-medium hover:text-primary-700">
              <Download className="w-4 h-4" /> ส่งออก Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {["รหัส", "ชื่อ", "เงินเดือน", "ค่าจ้างชิ้น", "OT", "รวมรายได้", "ประกันสังคม", "ภาษี", "หักสาย", "รวมหัก", "สุทธิ"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrollData.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 text-xs font-mono text-muted">{p.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-foreground text-right">{formatMoney(p.baseSalary)}</td>
                    <td className="px-4 py-3 text-sm text-foreground text-right">{formatMoney(p.productWage)}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium text-right">{formatMoney(p.ot)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">{formatMoney(p.totalEarning)}</td>
                    <td className="px-4 py-3 text-sm text-accent-600 text-right">-{formatMoney(p.socialSecurity)}</td>
                    <td className="px-4 py-3 text-sm text-accent-600 text-right">-{formatMoney(p.tax)}</td>
                    <td className="px-4 py-3 text-sm text-accent-600 text-right">-{formatMoney(p.late)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-accent-600 text-right">-{formatMoney(p.totalDeduct)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-primary-600 text-right">{formatMoney(p.netPay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface font-semibold border-t-2 border-border">
                  <td colSpan={2} className="px-4 py-3 text-sm text-foreground">รวมทั้งหมด</td>
                  <td className="px-4 py-3 text-sm text-foreground text-right">{formatMoney(payrollData.reduce((a, b) => a + b.baseSalary, 0))}</td>
                  <td className="px-4 py-3 text-sm text-foreground text-right">{formatMoney(payrollData.reduce((a, b) => a + b.productWage, 0))}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 text-right">{formatMoney(totalOT)}</td>
                  <td className="px-4 py-3 text-sm text-foreground text-right">{formatMoney(payrollData.reduce((a, b) => a + b.totalEarning, 0))}</td>
                  <td className="px-4 py-3 text-sm text-accent-600 text-right">-{formatMoney(payrollData.reduce((a, b) => a + b.socialSecurity, 0))}</td>
                  <td className="px-4 py-3 text-sm text-accent-600 text-right">-{formatMoney(payrollData.reduce((a, b) => a + b.tax, 0))}</td>
                  <td className="px-4 py-3 text-sm text-accent-600 text-right">-{formatMoney(payrollData.reduce((a, b) => a + b.late, 0))}</td>
                  <td className="px-4 py-3 text-sm text-accent-600 text-right">-{formatMoney(totalDeductions)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-primary-600 text-right">{formatMoney(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

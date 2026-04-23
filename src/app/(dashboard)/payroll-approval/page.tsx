"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { CheckCircle, XCircle, Clock, DollarSign, Download, FileText } from "lucide-react";

const approvalData = [
  { month: "เมษายน 2026", employees: 156, totalAmount: 1245000, status: "รออนุมัติ", badge: "warning" as const, approvedBy: "-", approvedDate: "-" },
  { month: "มีนาคม 2026", employees: 154, totalAmount: 1230000, status: "อนุมัติแล้ว", badge: "success" as const, approvedBy: "Admin", approvedDate: "31 มี.ค. 2026" },
  { month: "กุมภาพันธ์ 2026", employees: 152, totalAmount: 1215000, status: "อนุมัติแล้ว", badge: "success" as const, approvedBy: "Admin", approvedDate: "28 ก.พ. 2026" },
  { month: "มกราคม 2026", employees: 150, totalAmount: 1200000, status: "อนุมัติแล้ว", badge: "success" as const, approvedBy: "Admin", approvedDate: "31 ม.ค. 2026" },
];

const formatMoney = (n: number) => n.toLocaleString("th-TH");

export default function PayrollApprovalPage() {
  return (
    <>
      <Topbar title="อนุมัติเงินเดือน" />
      <div className="p-6 space-y-6">
        {/* Pending Approval Banner */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">รอบเงินเดือน เมษายน 2026</h3>
                <p className="text-sm text-muted mt-1">พนักงาน 156 คน | ยอดรวม ฿{formatMoney(1245000)}</p>
                <p className="text-xs text-yellow-600 mt-2">⏳ รอการอนุมัติจากผู้มีสิทธิ์</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-white transition-colors">
                <FileText className="w-4 h-4" />
                ดูรายละเอียด
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/25">
                <CheckCircle className="w-4 h-4" />
                อนุมัติ
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-semibold hover:bg-accent-600 transition-colors">
                <XCircle className="w-4 h-4" />
                ไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "รอบเดือนปัจจุบัน", value: "เม.ย. 2026", color: "bg-primary-50 text-primary-600", icon: Clock },
            { label: "ยอดเงินรวม", value: `฿${formatMoney(1245000)}`, color: "bg-green-50 text-green-600", icon: DollarSign },
            { label: "จำนวนพนักงาน", value: "156 คน", color: "bg-blue-50 text-blue-600", icon: FileText },
            { label: "สถานะ", value: "รออนุมัติ", color: "bg-yellow-50 text-yellow-600", icon: Clock },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.color}`}>
                <Icon className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-xs opacity-70">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">ประวัติการอนุมัติ</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {["รอบเดือน", "จำนวนพนักงาน", "ยอดเงินรวม", "สถานะ", "อนุมัติโดย", "วันที่อนุมัติ", "จัดการ"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {approvalData.map((a, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{a.month}</td>
                    <td className="px-5 py-4 text-sm text-muted">{a.employees} คน</td>
                    <td className="px-5 py-4 text-sm font-semibold text-foreground">฿{formatMoney(a.totalAmount)}</td>
                    <td className="px-5 py-4"><Badge label={a.status} variant={a.badge} /></td>
                    <td className="px-5 py-4 text-sm text-muted">{a.approvedBy}</td>
                    <td className="px-5 py-4 text-sm text-muted">{a.approvedDate}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-blue-600">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-green-600">
                          <Download className="w-4 h-4" />
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { apiFetch, apiDownload } from "@/lib/api";
import type { SummaryResponse, SummaryRow } from "@/lib/leave";
import { Loader2, BarChart3, Filter, Download } from "lucide-react";

interface Department {
  id: number;
  name: string;
}

export default function AttendanceSummaryPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [departmentId, setDepartmentId] = useState<string>("");
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  async function downloadExcel() {
    setDownloading(true);
    try {
      await apiDownload(
        `/attendance/summary/export`,
        `attendance-summary-${month}${departmentId ? `-dept${departmentId}` : ""}.xlsx`,
        { params: { month, department_id: departmentId || undefined } },
      );
    } finally {
      setDownloading(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("month", month);
      if (departmentId) params.set("department_id", departmentId);
      const res = await apiFetch<{ data: SummaryResponse }>(
        `/attendance/summary?${params.toString()}`,
      );
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function loadDepts() {
    try {
      const res = await apiFetch<{ data: Department[] | { data: Department[] } }>("/departments");
      const list = Array.isArray(res.data) ? res.data : res.data.data;
      setDepartments(list);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadDepts();
  }, []);

  useEffect(() => {
    load();
  }, [month, departmentId]);

  return (
    <>
      <Topbar title="สรุปเวลาทำงานรายเดือน" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">เดือน</label>
            <input
              type="month"
              className="payroll-input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">แผนก</label>
            <select
              className="payroll-input"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">— ทุกแผนก —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={downloadExcel}
              disabled={downloading || loading || !data}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              ดาวน์โหลด Excel
            </button>
            <div className="text-xs text-muted flex items-center gap-1">
              <Filter className="w-4 h-4" />
              {data && `ช่วง ${data.period.start} – ${data.period.end} (${data.period.total_days} วัน)`}
            </div>
          </div>
        </div>

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="พนักงาน" value={data.totals.employees} />
            <Stat label="วันมา (รวม)" value={data.totals.present_days} className="text-green-700" />
            <Stat label="วันขาด (รวม)" value={data.totals.absent_days} className="text-red-700" />
            <Stat label="วันลา (รวม)" value={data.totals.leave_days} className="text-amber-700" />
            <Stat label="ชั่วโมง OT (รวม)" value={data.totals.ot_hours} className="text-primary-700" />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : !data || data.rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            ไม่พบข้อมูล
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="bg-gray-50 border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="px-3 py-3">พนักงาน</th>
                    <th className="px-3 py-3">แผนก</th>
                    <th className="px-3 py-3 text-right">มา</th>
                    <th className="px-3 py-3 text-right">ขาด</th>
                    <th className="px-3 py-3 text-right">ลา (รวม)</th>
                    <th className="px-3 py-3 text-right">ลาจ่าย</th>
                    <th className="px-3 py-3 text-right">ลาไม่จ่าย</th>
                    <th className="px-3 py-3 text-right">มาสาย</th>
                    <th className="px-3 py-3 text-right">นาทีสาย</th>
                    <th className="px-3 py-3 text-right">OT (ชม.)</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r: SummaryRow) => (
                    <tr key={r.employee.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {r.employee.first_name} {r.employee.last_name}
                        </div>
                        <div className="text-xs text-muted font-mono">{r.employee.employee_code}</div>
                      </td>
                      <td className="px-3 py-3 text-xs">{r.employee.department?.name ?? "—"}</td>
                      <td className="px-3 py-3 text-right text-green-700 font-medium">{r.present_days}</td>
                      <td className="px-3 py-3 text-right text-red-700">{r.absent_days}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="text-amber-700 font-medium">{r.leave_days}</div>
                        {r.leave_breakdown.length > 0 && (
                          <div className="flex gap-1 justify-end mt-0.5">
                            {r.leave_breakdown.map((lb) => (
                              <span
                                key={lb.code}
                                title={`${lb.name}: ${lb.days} วัน`}
                                className="text-[10px] px-1 rounded"
                                style={{ background: lb.color + "33", color: lb.color }}
                              >
                                {lb.code} {lb.days}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">{r.paid_leave_days}</td>
                      <td className="px-3 py-3 text-right">{r.unpaid_leave_days}</td>
                      <td className="px-3 py-3 text-right">{r.late_count}</td>
                      <td className="px-3 py-3 text-right text-xs text-muted">{r.late_minutes}</td>
                      <td className="px-3 py-3 text-right text-primary-700">{r.ot_hours}</td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/attendance/summary/${r.employee.id}?month=${month}`}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          รายวัน
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${className ?? ""}`}>{value}</div>
    </div>
  );
}

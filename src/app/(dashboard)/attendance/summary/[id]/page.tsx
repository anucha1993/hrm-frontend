"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { apiFetch } from "@/lib/api";
import type { DailyEntry } from "@/lib/leave";
import { ArrowLeft, Loader2 } from "lucide-react";

interface DailyResponse {
  employee: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
  };
  month: string;
  days: DailyEntry[];
}

const STATUS_LABEL: Record<DailyEntry["status"], string> = {
  present: "มา",
  late: "สาย",
  absent: "ขาด",
  leave: "ลา",
  weekend: "วันหยุด",
};

const STATUS_COLOR: Record<DailyEntry["status"], string> = {
  present: "#10b981",
  late: "#f59e0b",
  absent: "#ef4444",
  leave: "#3b82f6",
  weekend: "#9ca3af",
};

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function EmployeeDailySummaryPage() {
  const params = useParams();
  const search = useSearchParams();
  const id = Number(params?.id);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(search?.get("month") ?? defaultMonth);
  const [data, setData] = useState<DailyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: DailyResponse }>(
        `/attendance/summary/${id}/daily?month=${month}`,
      );
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id, month]);

  const totals = data
    ? data.days.reduce(
        (acc, d) => {
          acc[d.status]++;
          if (d.late_minutes > 0) acc.late_minutes += d.late_minutes;
          return acc;
        },
        { present: 0, late: 0, absent: 0, leave: 0, weekend: 0, late_minutes: 0 } as Record<string, number>,
      )
    : null;

  return (
    <>
      <Topbar title="สรุปเวลารายวัน" />
      <div className="p-6 space-y-4">
        <Link href="/attendance/summary" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> กลับไปสรุปรวม
        </Link>

        <div className="bg-white rounded-xl border border-border p-4 flex items-end gap-3 flex-wrap">
          {data && (
            <div>
              <div className="text-xs text-muted">พนักงาน</div>
              <div className="font-semibold">
                {data.employee.first_name} {data.employee.last_name}{" "}
                <span className="text-xs font-mono text-muted">({data.employee.employee_code})</span>
              </div>
            </div>
          )}
          <div className="ml-auto">
            <label className="block text-xs font-medium text-muted mb-1">เดือน</label>
            <input
              type="month"
              className="payroll-input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </div>

        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(["present", "late", "absent", "leave", "weekend"] as const).map((s) => (
              <div key={s} className="bg-white rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                  <div className="text-xs text-muted">{STATUS_LABEL[s]}</div>
                </div>
                <div className="mt-1 text-2xl font-bold" style={{ color: STATUS_COLOR[s] }}>
                  {totals[s]}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : !data ? null : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="px-3 py-3 w-32">วันที่</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3">เข้างาน</th>
                  <th className="px-3 py-3">เลิกงาน</th>
                  <th className="px-3 py-3 text-right">นาทีสาย</th>
                  <th className="px-3 py-3">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {data.days.map((d) => (
                  <tr key={d.date} className={`border-b border-border last:border-0 ${d.status === "weekend" ? "bg-gray-50/40" : ""}`}>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {d.date}{" "}
                      <span className="text-muted">({DOW[d.day_of_week]})</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: STATUS_COLOR[d.status] + "22", color: STATUS_COLOR[d.status] }}
                      >
                        {STATUS_LABEL[d.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{d.check_in ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{d.check_out ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right text-xs">
                      {d.late_minutes > 0 ? <span className="text-amber-700">{d.late_minutes}</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {d.leave && (
                        <span style={{ color: d.leave.color }}>
                          {d.leave.type}{d.leave.is_half_day ? " (ครึ่งวัน)" : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

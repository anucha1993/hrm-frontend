"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coffee,
  FileText,
  ListTodo,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import Topbar from "@/components/Topbar";
import { apiFetch } from "@/lib/api";
import {
  LineChart,
  ReportSection,
  StatCard,
  formatNumber,
  formatTHB,
} from "@/components/reports/ReportPrimitives";

type LeaveBalance = {
  leave_type: string | null;
  quota: number;
  used: number;
  pending: number;
  remaining: number;
};

type UpcomingTask = {
  id: number;
  code: string;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
  overdue: boolean;
};

type LatestSlip = {
  slip_id: number;
  period_name: string | null;
  period_code: string | null;
  status: string;
  net_pay: number;
  pay_date: string | null;
};

type MeData = {
  employee: {
    id: number;
    employee_code: string;
    name: string;
    department: string | null;
  };
  today_attendance: {
    check_in_at: string | null;
    check_out_at: string | null;
    late_minutes: number;
    status: string | null;
  };
  tasks: { upcoming: UpcomingTask[]; overdue_count: number };
  leave_balances: LeaveBalance[];
  latest_slip: LatestSlip | null;
};

type DashboardData = {
  role: "admin" | "employee";
  me: MeData | null;
  today: {
    employees_active: number;
    present: number;
    late: number;
    on_leave: number;
    absent: number;
  } | null;
  pending: {
    leave_requests: number;
    ot_sessions: number;
    payroll_periods: number;
  } | null;
  trends: {
    attendance_30d: Array<{ date: string; present: number; late: number }>;
    payroll_6m: Array<{
      period_code: string;
      period_name: string;
      month: string;
      base: number;
      ot: number;
      bonus: number;
      net: number;
    }>;
  } | null;
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700",
  high: "bg-amber-100 text-amber-700",
  normal: "bg-slate-100 text-slate-600",
  low: "bg-slate-100 text-slate-500",
};

const PAYROLL_STATUS_LABEL: Record<string, string> = {
  draft: "ฉบับร่าง",
  computing: "กำลังคำนวณ",
  pending_l1: "รออนุมัติ L1",
  pending_l2: "รออนุมัติ L2",
  approved: "อนุมัติแล้ว",
  paid: "จ่ายแล้ว",
  cancelled: "ยกเลิก",
};

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: DashboardData }>("/dashboard/summary")
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <Topbar title="แดชบอร์ด" />
        <div className="p-6 text-center text-slate-500">กำลังโหลด...</div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Topbar title="แดชบอร์ด" />
        <div className="p-6">
          <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
            {error ?? "ไม่มีข้อมูล"}
          </div>
        </div>
      </>
    );
  }

  const isAdmin = data.role === "admin";
  const totalPending =
    (data.pending?.leave_requests ?? 0) +
    (data.pending?.ot_sessions ?? 0) +
    (data.pending?.payroll_periods ?? 0);

  return (
    <>
      <Topbar title="แดชบอร์ด" />
      <div className="p-6 space-y-6">
        {/* Welcome */}
        {data.me ? (
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-primary-50 to-accent-50 p-5 shadow-sm">
            <div className="text-sm text-slate-600">สวัสดี</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {data.me.employee.name}
              <span className="ml-2 font-mono text-sm text-slate-500">
                ({data.me.employee.employee_code})
              </span>
            </div>
            <div className="text-sm text-slate-600">
              {data.me.employee.department ?? "ไม่ระบุแผนก"} ·{" "}
              {new Date().toLocaleDateString("th-TH", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        ) : null}

        {/* ZONE 1: Today company-wide stats (admin only) */}
        {isAdmin && data.today ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              ภาพรวมวันนี้
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard
                label="พนักงานทั้งหมด"
                value={formatNumber(data.today.employees_active)}
              />
              <StatCard
                label="มาทำงาน"
                value={formatNumber(data.today.present)}
                tone="positive"
              />
              <StatCard
                label="มาสาย"
                value={formatNumber(data.today.late)}
                tone="warning"
              />
              <StatCard
                label="ลา"
                value={formatNumber(data.today.on_leave)}
                tone="info"
              />
              <StatCard
                label="ขาด"
                value={formatNumber(data.today.absent)}
                tone="negative"
              />
            </div>
          </section>
        ) : null}

        {/* ZONE 2: Action items */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Me-side */}
          {data.me ? (
            <div className="space-y-3">
              {/* Today attendance */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserCheck className="h-4 w-4" /> เข้างานวันนี้
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-slate-500">เข้างาน</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {fmtTime(data.me.today_attendance.check_in_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">เลิกงาน</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {fmtTime(data.me.today_attendance.check_out_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">สถานะ</div>
                    <div className="mt-1">
                      {data.me.today_attendance.check_in_at ? (
                        data.me.today_attendance.late_minutes > 0 ? (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            สาย {data.me.today_attendance.late_minutes} นาที
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                            ตรงเวลา
                          </span>
                        )
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          ยังไม่ลงเวลา
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ListTodo className="h-4 w-4" /> งานของคุณ
                  </div>
                  {data.me.tasks.overdue_count > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                      <AlertTriangle className="h-3 w-3" />
                      เกินกำหนด {data.me.tasks.overdue_count}
                    </span>
                  ) : null}
                </div>
                {data.me.tasks.upcoming.length === 0 ? (
                  <div className="py-4 text-center text-sm text-slate-400">
                    ไม่มีงานค้าง
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.me.tasks.upcoming.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/tasks/${t.id}`}
                          className="flex items-center justify-between gap-2 py-2 hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{t.title}</div>
                            <div className="text-xs text-slate-500">
                              <span className="font-mono">{t.code}</span>
                              {t.due_date ? (
                                <span
                                  className={`ml-2 ${t.overdue ? "text-rose-600" : "text-slate-500"}`}
                                >
                                  · ครบกำหนด{" "}
                                  {new Date(t.due_date).toLocaleDateString("th-TH")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${PRIORITY_TONE[t.priority] ?? PRIORITY_TONE.normal}`}
                          >
                            {t.priority}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Leave balance */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Coffee className="h-4 w-4" /> วันลาคงเหลือ (ปี {new Date().getFullYear()})
                </div>
                {data.me.leave_balances.length === 0 ? (
                  <div className="py-2 text-sm text-slate-400">ยังไม่มีข้อมูลโควต้า</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {data.me.leave_balances.map((b, i) => (
                      <div key={i} className="rounded border border-slate-200 p-2 text-center">
                        <div className="text-xs text-slate-500">{b.leave_type ?? "-"}</div>
                        <div className="text-lg font-semibold text-emerald-700 tabular-nums">
                          {b.remaining}
                        </div>
                        <div className="text-xs text-slate-400">/ {b.quota}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Latest payslip */}
              {data.me.latest_slip ? (
                <Link
                  href={`/payslips/${data.me.latest_slip.slip_id}`}
                  target="_blank"
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary-300 hover:bg-primary-50/30"
                >
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Wallet className="h-4 w-4" /> สลิปเงินเดือนล่าสุด
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-slate-500">
                        {data.me.latest_slip.period_name ?? data.me.latest_slip.period_code}
                      </div>
                      <div className="text-xs text-slate-400">
                        {PAYROLL_STATUS_LABEL[data.me.latest_slip.status] ?? data.me.latest_slip.status}
                      </div>
                    </div>
                    <div className="text-xl font-semibold tabular-nums text-emerald-700">
                      {formatTHB(data.me.latest_slip.net_pay)}
                    </div>
                  </div>
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              บัญชีผู้ใช้นี้ยังไม่ถูกผูกกับข้อมูลพนักงาน
            </div>
          )}

          {/* Pending approvals (admin only) */}
          {isAdmin && data.pending ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4" /> รออนุมัติ
                  </div>
                  <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                    รวม {totalPending}
                  </span>
                </div>
                <div className="grid gap-2">
                  <Link
                    href="/leave/approvals"
                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 hover:border-amber-300 hover:bg-amber-50/50"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-amber-600" />
                      ใบลารออนุมัติ
                    </div>
                    <span className="font-semibold tabular-nums text-amber-700">
                      {data.pending.leave_requests}
                    </span>
                  </Link>
                  <Link
                    href="/payroll/ot"
                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 hover:border-sky-300 hover:bg-sky-50/50"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-sky-600" />
                      OT รอบันทึก/ปิด
                    </div>
                    <span className="font-semibold tabular-nums text-sky-700">
                      {data.pending.ot_sessions}
                    </span>
                  </Link>
                  <Link
                    href="/payroll-approval"
                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      งวดเงินเดือนรออนุมัติ
                    </div>
                    <span className="font-semibold tabular-nums text-emerald-700">
                      {data.pending.payroll_periods}
                    </span>
                  </Link>
                </div>
              </div>

              {/* Quick links */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <TrendingUp className="h-4 w-4" /> ทางลัด
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Link href="/employees" className="rounded border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <Users className="mb-1 h-4 w-4 text-primary-600" />
                    จัดการพนักงาน
                  </Link>
                  <Link href="/attendance" className="rounded border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <UserCheck className="mb-1 h-4 w-4 text-sky-600" />
                    ลงเวลางาน
                  </Link>
                  <Link href="/reports" className="rounded border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <FileText className="mb-1 h-4 w-4 text-emerald-600" />
                    รายงาน
                  </Link>
                  <Link href="/payroll" className="rounded border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <Wallet className="mb-1 h-4 w-4 text-amber-600" />
                    คำนวณเงินเดือน
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* ZONE 3: Trends (admin only) */}
        {isAdmin && data.trends ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <ReportSection
              title="แนวโน้มการเข้างาน 30 วัน"
              description="จำนวนพนักงานที่เข้างาน/มาสายต่อวัน"
            >
              <LineChart
                data={data.trends.attendance_30d as unknown as Array<Record<string, unknown>>}
                labelKey="date"
                valueKey="present"
                color="#10b981"
                height={180}
                formatter={(v) => `${v} คน`}
              />
            </ReportSection>

            <ReportSection
              title="ค่าจ้างรวม 6 เดือนล่าสุด"
              description="ยอดสุทธิรวมของแต่ละงวด"
            >
              {data.trends.payroll_6m.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">ไม่มีงวดในช่วงนี้</div>
              ) : (
                <LineChart
                  data={data.trends.payroll_6m as unknown as Array<Record<string, unknown>>}
                  labelKey="month"
                  valueKey="net"
                  color="#0ea5e9"
                  height={180}
                  formatter={formatTHB}
                />
              )}
            </ReportSection>
          </section>
        ) : null}
      </div>
    </>
  );
}

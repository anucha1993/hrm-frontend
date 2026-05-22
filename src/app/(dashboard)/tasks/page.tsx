"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Topbar from "@/components/Topbar";
import {
  ClipboardList,
  Plus,
  Search,
  Star,
  Camera,
  AlertCircle,
} from "lucide-react";

type Assignee = {
  id: number;
  employee_id: number;
  status: "pending" | "in_progress" | "submitted" | "approved" | "rejected";
  rating: number | null;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    nickname?: string | null;
  };
};

type Task = {
  id: number;
  code: string;
  title: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "submitted" | "completed" | "cancelled";
  due_date: string | null;
  location_name: string | null;
  assignees: Assignee[];
  created_at: string;
};

const STATUS_LABEL: Record<Task["status"], string> = {
  open: "เปิดงาน",
  in_progress: "กำลังทำ",
  submitted: "ส่งงานแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const STATUS_COLOR: Record<Task["status"], string> = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-600",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "ต่ำ",
  normal: "ปกติ",
  high: "สูง",
  urgent: "เร่งด่วน",
};

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-sky-100 text-sky-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-rose-100 text-rose-700",
};

export default function TasksPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("tasks.manage");

  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("per_page", "100");
      const res = await apiFetch<{ data: { data: Task[] } }>(`/tasks?${params}`);
      setItems(res.data.data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filteredItems = useMemo(() => items, [items]);

  return (
    <>
      <Topbar title="มอบหมายงาน" />
      <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
            <ClipboardList className="h-7 w-7 text-indigo-600" /> มอบหมายงาน
          </h1>
          <p className="text-sm text-slate-500">
            {canManage
              ? "รายการงานทั้งหมดในระบบ"
              : "รายการงานที่คุณได้รับมอบหมาย"}
          </p>
        </div>
        {canManage && (
          <Link
            href="/tasks/create"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> สร้างงานใหม่
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs text-slate-600">ค้นหา</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="ค้นหารหัสงาน / หัวข้อ"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">สถานะ</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">ทั้งหมด</option>
            <option value="open">เปิดงาน</option>
            <option value="in_progress">กำลังทำ</option>
            <option value="submitted">ส่งงานแล้ว</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          ค้นหา
        </button>
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" /> {err}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">รหัส / หัวข้อ</th>
              <th className="px-4 py-3">ผู้รับงาน</th>
              <th className="px-4 py-3">ความสำคัญ</th>
              <th className="px-4 py-3">กำหนดเสร็จ</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3 text-right">คะแนน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  กำลังโหลด...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  ไม่พบงาน
                </td>
              </tr>
            ) : (
              filteredItems.map((t) => {
                const ratings = t.assignees
                  .map((a) => a.rating)
                  .filter((r): r is number => r !== null);
                const avg = ratings.length
                  ? ratings.reduce((s, r) => s + r, 0) / ratings.length
                  : 0;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {t.code}
                      </Link>
                      <div className="text-slate-700">{t.title}</div>
                      {t.location_name && (
                        <div className="text-xs text-slate-400">
                          @ {t.location_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.assignees.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                            title={a.employee?.employee_code}
                          >
                            {a.employee?.nickname ||
                              `${a.employee?.first_name ?? ""} ${a.employee?.last_name ?? ""}`.trim() ||
                              `#${a.employee_id}`}
                          </span>
                        ))}
                        {t.assignees.length > 3 && (
                          <span className="text-xs text-slate-500">
                            +{t.assignees.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${PRIORITY_COLOR[t.priority]}`}
                      >
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.due_date ? t.due_date.slice(0, 10) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLOR[t.status]}`}
                      >
                        {t.status === "submitted" && (
                          <Camera className="h-3 w-3" />
                        )}
                        {STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ratings.length > 0 ? (
                        <div className="inline-flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{avg.toFixed(1)}</span>
                          <span className="text-xs text-slate-400">
                            ({ratings.length})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}

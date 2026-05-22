"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { ClipboardList } from "lucide-react";
import Topbar from "@/components/Topbar";
import TaskForm, { type TaskInitial } from "../../TaskForm";

type TaskFull = {
  id: number;
  title: string;
  description: string | null;
  priority: TaskInitial["priority"];
  due_date: string | null;
  location_name: string | null;
  note: string | null;
  assignees: { employee_id: number }[];
};

export default function EditTaskPage() {
  const params = useParams();
  const taskId = Number(params.id);
  const [initial, setInitial] = useState<TaskInitial | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ data: TaskFull }>(`/tasks/${taskId}`);
        const t = res.data;
        setInitial({
          id: t.id,
          title: t.title,
          description: t.description ?? "",
          priority: t.priority,
          due_date: t.due_date ? t.due_date.slice(0, 10) : "",
          location_name: t.location_name ?? "",
          note: t.note ?? "",
          employee_ids: t.assignees.map((a) => a.employee_id),
        });
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    })();
  }, [taskId]);

  return (
    <>
      <Topbar title="แก้ไขใบมอบหมายงาน" />
      <div className="p-6 space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
          <ClipboardList className="h-7 w-7 text-indigo-600" /> แก้ไขใบมอบหมายงาน
        </h1>
        {err && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {err}
          </div>
        )}
        {initial ? (
          <TaskForm mode="edit" initial={initial} />
        ) : (
          !err && <div className="text-slate-400">กำลังโหลด...</div>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { CheckCircle2, AlertCircle, UserPlus, X } from "lucide-react";

type EmployeeBrief = {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  nickname?: string | null;
};

export type TaskInitial = {
  id?: number;
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string;
  location_name: string;
  note: string;
  employee_ids: number[];
};

const DEFAULT_INITIAL: TaskInitial = {
  title: "",
  description: "",
  priority: "normal",
  due_date: "",
  location_name: "",
  note: "",
  employee_ids: [],
};

export default function TaskForm({
  initial,
  mode,
}: {
  initial?: TaskInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<TaskInitial>(initial ?? DEFAULT_INITIAL);
  const [employees, setEmployees] = useState<EmployeeBrief[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ data: { data: EmployeeBrief[] } }>(
          "/employees?per_page=500&status=active"
        );
        setEmployees(res.data.data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "โหลดพนักงานไม่สำเร็จ");
      }
    })();
  }, []);

  function update<K extends keyof TaskInitial>(key: K, value: TaskInitial[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function toggleEmployee(id: number) {
    setForm((p) => ({
      ...p,
      employee_ids: p.employee_ids.includes(id)
        ? p.employee_ids.filter((x) => x !== id)
        : [...p.employee_ids, id],
    }));
  }

  function removeEmployee(id: number) {
    setForm((p) => ({
      ...p,
      employee_ids: p.employee_ids.filter((x) => x !== id),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccessMsg(null);
    if (!form.title.trim()) {
      setErr("กรุณาระบุหัวข้องาน");
      return;
    }
    if (form.employee_ids.length === 0) {
      setErr("กรุณาเลือกผู้รับมอบหมายงานอย่างน้อย 1 คน");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      due_date: form.due_date || null,
      location_name: form.location_name || null,
      note: form.note || null,
      employee_ids: form.employee_ids,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await apiFetch<{ data: { id: number } }>("/tasks", {
          method: "POST",
          body: payload,
        });
        setSuccessMsg("✔ สร้างงานสำเร็จ — กำลังไปยังหน้ารายละเอียด...");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => router.push(`/tasks/${res.data.id}`), 700);
      } else {
        await apiFetch(`/tasks/${initial?.id}`, {
          method: "PUT",
          body: payload,
        });
        setSuccessMsg("✔ บันทึกสำเร็จ");
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      let msg = "บันทึกไม่สำเร็จ";
      if (e instanceof ApiError) {
        msg = e.message;
        const data = e.data as { message?: string; errors?: Record<string, string[]> } | null;
        if (data?.errors) {
          msg = Object.values(data.errors).flat().join("\n");
        } else if (data?.message) {
          msg = data.message;
        }
      } else if (e instanceof Error) {
        msg = e.message;
      }
      setErr(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  const selected = employees.filter((e) => form.employee_ids.includes(e.id));
  const filteredOptions = employees
    .filter((e) => !form.employee_ids.includes(e.id))
    .filter((e) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        e.employee_code.toLowerCase().includes(s) ||
        e.first_name.toLowerCase().includes(s) ||
        e.last_name.toLowerCase().includes(s) ||
        (e.nickname?.toLowerCase().includes(s) ?? false)
      );
    })
    .slice(0, 30);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> {successMsg}
        </div>
      )}
      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 whitespace-pre-wrap">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            หัวข้องาน <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="เช่น ทำความสะอาดโรงงาน A"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            รายละเอียดงาน
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            ความสำคัญ
          </label>
          <select
            value={form.priority}
            onChange={(e) =>
              update("priority", e.target.value as TaskInitial["priority"])
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="low">ต่ำ</option>
            <option value="normal">ปกติ</option>
            <option value="high">สูง</option>
            <option value="urgent">เร่งด่วน</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            กำหนดเสร็จ
          </label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => update("due_date", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            สถานที่ปฏิบัติงาน
          </label>
          <input
            value={form.location_name}
            onChange={(e) => update("location_name", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            หมายเหตุ
          </label>
          <input
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Assignees */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <UserPlus className="h-4 w-4 text-indigo-600" /> ผู้รับมอบหมายงาน
            <span className="text-rose-500">*</span>
            <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
              {form.employee_ids.length} คน
            </span>
          </h3>
        </div>

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selected.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs text-indigo-800"
              >
                {e.employee_code} {e.first_name} {e.last_name}
                {e.nickname && ` (${e.nickname})`}
                <button
                  type="button"
                  onClick={() => removeEmployee(e.id)}
                  className="hover:text-rose-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="พิมพ์ค้นหารหัส / ชื่อ / ชื่อเล่น..."
          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              ไม่พบพนักงาน
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredOptions.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => toggleEmployee(e.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-indigo-50"
                  >
                    <span>
                      <span className="font-mono text-xs text-slate-500">
                        {e.employee_code}
                      </span>{" "}
                      {e.first_name} {e.last_name}
                      {e.nickname && (
                        <span className="ml-1 text-xs text-slate-400">
                          ({e.nickname})
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-indigo-600">+ เพิ่ม</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/tasks")}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : mode === "create" ? "สร้างงาน" : "บันทึก"}
        </button>
      </div>
    </form>
  );
}

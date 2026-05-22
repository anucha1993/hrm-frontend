"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Topbar from "@/components/Topbar";
import {
  ClipboardList,
  Star,
  Camera,
  Printer,
  Edit2,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";

type Assignee = {
  id: number;
  employee_id: number;
  status: "pending" | "in_progress" | "submitted" | "approved" | "rejected";
  before_photo_url: string | null;
  after_photo_url: string | null;
  before_photo_path: string | null;
  after_photo_path: string | null;
  started_at: string | null;
  submitted_at: string | null;
  submit_note: string | null;
  rating: number | null;
  rating_note: string | null;
  rated_at: string | null;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    nickname?: string | null;
  };
  rater?: { id: number; name: string } | null;
};

type Task = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "submitted" | "completed" | "cancelled";
  due_date: string | null;
  location_name: string | null;
  note: string | null;
  created_at: string;
  creator?: { id: number; name: string } | null;
  assignees: Assignee[];
};

const STATUS_LABEL: Record<Task["status"], string> = {
  open: "เปิดงาน",
  in_progress: "กำลังทำ",
  submitted: "ส่งงานแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const ASSIGN_STATUS_LABEL: Record<Assignee["status"], string> = {
  pending: "รอเริ่ม",
  in_progress: "กำลังทำ",
  submitted: "ส่งงานแล้ว",
  approved: "ผ่านแล้ว",
  rejected: "ไม่ผ่าน — แก้ไข",
};

const ASSIGN_STATUS_COLOR: Record<Assignee["status"], string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const PRIORITY_LABEL = {
  low: "ต่ำ",
  normal: "ปกติ",
  high: "สูง",
  urgent: "เร่งด่วน",
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = Number(params.id);
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission("tasks.manage");

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  // Rating modal
  const [ratingFor, setRatingFor] = useState<Assignee | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingNote, setRatingNote] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<{ data: Task }>(`/tasks/${taskId}`);
      setTask(res.data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "โหลดงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (taskId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function handleError(e: unknown, fallback = "เกิดข้อผิดพลาด") {
    let msg = fallback;
    if (e instanceof ApiError) {
      const data = e.data as { message?: string; errors?: Record<string, string[]> } | null;
      if (data?.errors) msg = Object.values(data.errors).flat().join("\n");
      else if (data?.message) msg = data.message;
      else msg = e.message;
    } else if (e instanceof Error) msg = e.message;
    setErr(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    alert(msg);
  }

  async function uploadPhoto(
    assignee: Assignee,
    kind: "before" | "after",
    file: File
  ) {
    setErr(null);
    setSuccessMsg(null);
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("photo", file);
    try {
      await apiFetch(`/tasks/${taskId}/assignees/${assignee.id}/photo`, {
        method: "POST",
        body: fd,
      });
      setSuccessMsg(`✔ อัปโหลดรูป${kind === "before" ? "ก่อนทำงาน" : "หลังทำงาน"}สำเร็จ`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
    } catch (e) {
      handleError(e, "อัปโหลดรูปไม่สำเร็จ");
    }
  }

  async function submitWork(assignee: Assignee) {
    if (!assignee.before_photo_url || !assignee.after_photo_url) {
      alert("ต้องอัปโหลดทั้งภาพก่อนทำ (Before) และภาพหลังทำ (After) ก่อนส่งงาน");
      return;
    }
    const note = prompt("หมายเหตุการส่งงาน (ไม่บังคับ):") ?? "";
    if (!confirm("ยืนยันส่งงานนี้?")) return;
    try {
      await apiFetch(`/tasks/${taskId}/assignees/${assignee.id}/submit`, {
        method: "POST",
        body: { submit_note: note },
      });
      setSuccessMsg("✔ ส่งงานสำเร็จ");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
    } catch (e) {
      handleError(e, "ส่งงานไม่สำเร็จ");
    }
  }

  function openRating(a: Assignee) {
    setRatingFor(a);
    setRatingValue(a.rating ?? 5);
    setRatingNote(a.rating_note ?? "");
  }

  async function saveRating() {
    if (!ratingFor) return;
    try {
      await apiFetch(`/tasks/${taskId}/assignees/${ratingFor.id}/rate`, {
        method: "POST",
        body: {
          rating: ratingValue,
          rating_note: ratingNote || null,
          approve: true,
        },
      });
      setRatingFor(null);
      setSuccessMsg("✔ ให้คะแนนเรียบร้อย");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
    } catch (e) {
      handleError(e, "ให้คะแนนไม่สำเร็จ");
    }
  }

  async function rejectAssignee(a: Assignee) {
    const note = prompt("เหตุผลที่ไม่ผ่าน (ไม่บังคับ):") ?? "";
    if (!confirm("ยืนยันส่งงานกลับให้แก้ไข?")) return;
    try {
      await apiFetch(`/tasks/${taskId}/assignees/${a.id}/reject`, {
        method: "POST",
        body: { rating_note: note },
      });
      setSuccessMsg("✔ ส่งกลับให้แก้ไขเรียบร้อย");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
    } catch (e) {
      handleError(e, "ดำเนินการไม่สำเร็จ");
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm(`ลบงาน ${task.code} ?`)) return;
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      router.push("/tasks");
    } catch (e) {
      handleError(e, "ลบไม่สำเร็จ");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="มอบหมายงาน" />
        <div className="p-6 text-slate-400">กำลังโหลด...</div>
      </>
    );
  }
  if (!task) {
    return (
      <>
        <Topbar title="มอบหมายงาน" />
        <div className="p-6">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
            {err || "ไม่พบงาน"}
          </div>
        </div>
      </>
    );
  }

  const myEmployeeId = user?.employee_id ?? null;
  // controller จะ enforce อยู่แล้ว — เราเช็คในฝั่ง UI ด้วยเพื่อแสดง action

  return (
    <>
      <Topbar title={`มอบหมายงาน · ${task.code}`} />
      <div className="p-6 space-y-4 print:p-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
            <ClipboardList className="h-7 w-7 text-indigo-600" />
            {task.code}
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${task.status === "completed" ? "bg-emerald-100 text-emerald-700" : task.status === "submitted" ? "bg-amber-100 text-amber-700" : task.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}
          >
            {STATUS_LABEL[task.status]}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPrint(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> พิมพ์ใบมอบหมายงาน
          </button>
          {canManage && (
            <>
              <Link
                href={`/tasks/${task.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm text-white hover:bg-amber-600"
              >
                <Edit2 className="h-4 w-4" /> แก้ไข
              </Link>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700"
              >
                <Trash2 className="h-4 w-4" /> ลบ
              </button>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 print:hidden">
          <CheckCircle2 className="h-5 w-5" /> {successMsg}
        </div>
      )}
      {err && (
        <div className="flex items-start gap-2 whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 print:hidden">
          <AlertCircle className="mt-0.5 h-5 w-5" /> <span>{err}</span>
        </div>
      )}

      {/* Task info */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="mb-1 text-xs text-slate-500">หัวข้องาน</div>
          <div className="text-lg font-semibold text-slate-800">
            {task.title}
          </div>
          {task.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
              {task.description}
            </p>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <Row label="ความสำคัญ" value={PRIORITY_LABEL[task.priority]} />
          <Row label="กำหนดเสร็จ" value={task.due_date ? task.due_date.slice(0, 10) : "-"} />
          <Row label="สถานที่" value={task.location_name || "-"} />
          <Row label="สร้างโดย" value={task.creator?.name || "-"} />
          {task.note && <Row label="หมายเหตุ" value={task.note} />}
        </div>
      </div>

      {/* Assignees */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-700">
          ผู้รับมอบหมายงาน ({task.assignees.length} คน)
        </h2>
        {task.assignees.map((a) => {
          const isOwner =
            user?.employee_id != null && a.employee_id === user.employee_id;
          const canSubmit =
            isOwner &&
            (a.status === "in_progress" || a.status === "rejected") &&
            !!a.before_photo_url &&
            !!a.after_photo_url;
          const canUpload =
            (isOwner || canManage) &&
            a.status !== "approved" &&
            a.status !== "submitted";
          return (
            <AssigneeCard
              key={a.id}
              assignee={a}
              canUpload={canUpload}
              canSubmit={canSubmit}
              canRate={canManage && (a.status === "submitted" || a.status === "approved")}
              canReject={canManage && a.status === "submitted"}
              onUpload={(kind, file) => uploadPhoto(a, kind, file)}
              onSubmit={() => submitWork(a)}
              onRate={() => openRating(a)}
              onReject={() => rejectAssignee(a)}
            />
          );
        })}
      </div>

      {/* Rating modal */}
      {ratingFor && (
        <Modal onClose={() => setRatingFor(null)} title="ให้คะแนนผู้รับงาน">
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              {ratingFor.employee?.first_name} {ratingFor.employee?.last_name}
              {ratingFor.employee?.nickname &&
                ` (${ratingFor.employee.nickname})`}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingValue(n)}
                  className="p-1"
                >
                  <Star
                    className={`h-8 w-8 ${n <= ratingValue ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                  />
                </button>
              ))}
              <span className="ml-2 font-semibold text-slate-700">
                {ratingValue} / 5
              </span>
            </div>
            <textarea
              value={ratingNote}
              onChange={(e) => setRatingNote(e.target.value)}
              rows={3}
              placeholder="คอมเมนต์ (ไม่บังคับ)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRatingFor(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveRating}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                บันทึกคะแนน
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Print modal */}
      {showPrint && (
        <PrintModal task={task} onClose={() => setShowPrint(false)} />
      )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function AssigneeCard({
  assignee: a,
  canUpload,
  canSubmit,
  canRate,
  canReject,
  onUpload,
  onSubmit,
  onRate,
  onReject,
}: {
  assignee: Assignee;
  canUpload: boolean;
  canSubmit: boolean;
  canRate: boolean;
  canReject: boolean;
  onUpload: (kind: "before" | "after", file: File) => void;
  onSubmit: () => void;
  onRate: () => void;
  onReject: () => void;
}) {
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="font-medium text-slate-800">
            {a.employee?.first_name} {a.employee?.last_name}
            {a.employee?.nickname && (
              <span className="ml-1 text-sm text-slate-400">
                ({a.employee.nickname})
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-slate-500">
            {a.employee?.employee_code}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {a.rating != null && (
            <div className="inline-flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${n <= (a.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                />
              ))}
            </div>
          )}
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${ASSIGN_STATUS_COLOR[a.status]}`}
          >
            {ASSIGN_STATUS_LABEL[a.status]}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <PhotoBox
          label="ภาพก่อนทำงาน (Before)"
          url={a.before_photo_url}
          accentColor="border-slate-300"
          onPick={() => beforeRef.current?.click()}
          canUpload={canUpload}
          inputRef={beforeRef}
          onChange={(file) => onUpload("before", file)}
        />
        <PhotoBox
          label="ภาพหลังทำงาน (After)"
          url={a.after_photo_url}
          accentColor="border-emerald-300"
          onPick={() => afterRef.current?.click()}
          canUpload={canUpload && a.status === "in_progress"}
          inputRef={afterRef}
          onChange={(file) => onUpload("after", file)}
          hint={
            !a.before_photo_url
              ? "อัปโหลดภาพก่อนทำงานก่อน"
              : a.status === "approved"
                ? "งานผ่านแล้ว"
                : undefined
          }
        />
      </div>

      {a.submit_note && (
        <div className="mt-3 rounded-lg bg-slate-50 p-2 text-sm">
          <div className="text-xs text-slate-500">หมายเหตุการส่งงาน:</div>
          <div className="text-slate-700">{a.submit_note}</div>
        </div>
      )}
      {a.rating_note && (
        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-sm">
          <div className="text-xs text-amber-700">ความเห็นจาก Admin:</div>
          <div className="text-amber-900">{a.rating_note}</div>
        </div>
      )}

      {(canSubmit || canRate || canReject) && (
        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
          {canSubmit && (
            <button
              onClick={onSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" /> ส่งงาน
            </button>
          )}
          {canReject && (
            <button
              onClick={onReject}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
            >
              <XCircle className="h-4 w-4" /> ส่งกลับให้แก้ไข
            </button>
          )}
          {canRate && (
            <button
              onClick={onRate}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600"
            >
              <Star className="h-4 w-4" />
              {a.rating != null ? "แก้ไขคะแนน" : "ให้คะแนน"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PhotoBox({
  label,
  url,
  accentColor,
  onPick,
  canUpload,
  inputRef,
  onChange,
  hint,
}: {
  label: string;
  url: string | null;
  accentColor: string;
  onPick: () => void;
  canUpload: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      {url ? (
        <div className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className={`h-48 w-full rounded-lg border-2 object-cover ${accentColor}`}
          />
          {canUpload && (
            <button
              type="button"
              onClick={onPick}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow opacity-0 group-hover:opacity-100"
              title="เปลี่ยนรูป"
            >
              <Upload className="h-4 w-4 text-slate-700" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={canUpload ? onPick : undefined}
          disabled={!canUpload}
          className={`flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed ${accentColor} bg-slate-50 text-slate-400 hover:bg-slate-100 disabled:opacity-50`}
        >
          <Camera className="h-10 w-10" />
          <span className="text-xs">
            {canUpload ? "แตะเพื่อถ่ายภาพ / อัปโหลด" : hint || "ยังไม่มีรูป"}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PrintModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 shadow-2xl print:max-h-none print:w-full print:max-w-none print:overflow-visible print:rounded-none print:p-8 print:shadow-none">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-semibold">ตัวอย่างใบมอบหมายงาน</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
            >
              <Printer className="h-4 w-4" /> พิมพ์
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              ปิด
            </button>
          </div>
        </div>

        <div className="print-area space-y-4 text-sm text-slate-800">
          <div className="text-center">
            <h1 className="text-2xl font-bold">ใบมอบหมายงาน</h1>
            <div className="text-base text-slate-600">Task Assignment</div>
            <div className="mt-1 font-mono">{task.code}</div>
          </div>

          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium w-40">
                  หัวข้องาน
                </td>
                <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                  {task.title}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">
                  ความสำคัญ
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {PRIORITY_LABEL[task.priority]}
                </td>
                <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium w-32">
                  กำหนดเสร็จ
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {task.due_date ? task.due_date.slice(0, 10) : "-"}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">
                  สถานที่
                </td>
                <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                  {task.location_name || "-"}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium align-top">
                  รายละเอียด
                </td>
                <td className="border border-slate-300 px-3 py-2 whitespace-pre-wrap" colSpan={3}>
                  {task.description || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          <div>
            <h3 className="mb-2 font-semibold">ผู้รับมอบหมายงาน</h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1">#</th>
                  <th className="border border-slate-300 px-2 py-1">รหัส</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">
                    ชื่อ-นามสกุล
                  </th>
                  <th className="border border-slate-300 px-2 py-1">สถานะ</th>
                  <th className="border border-slate-300 px-2 py-1">คะแนน</th>
                  <th className="border border-slate-300 px-2 py-1">ลายเซ็น</th>
                </tr>
              </thead>
              <tbody>
                {task.assignees.map((a, i) => (
                  <tr key={a.id}>
                    <td className="border border-slate-300 px-2 py-3 text-center">
                      {i + 1}
                    </td>
                    <td className="border border-slate-300 px-2 py-3 text-center font-mono">
                      {a.employee?.employee_code}
                    </td>
                    <td className="border border-slate-300 px-2 py-3">
                      {a.employee?.first_name} {a.employee?.last_name}
                      {a.employee?.nickname && ` (${a.employee.nickname})`}
                    </td>
                    <td className="border border-slate-300 px-2 py-3 text-center">
                      {ASSIGN_STATUS_LABEL[a.status]}
                    </td>
                    <td className="border border-slate-300 px-2 py-3 text-center">
                      {a.rating != null ? `${a.rating} / 5 ★` : "-"}
                    </td>
                    <td className="border border-slate-300 px-2 py-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {task.assignees.some((a) => a.before_photo_url || a.after_photo_url) && (
            <div>
              <h3 className="mb-2 font-semibold">ภาพประกอบ</h3>
              <div className="space-y-3">
                {task.assignees.map((a) => {
                  if (!a.before_photo_url && !a.after_photo_url) return null;
                  return (
                    <div key={a.id}>
                      <div className="mb-1 text-xs font-medium">
                        {a.employee?.first_name} {a.employee?.last_name}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {a.before_photo_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={a.before_photo_url}
                            alt="before"
                            className="h-40 w-full border border-slate-300 object-cover"
                          />
                        ) : (
                          <div className="h-40 border border-slate-300 bg-slate-50" />
                        )}
                        {a.after_photo_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={a.after_photo_url}
                            alt="after"
                            className="h-40 w-full border border-emerald-300 object-cover"
                          />
                        ) : (
                          <div className="h-40 border border-slate-300 bg-slate-50" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs text-slate-500">
                        <div>Before</div>
                        <div>After</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="mt-12 border-t border-slate-400 pt-1">
                ผู้มอบหมายงาน
              </div>
              <div>({task.creator?.name || "..............."})</div>
            </div>
            <div>
              <div className="mt-12 border-t border-slate-400 pt-1">
                ผู้รับมอบหมายงาน
              </div>
              <div>(...............)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

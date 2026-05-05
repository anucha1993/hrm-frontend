"use client";

import { useState, type FormEvent } from "react";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle, User as UserIcon } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setResult(null);

    if (newPwd.length < 6) {
      setResult({ ok: false, msg: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
      return;
    }
    if (newPwd !== confirmPwd) {
      setResult({ ok: false, msg: "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน" });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch<{ message: string }>("/me/password", {
        method: "POST",
        body: {
          current_password: currentPwd,
          password: newPwd,
          password_confirmation: confirmPwd,
        },
      });
      setResult({ ok: true, msg: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      let msg = "เปลี่ยนรหัสผ่านไม่สำเร็จ";
      if (err instanceof ApiError) {
        const data = err.data as { message?: string; errors?: Record<string, string[]> } | undefined;
        const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
        msg = first || data?.message || err.message;
      }
      setResult({ ok: false, msg });
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition placeholder:text-muted";

  return (
    <div className="px-4 py-5 space-y-5 max-w-md mx-auto">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-xl font-bold shrink-0">
          {user?.name?.charAt(0).toUpperCase() ?? <UserIcon className="w-6 h-6" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{user?.name}</p>
          <p className="text-xs text-muted truncate">{user?.email}</p>
          <p className="text-xs text-primary-600 mt-0.5">{user?.role?.display_name}</p>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-foreground">เปลี่ยนรหัสผ่าน</h3>
        </div>

        {result && (
          <div
            className={`mb-4 p-3 rounded-xl border flex items-start gap-2 text-sm ${
              result.ok
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {result.ok ? (
              <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">{result.msg}</div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">รหัสผ่านปัจจุบัน</label>
            <input
              type={show ? "text" : "password"}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
              autoComplete="current-password"
              className={inputCls}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">รหัสผ่านใหม่</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputCls + " pr-12"}
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">ยืนยันรหัสผ่านใหม่</label>
            <input
              type={show ? "text" : "password"}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputCls}
              placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            บันทึกรหัสผ่านใหม่
          </button>
        </form>
      </div>
    </div>
  );
}

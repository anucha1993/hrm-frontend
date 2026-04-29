"use client";

import { Briefcase, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as
          | { message?: string; errors?: Record<string, string[]> }
          | undefined;
        const firstFieldError = data?.errors
          ? Object.values(data.errors)[0]?.[0]
          : undefined;
        setError(firstFieldError || data?.message || err.message);
      } else {
        setError("ไม่สามารถเชื่อมต่อระบบได้");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-white/5 rounded-full"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-white/10 rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/5 rounded-full"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
              <Briefcase className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">CYC-HRM</h1>
              <p className="text-white/70 text-sm">ระบบบริหารงานบุคคล</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            จัดการทรัพยากรบุคคล<br />
            อย่างมีประสิทธิภาพ
          </h2>
          <p className="text-lg text-white/80 max-w-md">
            ระบบ HRM ครบวงจร ตั้งแต่การจัดการพนักงาน ลงเวลางาน มอบหมายงาน
            ไปจนถึงคำนวณเงินเดือนและรายงานครบทุกส่วน
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { value: "100+", label: "พนักงาน" },
              { value: "98%", label: "ความแม่นยำ" },
              { value: "24/7", label: "ใช้งานได้" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CYC-HRM</h1>
              <p className="text-xs text-muted">ระบบบริหารงานบุคคล</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
            <h3 className="text-2xl font-bold text-foreground mb-1">
              เข้าสู่ระบบ
            </h3>
            <p className="text-sm text-muted mb-8">
              กรุณากรอกข้อมูลเพื่อเข้าใช้งาน
            </p>

            <form className="space-y-5" onSubmit={onSubmit}>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  อีเมล
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-muted"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-muted pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white py-3 rounded-xl text-sm font-semibold hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                เข้าสู่ระบบ
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs font-medium text-muted mb-2">บัญชีทดสอบ (คลิกเพื่อกรอก)</p>
              <div className="space-y-1.5">
                {[
                  {
                    label: "Super Admin",
                    email: "superadmin@cyc-hrm.local",
                    color: "bg-amber-50 text-amber-700 border-amber-200",
                  },
                  {
                    label: "Admin",
                    email: "admin@cyc-hrm.local",
                    color: "bg-primary-50 text-primary-700 border-primary-200",
                  },
                  {
                    label: "Member",
                    email: "member@cyc-hrm.local",
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword("password");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition hover:opacity-90 ${acc.color}`}
                  >
                    <span className="font-semibold">{acc.label}</span>
                    <span className="font-mono">{acc.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-2">
                รหัสผ่านทุกบัญชี: <span className="font-mono font-semibold">password</span>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted mt-6">
            © 2026 CYC-HRM. ระบบบริหารงานบุคคล
          </p>
        </div>
      </div>
    </div>
  );
}

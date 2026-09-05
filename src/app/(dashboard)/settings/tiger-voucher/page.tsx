"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { TigerVoucherSettings, TigerTestConnectionResult } from "@/lib/advance";
import { KeyRound, Loader2, Save, PlugZap, CheckCircle2, XCircle, Target, AlertCircle, ArrowRight } from "lucide-react";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof ApiError && typeof e.data === "object" && e.data
    ? (e.data as { message?: string }).message ?? e.message
    : e instanceof Error
    ? e.message
    : fallback;
}

export default function TigerVoucherSettingsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("settings.manage");

  /* -------- TigerPay API credential settings -------- */
  const [settings, setSettings] = useState<TigerVoucherSettings | null>(null);
  const [baseUrl, setBaseUrl] = useState("https://api.tigercashbox.com");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TigerTestConnectionResult | null>(null);

  function loadSettings() {
    setLoadingSettings(true);
    apiFetch<{ data: TigerVoucherSettings }>("/tiger-voucher/settings")
      .then((r) => {
        setSettings(r.data);
        setBaseUrl(r.data.base_url);
        setUsername(r.data.username);
        setMobile(r.data.mobile);
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }

  useEffect(loadSettings, []);

  async function saveSettings() {
    setSavingSettings(true);
    setSaveErr(null);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = { base_url: baseUrl, username, mobile };
      if (password) body.password = password;
      const res = await apiFetch<{ data: TigerVoucherSettings; message: string }>("/tiger-voucher/settings", {
        method: "PUT",
        body,
      });
      setSettings(res.data);
      setPassword("");
      setSaveMsg(res.message);
      setTestResult(null);
    } catch (e) {
      setSaveErr(errMsg(e, "บันทึกไม่สำเร็จ"));
    } finally {
      setSavingSettings(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch<TigerTestConnectionResult>("/tiger-voucher/test-connection", { method: "POST" });
      setTestResult(res);
    } catch (e) {
      setTestResult({ success: false, message: errMsg(e, "ทดสอบไม่สำเร็จ"), token: null, http_status: null });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <Topbar title="เบิกเงินผ่านเครื่อง Tiger (TigerPay Voucher)" />
      <div className="p-6 max-w-5xl space-y-6">
        {/* TigerPay API credentials */}
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-50 text-orange-600 border border-orange-100 p-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">การเชื่อมต่อ TigerPay API</h3>
              <p className="text-sm text-muted">
                ตั้งค่าบัญชี TigerPay (api.tigercashbox.com) สำหรับสร้าง Voucher เบิกเงินล่วงหน้าผ่านเครื่อง Tiger
              </p>
            </div>
          </div>

          {loadingSettings ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Base URL">
                <input className="payroll-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} disabled={!canManage} />
              </Field>
              <Field label="Username">
                <input className="payroll-input" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!canManage} />
              </Field>
              <Field label={`Password${settings?.has_password ? " (ตั้งไว้แล้ว — กรอกใหม่เฉพาะต้องการเปลี่ยน)" : ""}`}>
                <input
                  type="password"
                  className="payroll-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={settings?.has_password ? "••••••••" : ""}
                  disabled={!canManage}
                />
              </Field>
              <Field label="Mobile">
                <input className="payroll-input" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={!canManage} />
              </Field>
            </div>
          )}

          {saveErr && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {saveErr}
            </div>
          )}
          {saveMsg && <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3">{saveMsg}</div>}

          {testResult && (
            <div
              className={`text-sm rounded-lg p-3 flex items-start gap-2 ${
                testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
              <div>
                <div className="font-medium">{testResult.success ? "เชื่อมต่อสำเร็จ" : "เชื่อมต่อไม่สำเร็จ"}</div>
                {testResult.message && <div className="text-xs opacity-80">{testResult.message}</div>}
                {testResult.token && <div className="text-xs opacity-80 font-mono mt-1">Token: {testResult.token}</div>}
              </div>
            </div>
          )}

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกการตั้งค่า
              </button>
              <button
                onClick={testConnection}
                disabled={testing}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
                ทดสอบการเชื่อมต่อ
              </button>
            </div>
          )}
        </div>

        {/* เงื่อนไขเป้าหมายผลิตย้ายไปจัดการที่ /rules (แท็บ "เป้าหมายผลิตก่อนเบิกเงิน") */}
        <Link
          href="/rules"
          className="flex items-center justify-between gap-3 bg-white rounded-xl border border-border p-5 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-50 text-primary-600 border border-primary-100 p-2">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">เงื่อนไขเป้าหมายผลิตก่อนเบิกเงิน</h3>
              <p className="text-sm text-muted">
                จัดการเป้าหมายการผลิตที่ต้องถึงก่อนเบิกเงินได้ที่หน้า “กำหนดกฎระเบียบ” → แท็บ “เป้าหมายผลิตก่อนเบิกเงิน”
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted flex-shrink-0" />
        </Link>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

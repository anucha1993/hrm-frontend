"use client";

import { useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { HipTimeSyncLog } from "@/lib/types";
import { Fingerprint, Loader2, Save, Check, History, RefreshCw, AlertTriangle, Camera, Copy } from "lucide-react";

type SettingRow = { key: string; value: unknown; category?: string; label?: string };

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function HipTimeSettingsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("settings.manage");

  const [checkinStart, setCheckinStart] = useState("04:00");
  const [checkinEnd, setCheckinEnd] = useState("10:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<HipTimeSyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [selfieUrl, setSelfieUrl] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    setSelfieUrl(`${window.location.origin}/attendance`);
  }, []);

  async function copySelfieUrl() {
    await navigator.clipboard.writeText(selfieUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  useEffect(() => {
    apiFetch<{ data: SettingRow[] }>("/payroll-settings")
      .then((r) => {
        const map = new Map(r.data.map((s) => [s.key, s.value]));
        const cs = map.get("hiptime_checkin_window_start");
        const ce = map.get("hiptime_checkin_window_end");
        setCheckinStart(typeof cs === "string" ? cs : "04:00");
        setCheckinEnd(typeof ce === "string" ? ce : "10:00");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const loadLogs = useCallback(() => {
    setLogsLoading(true);
    setLogsError(null);
    apiFetch<{ data: HipTimeSyncLog[] }>("/hiptime/sync-logs")
      .then((r) => setLogs(r.data))
      .catch((e) => setLogsError(e instanceof Error ? e.message : "โหลด log ไม่สำเร็จ"))
      .finally(() => setLogsLoading(false));
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/payroll-settings", {
        method: "PUT",
        body: {
          items: [
            { key: "hiptime_checkin_window_start", value: checkinStart, category: "attendance", label: "เริ่มช่วงเข้างาน (HIP Time)" },
            { key: "hiptime_checkin_window_end", value: checkinEnd, category: "attendance", label: "สิ้นสุดช่วงเข้างาน (HIP Time)" },
          ],
        },
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="ช่วงเวลาสแกน HIP Time" />
      <div className="p-6 max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-50 text-teal-600 border border-teal-100 p-2">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">ช่วงเวลาสแกน HIP Time</h3>
            <p className="text-sm text-muted">
              เครื่องสแกนอาจถูกใช้เปิดประตูด้วย ระบบจึงแยกเข้างาน/ออกงานจากเวลาที่สแกนแทน — สแกนในช่วงนี้นับเป็น &quot;เข้างาน&quot; (เอาเวลาที่เช้าที่สุด) นอกช่วงนี้นับเป็น &quot;ออกจากงาน&quot; (เอาเวลาล่าสุด)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-50 text-primary-600 border border-primary-100 p-2">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">ลิงก์เซลฟี่เข้า-ออกงาน (แทนเครื่อง HIP Time)</h3>
              <p className="text-sm text-muted">
                ส่งลิงก์นี้ให้พนักงานเปิดผ่านมือถือเพื่อถ่ายเซลฟี่ลงเวลาเข้า-ออกงานเอง โดยไม่ต้องสแกนที่เครื่อง HIP Time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 max-w-xl">
            <input
              type="text"
              readOnly
              value={selfieUrl}
              onClick={(e) => e.currentTarget.select()}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-muted font-mono"
            />
            <button
              onClick={copySelfieUrl}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 shrink-0"
            >
              {urlCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {urlCopied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-xs">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">เริ่มช่วงเข้างาน</label>
                <input
                  type="time"
                  value={checkinStart}
                  onChange={(e) => {
                    setCheckinStart(e.target.value);
                    setSaved(false);
                  }}
                  disabled={!canManage}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white disabled:bg-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">สิ้นสุดช่วงเข้างาน</label>
                <input
                  type="time"
                  value={checkinEnd}
                  onChange={(e) => {
                    setCheckinEnd(e.target.value);
                    setSaved(false);
                  }}
                  disabled={!canManage}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white disabled:bg-surface"
                />
              </div>
            </div>

            {error && <div className="text-sm text-rose-600">{error}</div>}

            {canManage ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
                </button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <Check className="w-4 h-4" /> บันทึกแล้ว
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted">คุณไม่มีสิทธิ์แก้ไข (ต้องมีสิทธิ์ settings.manage)</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 text-teal-600 border border-teal-100 p-2">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Log การ Sync</h3>
                <p className="text-sm text-muted">ประวัติการรับข้อมูลตอกบัตรจาก HIP Time agent ล่าสุด 100 รายการ</p>
              </div>
            </div>
            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm text-foreground hover:bg-surface disabled:opacity-60"
            >
              {logsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} รีเฟรช
            </button>
          </div>

          {logsError && <div className="text-sm text-rose-600">{logsError}</div>}

          {logsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">ยังไม่มีประวัติการ sync</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="py-2 pr-3 font-medium">เวลา</th>
                    <th className="py-2 pr-3 font-medium">ได้รับ</th>
                    <th className="py-2 pr-3 font-medium">สร้างสำเร็จ</th>
                    <th className="py-2 pr-3 font-medium">ข้าม</th>
                    <th className="py-2 pr-3 font-medium">enrollnumber ที่ยังไม่ผูก</th>
                    <th className="py-2 pr-3 font-medium">ข้อผิดพลาด</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(log.created_at)}</td>
                      <td className="py-2 pr-3">{log.received}</td>
                      <td className="py-2 pr-3 text-green-600 font-medium">{log.created}</td>
                      <td className="py-2 pr-3">{log.skipped}</td>
                      <td className="py-2 pr-3">
                        {log.unmapped_enroll_numbers && log.unmapped_enroll_numbers.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {log.unmapped_enroll_numbers.join(", ")}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {log.errors && log.errors.length > 0 ? (
                          <span className="text-rose-600">
                            {log.errors.length} รายการ: {log.errors.map((e) => e.error).join("; ")}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

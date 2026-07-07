"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Building, Loader2, Save, Check } from "lucide-react";

type SettingRow = { key: string; value: unknown; category?: string; label?: string };

export default function CompanySettingsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("settings.manage");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: SettingRow[] }>("/payroll-settings")
      .then((r) => {
        const map = new Map(r.data.map((s) => [s.key, s.value]));
        const cn = map.get("company_name");
        const ca = map.get("company_address");
        setName(typeof cn === "string" ? cn : "");
        setAddress(typeof ca === "string" ? ca : "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/payroll-settings", {
        method: "PUT",
        body: {
          items: [
            { key: "company_name", value: name, category: "company", label: "ชื่อบริษัท" },
            { key: "company_address", value: address, category: "company", label: "ที่อยู่บริษัท" },
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
      <Topbar title="ข้อมูลบริษัท" />
      <div className="p-6 max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-50 text-primary-600 border border-primary-100 p-2">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">หัวกระดาษสลิปเงินเดือน</h3>
            <p className="text-sm text-muted">ชื่อและที่อยู่บริษัทนี้จะแสดงบนหัวสลิปเงินเดือนทุกใบ</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ชื่อบริษัท</label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                disabled={!canManage}
                placeholder="เช่น บริษัท ชาญเจริญคอนกรีต จำกัด"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white disabled:bg-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ที่อยู่บริษัท</label>
              <textarea
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setSaved(false);
                }}
                disabled={!canManage}
                rows={3}
                placeholder="เลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white disabled:bg-surface"
              />
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
      </div>
    </>
  );
}

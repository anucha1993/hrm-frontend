"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { apiFetch, ApiError } from "@/lib/api";
import { OfficeLocation } from "@/lib/types";
import { MapPin, Plus, Pencil, Trash2, Crosshair, X } from "lucide-react";

type FormState = {
  id?: number;
  name: string;
  latitude: string;
  longitude: string;
  radius_m: string;
  enforce_geofence: boolean;
  address: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  latitude: "",
  longitude: "",
  radius_m: "100",
  enforce_geofence: true,
  address: "",
  is_active: true,
};

export default function LocationsPage() {
  const [items, setItems] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<{ data: OfficeLocation[] }>("/office-locations");
      setItems(data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(loc: OfficeLocation) {
    setForm({
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude?.toString() ?? "",
      longitude: loc.longitude?.toString() ?? "",
      radius_m: loc.radius_m.toString(),
      enforce_geofence: loc.enforce_geofence,
      address: loc.address ?? "",
      is_active: loc.is_active,
    });
    setError(null);
    setShowForm(true);
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("เบราว์เซอร์ไม่รองรับ GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
      },
      (err) => setError("ดึงตำแหน่งไม่สำเร็จ: " + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_m: parseInt(form.radius_m, 10),
        enforce_geofence: form.enforce_geofence,
        address: form.address || null,
        is_active: form.is_active,
      };
      if (form.id) {
        await apiFetch(`/office-locations/${form.id}`, { method: "PUT", body: payload });
      } else {
        await apiFetch("/office-locations", { method: "POST", body: payload });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(loc: OfficeLocation) {
    if (!confirm(`ลบสถานที่ "${loc.name}"?`)) return;
    try {
      await apiFetch(`/office-locations/${loc.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="สถานที่ทำงาน" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">กำหนดพิกัดสถานที่และรัศมีที่อนุญาตให้ลงเวลาได้</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">
            <Plus className="w-4 h-4" /> เพิ่มสถานที่
          </button>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border text-left text-xs font-semibold text-muted uppercase">
                <th className="px-5 py-3">ชื่อ</th>
                <th className="px-5 py-3">พิกัด</th>
                <th className="px-5 py-3">รัศมี (ม.)</th>
                <th className="px-5 py-3">บังคับ Geofence</th>
                <th className="px-5 py-3">สถานะ</th>
                <th className="px-5 py-3 w-32">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">กำลังโหลด...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">ยังไม่มีสถานที่</td></tr>
              ) : items.map((loc) => (
                <tr key={loc.id} className="hover:bg-surface/50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground">{loc.name}</div>
                    {loc.address && <div className="text-xs text-muted mt-0.5">{loc.address}</div>}
                  </td>
                  <td className="px-5 py-3 text-sm font-mono text-muted">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{loc.latitude}, {loc.longitude}</span>
                  </td>
                  <td className="px-5 py-3 text-sm">{loc.radius_m}</td>
                  <td className="px-5 py-3 text-sm">
                    {loc.enforce_geofence ? <span className="text-green-600">เปิด</span> : <span className="text-muted">ปิด</span>}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {loc.is_active ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">ใช้งาน</span> : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">ปิด</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(loc)} className="p-1.5 rounded hover:bg-surface text-primary-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(loc)} className="p-1.5 rounded hover:bg-surface text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{form.id ? "แก้ไขสถานที่" : "เพิ่มสถานที่"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ชื่อสถานที่ *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Latitude *</label>
                  <input required type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Longitude *</label>
                  <input required type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono" />
                </div>
              </div>
              <button type="button" onClick={useCurrentLocation} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
                <Crosshair className="w-3 h-3" /> ใช้ตำแหน่งปัจจุบัน
              </button>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">รัศมี (เมตร) *</label>
                <input required type="number" min={10} max={50000} value={form.radius_m} onChange={(e) => setForm({ ...form, radius_m: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                <p className="text-xs text-muted mt-1">ระยะที่อนุญาตให้ลงเวลาได้จากจุดศูนย์กลาง</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ที่อยู่ (สำหรับแสดงในรูป)</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.enforce_geofence} onChange={(e) => setForm({ ...form, enforce_geofence: e.target.checked })} />
                  บังคับ Geofence (ห้ามลงเวลานอกพื้นที่)
                </label>
              </div>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  ใช้งาน
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

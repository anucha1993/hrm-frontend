"use client";

import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { Search, Loader2, Eye, X, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Labour, LabourListResponse } from "@/lib/types";

const STATUS_VARIANT = (s: string | null | undefined): "success" | "warning" | "danger" | "default" => {
  if (!s) return "default";
  const v = s.toLowerCase();
  if (v.includes("work") || v === "active") return "success";
  if (v.includes("resign") || v.includes("escape") || v.includes("terminate")) return "danger";
  if (v.includes("suspend") || v.includes("pending")) return "warning";
  return "default";
};

export default function LaboursPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("labours.view");

  const [items, setItems] = useState<Labour[]>([]);
  const [meta, setMeta] = useState<LabourListResponse["meta"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nationality, setNationality] = useState("");
  const [statusJob, setStatusJob] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [selected, setSelected] = useState<Labour | null>(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ per_page: String(perPage), page: String(page) });
      if (search) params.set("search", search);
      if (nationality) params.set("labour_nationality", nationality);
      if (statusJob) params.set("labour_status_job", statusJob);
      const res = await apiFetch<LabourListResponse>(`/labours?${params.toString()}`);
      setItems(res.data ?? []);
      setMeta(res.meta);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string } | undefined;
        setError(data?.message || err.message);
      } else {
        setError("โหลดข้อมูลไม่สำเร็จ");
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canView, search, nationality, statusJob, page, perPage]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(id: number) {
    try {
      const res = await apiFetch<{ data: Labour }>(`/labours/${id}`);
      setSelected(res.data);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }

  if (!canView) {
    return (
      <>
        <Topbar title="ข้อมูลแรงงานต่างด้าว" />
        <div className="p-6">
          <div className="p-6 bg-white rounded-xl border border-border text-sm text-muted">
            คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้
          </div>
        </div>
      </>
    );
  }

  const totalPages = meta?.last_page ?? 1;

  return (
    <>
      <Topbar title="ข้อมูลแรงงานต่างด้าว" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">ข้อมูลแรงงานต่างด้าว</h3>
            <p className="text-xs text-muted">เชื่อมต่อจากระบบ Charoenmun-Labours</p>
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm bg-white"
          >
            <RefreshCw className="w-4 h-4" /> รีเฟรช
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="ค้นหา passport, ชื่อ, เลขแรงงาน..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white"
            />
          </div>
          <select
            value={nationality}
            onChange={(e) => {
              setPage(1);
              setNationality(e.target.value);
            }}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
          >
            <option value="">ทุกสัญชาติ</option>
            <option value="MM">เมียนมา (MM)</option>
            <option value="LA">ลาว (LA)</option>
            <option value="KH">กัมพูชา (KH)</option>
            <option value="TH">ไทย (TH)</option>
          </select>
          <select
            value={statusJob}
            onChange={(e) => {
              setPage(1);
              setStatusJob(e.target.value);
            }}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
          >
            <option value="">ทุกสถานะการทำงาน</option>
            <option value="working">working</option>
            <option value="resigned">resigned</option>
            <option value="escape">escape</option>
            <option value="suspended">suspended</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    {["รหัส", "Passport", "ชื่อ", "สัญชาติ", "บริษัท", "วันเริ่มงาน", "สถานะงาน", "จัดการ"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    items.map((l) => (
                      <tr key={l.labour_id} className="hover:bg-surface/50">
                        <td className="px-4 py-3 text-sm font-mono text-foreground">{l.labour_number ?? `#${l.labour_id}`}</td>
                        <td className="px-4 py-3 text-sm font-mono text-muted">{l.passport?.number ?? "-"}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{l.labour_fullname_th ?? l.labour_fullname}</p>
                          {l.labour_fullname_th && (
                            <p className="text-xs text-muted">{l.labour_fullname}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{l.labour_nationality ?? "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted">{l.company?.company_name ?? "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted">{l.labour_jobdate_start ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge label={l.labour_status_job ?? "-"} variant={STATUS_VARIANT(l.labour_status_job)} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openDetail(l.labour_id)}
                            className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {meta && meta.total !== undefined && (
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              ทั้งหมด {meta.total} รายการ {meta.last_page ? `(${meta.current_page}/${meta.last_page})` : ""}
            </span>
            {meta.last_page && meta.last_page > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-white disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-white disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && <LabourDetailModal labour={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function LabourDetailModal({ labour, onClose }: { labour: Labour; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white">
          <h3 className="font-semibold text-foreground">รายละเอียดแรงงาน</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6 text-sm">
          <DetailSection title="ข้อมูลส่วนตัว">
            <Row label="รหัสแรงงาน" value={labour.labour_number ?? `#${labour.labour_id}`} />
            <Row label="คำนำหน้า" value={labour.labour_prefix} />
            <Row label="ชื่อ (TH)" value={labour.labour_fullname_th} />
            <Row label="ชื่อ (EN)" value={labour.labour_fullname} />
            <Row label="เพศ" value={labour.labour_sex} />
            <Row label="สัญชาติ" value={labour.labour_nationality} />
            <Row label="วันเกิด" value={labour.labour_birthday} />
          </DetailSection>

          <DetailSection title="การทำงาน">
            <Row label="สถานะ" value={labour.labour_status} />
            <Row label="สถานะงาน" value={labour.labour_status_job} />
            <Row label="วันเริ่มงาน" value={labour.labour_jobdate_start} />
            <Row label="วันลาออก" value={labour.labour_resing_date} />
            <Row label="วันหลบหนี" value={labour.labour_escape_date} />
            <Row label="บริษัท" value={labour.company?.company_name} />
            <Row label="Agency" value={labour.agency?.agency_name} />
          </DetailSection>

          <DetailSection title="พาสปอร์ต">
            <Row label="เลขที่" value={labour.passport?.number} />
            <Row label="วันออก" value={labour.passport?.date_start} />
            <Row label="วันหมดอายุ" value={labour.passport?.date_end} />
          </DetailSection>

          <DetailSection title="วีซ่า">
            <Row label="เลขที่" value={labour.visa?.number} />
            <Row label="วันเข้าประเทศ" value={labour.visa?.date_in} />
            <Row label="เริ่มต้น" value={labour.visa?.date_start} />
            <Row label="หมดอายุ" value={labour.visa?.date_end} />
          </DetailSection>

          <DetailSection title="Work Permit">
            <Row label="เลขที่" value={labour.work_permit?.number} />
            <Row label="เลขประจำตัวแรงงาน" value={labour.work_permit?.labour_no} />
            <Row label="เริ่มต้น" value={labour.work_permit?.date_start} />
            <Row label="หมดอายุ" value={labour.work_permit?.date_end} />
          </DetailSection>

          <DetailSection title="รายงานตัว 90 วัน / TM.30">
            <Row label="เริ่มต้น 90 วัน" value={labour.day90?.date_start} />
            <Row label="ครบกำหนด 90 วัน" value={labour.day90?.date_end} />
            <Row label="TM.30" value={labour.tm_number} />
          </DetailSection>

          {labour.note && (
            <DetailSection title="หมายเหตุ">
              <p className="md:col-span-2 text-sm text-foreground whitespace-pre-line">{labour.note}</p>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted uppercase mb-2">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-surface/50 rounded-lg p-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-foreground">{value || "-"}</span>
    </div>
  );
}

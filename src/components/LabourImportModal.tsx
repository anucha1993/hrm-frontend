"use client";

import { Search, X, Loader2, Download, BadgeCheck, Building2, Calendar, FileText, Globe2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { Labour, LabourListResponse } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (labour: Labour) => void;
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

function statusBadge(status: string | null | undefined): { label: string; cls: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "working" || s === "active")
    return { label: "ทำงานอยู่", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (s === "escape") return { label: "หลบหนี", cls: "bg-rose-50 text-rose-700 border-rose-200" };
  if (s === "resign" || s === "resigned" || s === "terminated")
    return { label: "ลาออก", cls: "bg-slate-100 text-slate-700 border-slate-200" };
  if (!status) return { label: "-", cls: "bg-slate-50 text-slate-500 border-slate-200" };
  return { label: status, cls: "bg-slate-50 text-slate-700 border-slate-200" };
}

export default function LabourImportModal({ open, onClose, onPick }: Props) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ per_page: "30" });
      if (term) params.set("search", term);
      const res = await apiFetch<LabourListResponse>(`/labours?${params.toString()}`);
      setItems(res.data ?? []);
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
  }, []);

  useEffect(() => {
    if (!open) return;
    load("");
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search, open, load]);

  async function handlePick(l: Labour) {
    setPicking(l.labour_id);
    try {
      const res = await apiFetch<{ data: Labour }>(`/labours/${l.labour_id}`);
      onPick(res.data);
      onClose();
    } catch {
      onPick(l);
      onClose();
    } finally {
      setPicking(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary-50 to-accent-50">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-primary-600" />
              นำเข้าข้อมูลจาก Labour API
            </h3>
            <p className="text-xs text-muted mt-0.5">เลือกแรงงานเพื่อเติมข้อมูลในฟอร์มอัตโนมัติ</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* search */}
        <div className="p-4 border-b border-border bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาด้วย passport, ชื่อ, เลขแรงงาน..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          {!loading && items.length > 0 && (
            <p className="text-xs text-muted mt-2">พบ {items.length} รายการ</p>
          )}
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto bg-surface/30">
          {error && (
            <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
              <p className="text-xs text-muted">กำลังโหลดข้อมูล...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 flex flex-col items-center gap-2 text-muted">
              <FileText className="w-8 h-8 opacity-40" />
              <p className="text-sm">ไม่พบข้อมูล</p>
            </div>
          ) : (
            <ul className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((l) => {
                const name = l.labour_fullname?.trim() || l.labour_fullname_th || "-";
                const subName =
                  l.labour_fullname_th && l.labour_fullname_th !== l.labour_fullname
                    ? l.labour_fullname_th
                    : null;
                const initial = (name || "?").charAt(0).toUpperCase();
                const sex = l.labour_sex?.toUpperCase();
                const sexLabel = sex === "M" ? "ชาย" : sex === "F" ? "หญิง" : null;
                const badge = statusBadge(l.labour_status_job);
                const isPicking = picking === l.labour_id;
                return (
                  <li
                    key={l.labour_id}
                    className="bg-white rounded-xl border border-border hover:border-primary-300 hover:shadow-md transition p-4 flex flex-col gap-3"
                  >
                    {/* top: avatar + name + status */}
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-base font-bold shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        {subName && <p className="text-xs text-muted truncate mt-0.5">{subName}</p>}
                        {l.labour_number && (
                          <p className="text-[11px] text-muted font-mono mt-0.5">#{l.labour_number}</p>
                        )}
                      </div>
                    </div>

                    {/* details grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-muted min-w-0">
                        <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                        <span className="truncate" title={l.passport?.number ?? ""}>
                          <span className="text-muted">Passport:</span>{" "}
                          <span className="text-foreground font-mono">{l.passport?.number ?? "-"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted min-w-0">
                        <Globe2 className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                        <span className="truncate">
                          <span className="text-muted">สัญชาติ:</span>{" "}
                          <span className="text-foreground capitalize">{l.labour_nationality ?? "-"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted min-w-0">
                        <User className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                        <span className="truncate">
                          <span className="text-muted">เพศ:</span>{" "}
                          <span className="text-foreground">{sexLabel ?? "-"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted min-w-0">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                        <span className="truncate">
                          <span className="text-muted">เริ่มงาน:</span>{" "}
                          <span className="text-foreground">{formatDate(l.labour_jobdate_start)}</span>
                        </span>
                      </div>
                      {l.work_permit?.number && (
                        <div className="flex items-center gap-1.5 text-muted min-w-0 col-span-2">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                          <span className="truncate">
                            <span className="text-muted">Work Permit:</span>{" "}
                            <span className="text-foreground font-mono">{l.work_permit.number}</span>
                          </span>
                        </div>
                      )}
                      {l.company?.company_name && (
                        <div className="flex items-center gap-1.5 text-muted min-w-0 col-span-2">
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                          <span className="truncate" title={l.company.company_name}>
                            <span className="text-muted">บริษัท:</span>{" "}
                            <span className="text-foreground">{l.company.company_name}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* action */}
                    <button
                      onClick={() => handlePick(l)}
                      disabled={isPicking}
                      className="mt-auto w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-xs font-semibold disabled:opacity-60 transition"
                    >
                      {isPicking ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          กำลังโหลด...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          เลือกใช้ข้อมูลนี้
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

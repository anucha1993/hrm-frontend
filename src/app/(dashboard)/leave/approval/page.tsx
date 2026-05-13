"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Badge from "@/components/Badge";
import { apiFetch, apiDownload, ApiError } from "@/lib/api";
import { fmtDate } from "@/lib/payroll";
import {
  LEAVE_STATUS_COLOR,
  LEAVE_STATUS_LABEL,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/leave";
import { Loader2, Check, X, AlertCircle, FileText, Download } from "lucide-react";

const TABS: { key: LeaveStatus; label: string }[] = [
  { key: "pending", label: "รออนุมัติ" },
  { key: "approved", label: "อนุมัติแล้ว" },
  { key: "rejected", label: "ปฏิเสธ" },
];

export default function LeaveApprovalPage() {
  const [tab, setTab] = useState<LeaveStatus>("pending");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<LeaveRequest | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadExcel() {
    setDownloading(true);
    try {
      await apiDownload(`/leave/requests/export`, `leave-requests-${tab}.xlsx`, {
        params: { status: tab },
      });
    } finally {
      setDownloading(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { data: LeaveRequest[] } }>(
        `/leave/requests?status=${tab}&per_page=100`,
      );
      setRequests(res.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tab]);

  async function action(req: LeaveRequest, verb: "approve" | "reject") {
    let note: string | null = null;
    if (verb === "reject") {
      note = prompt("เหตุผลที่ปฏิเสธ");
      if (note === null) return;
    }
    setBusy(req.id);
    setErr(null);
    try {
      await apiFetch(`/leave/requests/${req.id}/${verb}`, {
        method: "POST",
        body: { note },
      });
      setDetail(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof ApiError && typeof e.data === "object" && e.data
        ? (e.data as { message?: string }).message ?? e.message
        : e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ";
      setErr(msg);
    } finally {
      setBusy(null);
    }
  }

  async function showDetail(req: LeaveRequest) {
    try {
      const res = await apiFetch<{ data: LeaveRequest }>(`/leave/requests/${req.id}`);
      setDetail(res.data);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <>
      <Topbar title="อนุมัติใบลา" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t.key
                  ? "border-primary-500 text-primary-700"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={downloadExcel}
            disabled={downloading || loading}
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 mb-2"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            ดาวน์โหลด Excel
          </button>
        </div>

        {err && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center text-muted">
            ไม่มีรายการ
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-50 border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase">
                    <th className="px-3 py-3">เลขที่</th>
                    <th className="px-3 py-3">พนักงาน</th>
                    <th className="px-3 py-3">ประเภท</th>
                    <th className="px-3 py-3">วันที่</th>
                    <th className="px-3 py-3 text-right">วัน</th>
                    <th className="px-3 py-3">เหตุผล</th>
                    <th className="px-3 py-3">สถานะ</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3 font-mono text-xs">{r.request_no}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {r.employee?.first_name} {r.employee?.last_name}
                        </div>
                        <div className="text-xs text-muted font-mono">{r.employee?.employee_code}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: (r.leave_type?.color ?? "#888") + "22", color: r.leave_type?.color ?? "#666" }}
                        >
                          {r.leave_type?.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {fmtDate(r.start_date)}
                        {r.start_date !== r.end_date && <> – {fmtDate(r.end_date)}</>}
                      </td>
                      <td className="px-3 py-3 text-right">{r.total_days}</td>
                      <td className="px-3 py-3 text-xs text-muted truncate max-w-xs">{r.reason ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Badge label={LEAVE_STATUS_LABEL[r.status]} variant={LEAVE_STATUS_COLOR[r.status]} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => showDetail(r)}
                            className="p-1.5 text-gray-500 hover:text-primary-600"
                            title="ดู"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() => action(r, "approve")}
                                disabled={busy === r.id}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> อนุมัติ
                              </button>
                              <button
                                onClick={() => action(r, "reject")}
                                disabled={busy === r.id}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> ปฏิเสธ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{detail.request_no}</h3>
              <button onClick={() => setDetail(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <KV label="พนักงาน" value={`${detail.employee?.first_name} ${detail.employee?.last_name} (${detail.employee?.employee_code})`} />
              <KV label="ประเภทการลา" value={detail.leave_type?.name ?? "—"} />
              <KV
                label="ช่วงวันที่"
                value={`${fmtDate(detail.start_date)}${detail.start_date !== detail.end_date ? ` – ${fmtDate(detail.end_date)}` : ""}${detail.is_half_day ? ` (ครึ่งวัน${detail.half_day_period === "morning" ? "เช้า" : "บ่าย"})` : ""}`}
              />
              <KV label="จำนวนวัน" value={`${detail.total_days} วัน`} />
              <KV label="เหตุผล" value={detail.reason ?? "—"} />
              <KV label="เบอร์ติดต่อ" value={detail.contact_phone ?? "—"} />
              <KV label="สถานะ" value={LEAVE_STATUS_LABEL[detail.status]} />
              {detail.review_note && <KV label="หมายเหตุการพิจารณา" value={detail.review_note} />}
              {(detail.logs ?? []).length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="text-xs font-semibold text-muted mb-2">ประวัติการดำเนินการ</div>
                  <div className="space-y-1">
                    {detail.logs!.map((l) => (
                      <div key={l.id} className="text-xs text-muted">
                        • {l.action} ({l.from_status} → {l.to_status}) — {l.user?.name}
                        {l.note && <span className="text-foreground"> · {l.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {detail.status === "pending" && (
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-gray-50">
                <button
                  onClick={() => action(detail, "reject")}
                  disabled={busy === detail.id}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  ปฏิเสธ
                </button>
                <button
                  onClick={() => action(detail, "approve")}
                  disabled={busy === detail.id}
                  className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  อนุมัติ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted text-xs w-32 flex-shrink-0">{label}:</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}

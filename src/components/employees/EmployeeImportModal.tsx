"use client";

import { useState } from "react";
import { Download, Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { downloadReport } from "@/components/reports/ReportPrimitives";

type ImportError = {
  row: number;
  code: string;
  errors: string[];
};

type ImportResult = {
  message: string;
  summary: { created: number; skipped: number; total: number };
  errors: ImportError[];
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EmployeeImportModal({ open, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleDownloadTemplate() {
    setError(null);
    setDownloading(true);
    try {
      await downloadReport(
        "/employees/import/template",
        `employee_import_template_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดาวน์โหลด template ไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("กรุณาเลือกไฟล์");
      return;
    }
    setError(null);
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch<ImportResult>("/employees/import", {
        method: "POST",
        body: fd,
      });
      setResult(res);
      if (res.summary.created > 0) onSuccess?.();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ");
      }
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    if (uploading) return;
    setFile(null);
    setResult(null);
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">นำเข้าพนักงานจาก Excel</h3>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-1 rounded-lg hover:bg-surface text-muted disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Step 1: Download template */}
          <div className="rounded-xl border border-border p-4">
            <h4 className="text-sm font-semibold mb-2 text-foreground">ขั้นที่ 1 — ดาวน์โหลด template</h4>
            <p className="text-xs text-muted mb-3">
              ไฟล์ template มี 2 sheet: &quot;Template&quot; สำหรับกรอกข้อมูล และ &quot;รายการรหัสที่ใช้ได้&quot;
              สำหรับดูรหัสแผนก / ประเทศ / ประเภทการจ้าง
              <br />
              <span className="text-amber-600">หมายเหตุ:</span> ลบแถวตัวอย่างก่อนนำเข้าข้อมูลจริง
            </p>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              ดาวน์โหลด template (.xlsx)
            </button>
          </div>

          {/* Step 2: Upload file */}
          <div className="rounded-xl border border-border p-4">
            <h4 className="text-sm font-semibold mb-2 text-foreground">ขั้นที่ 2 — เลือกไฟล์ที่กรอกแล้ว</h4>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
                setError(null);
              }}
              className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium hover:file:bg-primary-100"
            />
            {file && (
              <p className="mt-2 text-xs text-muted">
                ไฟล์ที่เลือก: <span className="font-medium text-foreground">{file.name}</span> (
                {(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div
                className={`flex items-center gap-2 p-3 text-sm font-medium ${
                  result.summary.created > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {result.summary.created > 0 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                {result.message}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-surface sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-muted">แถว</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted">รหัสพนักงาน</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted">ข้อผิดพลาด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-muted">{e.row}</td>
                          <td className="px-3 py-2 font-mono">{e.code || "-"}</td>
                          <td className="px-3 py-2 text-red-600">
                            <ul className="list-disc list-inside space-y-0.5">
                              {e.errors.map((msg, j) => (
                                <li key={j}>{msg}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:bg-surface disabled:opacity-50"
          >
            ปิด
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            นำเข้าข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}

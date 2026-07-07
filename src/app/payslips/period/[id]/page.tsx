"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PayslipDocument, { type PayslipData } from "../../PayslipDocument";

export default function PayslipPeriodPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [slips, setSlips] = useState<PayslipData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: PayslipData[] }>(`/reports/payslips?period_id=${id}`)
      .then((r) => setSlips(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"));
  }, [id]);

  if (error) {
    return <div className="p-8 text-center text-rose-600">{error}</div>;
  }
  if (!slips) {
    return (
      <div className="p-8 flex justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (slips.length === 0) {
    return <div className="p-8 text-center text-slate-500">ไม่มีสลิปในงวดนี้</div>;
  }

  const periodName = slips[0]?.period.name || slips[0]?.period.code || "";

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
          <div className="text-sm text-slate-600">
            {periodName} · {slips.length} ใบ
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900"
          >
            <Printer className="h-4 w-4" /> พิมพ์ทั้งหมด / บันทึก PDF
          </button>
        </div>

        <div className="space-y-6 print:space-y-0">
          {slips.map((s) => (
            <div key={s.slip_id} className="break-inside-avoid print:break-after-page">
              <PayslipDocument data={s} />
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

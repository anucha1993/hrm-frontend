"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PayslipDocument, { type PayslipData } from "../PayslipDocument";

export default function PayslipPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PayslipData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: PayslipData }>(`/reports/payslip/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"));
  }, [id]);

  if (error) {
    return <div className="p-8 text-center text-rose-600">{error}</div>;
  }
  if (!data) {
    return <div className="p-8 text-center text-slate-500">กำลังโหลด...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex justify-end gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900"
          >
            <Printer className="h-4 w-4" /> พิมพ์ / บันทึก PDF
          </button>
        </div>

        <PayslipDocument data={data} />
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

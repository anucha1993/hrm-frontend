"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { apiFetch } from "@/lib/api";

type PayslipData = {
  slip_id: number;
  status: string;
  period: {
    id: number;
    code: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    pay_date: string | null;
  };
  employee: {
    id: number;
    employee_code: string;
    employee_name: string;
    department: string | null;
    employment_type: string | null;
    hire_date: string | null;
  };
  earnings: {
    base_salary: number;
    ot_pay: number;
    bonus_total: number;
    gross_pay: number;
  };
  deductions: {
    late_deduction: number;
    absent_deduction: number;
    other_deductions_total: number;
    tax: number;
    ssf_employee: number;
    deductions_total: number;
  };
  net_pay: number;
};

const fmtTHB = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(n);

const COMPANY = {
  name: "บริษัท ชาญเจริญคอนกรีต จำกัด",
  address: "ที่อยู่บริษัท",
};

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
    return (
      <div className="p-8 text-center text-rose-600">
        {error}
      </div>
    );
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
            <Printer className="h-4 w-4" /> พิมพ์
          </button>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-8 shadow-sm print:border-0 print:p-6 print:shadow-none">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 text-center">
            <div className="text-xl font-bold">{COMPANY.name}</div>
            <div className="mt-1 text-sm text-slate-600">{COMPANY.address}</div>
            <div className="mt-4 text-lg font-semibold">สลิปเงินเดือน / PAY SLIP</div>
          </div>

          {/* Employee & Period info */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">รหัสพนักงาน</div>
              <div className="font-medium">{data.employee.employee_code}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">งวดจ่าย</div>
              <div className="font-medium">{data.period.name || data.period.code}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">ชื่อ-นามสกุล</div>
              <div className="font-medium">{data.employee.employee_name}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">วันที่จ่าย</div>
              <div className="font-medium">{data.period.pay_date ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">แผนก</div>
              <div className="font-medium">{data.employee.department ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">ประเภทการจ้าง</div>
              <div className="font-medium">{data.employee.employment_type ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">วันเริ่มงาน</div>
              <div className="font-medium">{data.employee.hire_date ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">รอบ</div>
              <div className="font-medium">
                {data.period.start_date} ถึง {data.period.end_date}
              </div>
            </div>
          </div>

          {/* Earnings / Deductions */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <div className="border-b border-slate-300 pb-1 text-sm font-semibold text-emerald-700">
                รายได้
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-slate-600">เงินเดือนฐาน</td>
                    <td className="py-1 text-right tabular-nums">{fmtTHB(data.earnings.base_salary)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">ค่าล่วงเวลา (OT)</td>
                    <td className="py-1 text-right tabular-nums">{fmtTHB(data.earnings.ot_pay)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">เบี้ย/โบนัส</td>
                    <td className="py-1 text-right tabular-nums">{fmtTHB(data.earnings.bonus_total)}</td>
                  </tr>
                  <tr className="border-t border-slate-300 font-semibold">
                    <td className="py-1">รวมรายได้</td>
                    <td className="py-1 text-right tabular-nums text-emerald-700">
                      {fmtTHB(data.earnings.gross_pay)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div className="border-b border-slate-300 pb-1 text-sm font-semibold text-rose-700">
                รายการหัก
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-slate-600">หักสาย</td>
                    <td className="py-1 text-right tabular-nums">{fmtTHB(data.deductions.late_deduction)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">หักขาด</td>
                    <td className="py-1 text-right tabular-nums">{fmtTHB(data.deductions.absent_deduction)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">หักอื่น ๆ</td>
                    <td className="py-1 text-right tabular-nums">
                      {fmtTHB(data.deductions.other_deductions_total)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">ภาษีหัก ณ ที่จ่าย</td>
                    <td className="py-1 text-right tabular-nums">{fmtTHB(data.deductions.tax)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">ประกันสังคม</td>
                    <td className="py-1 text-right tabular-nums">{fmtTHB(data.deductions.ssf_employee)}</td>
                  </tr>
                  <tr className="border-t border-slate-300 font-semibold">
                    <td className="py-1">รวมรายการหัก</td>
                    <td className="py-1 text-right tabular-nums text-rose-700">
                      {fmtTHB(data.deductions.deductions_total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net pay */}
          <div className="mt-6 rounded-md border-2 border-slate-800 bg-slate-50 p-4 print:bg-white">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">เงินสุทธิที่ได้รับ</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-700">
                {fmtTHB(data.net_pay)}
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2">ผู้รับเงิน</div>
              <div className="mt-1 text-xs text-slate-500">
                ({data.employee.employee_name})
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2">ผู้จ่ายเงิน</div>
              <div className="mt-1 text-xs text-slate-500">(เจ้าหน้าที่ฝ่ายบุคคล)</div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            สลิปนี้ออกโดยระบบ CYC-HRM • เลขที่สลิป: {data.slip_id} • สถานะ: {data.status}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}

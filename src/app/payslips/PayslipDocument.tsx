"use client";

export type PayslipItem = {
  type: string;
  source?: string | null;
  code?: string | null;
  name: string;
  amount: number;
  quantity?: number | null;
  rate?: number | null;
};

export type PayslipData = {
  slip_id: number;
  slip_no?: string;
  status: string;
  company?: { name: string; address: string };
  period: {
    id: number | null;
    code: string | null;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    pay_date: string | null;
  };
  employee: {
    id: number | null;
    employee_code: string | null;
    employee_name: string;
    department: string | null;
    employment_type: string | null;
    hire_date: string | null;
    bank_name?: string | null;
    bank_account_no?: string | null;
  };
  meta?: {
    present_days: number;
    working_days: number;
    daily_rate: number;
    ot_hours_total: number;
  };
  earnings: {
    base_salary: number;
    base_pay: number;
    ot_pay: number;
    allowances_total?: number;
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
  items?: PayslipItem[];
  net_pay: number;
};

const DEFAULT_COMPANY = {
  name: "บริษัท ชาญเจริญคอนกรีต จำกัด",
  address: "",
};

const fmtNum = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtTHB = (n: number) => `฿${fmtNum(n)}`;

/** ISO (2026-06-01T00:00:00Z) → dd/mm/yyyy พ.ศ. */
const fmtDateTH = (s: string | null | undefined): string => {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return String(s);
  return `${m[3]}/${m[2]}/${Number(m[1]) + 543}`;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 leading-relaxed">
      <span className="w-24 shrink-0 text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value ?? "-"}</span>
    </div>
  );
}

function LineRow({ name, amount }: { name: string; amount: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-slate-600">{name}</span>
      <span className="tabular-nums text-slate-800">{fmtNum(amount)}</span>
    </div>
  );
}

/** เอกสารสลิปเงินเดือน 1 ใบ — ใช้ทั้งหน้าเดี่ยวและหน้าพิมพ์ทั้งงวด */
export default function PayslipDocument({ data }: { data: PayslipData }) {
  const items = data.items ?? [];
  const earnItems = items.filter((i) => i.type === "earning");
  const dedItems = items.filter((i) => i.type === "deduction" || i.type === "tax" || i.type === "ssf");

  const totalDeductions = data.earnings.gross_pay - data.net_pay;
  const isDaily = (data.meta?.daily_rate ?? 0) > 0;

  const companyName = data.company?.name || DEFAULT_COMPANY.name;
  const companyAddr = data.company?.address || DEFAULT_COMPANY.address;

  const earnRows: { name: string; amount: number }[] =
    earnItems.length > 0
      ? earnItems.map((i) => ({ name: i.name, amount: i.amount }))
      : [
          { name: isDaily ? "ค่าแรง" : "เงินเดือน", amount: data.earnings.base_pay },
          { name: "ค่าล่วงเวลา (OT)", amount: data.earnings.ot_pay },
          { name: "เบี้ย / โบนัส", amount: (data.earnings.allowances_total ?? 0) + data.earnings.bonus_total },
        ].filter((r) => r.amount !== 0);

  const dedRows: { name: string; amount: number }[] =
    dedItems.length > 0
      ? dedItems.map((i) => ({ name: i.name, amount: i.amount }))
      : [
          { name: "หักสาย", amount: data.deductions.late_deduction },
          { name: "หักขาด", amount: data.deductions.absent_deduction },
          { name: "หักอื่น ๆ", amount: data.deductions.other_deductions_total },
          { name: "ภาษีหัก ณ ที่จ่าย", amount: data.deductions.tax },
          { name: "ประกันสังคม", amount: data.deductions.ssf_employee },
        ].filter((r) => r.amount !== 0);

  const bank =
    data.employee.bank_account_no
      ? `${data.employee.bank_name ? data.employee.bank_name + " " : ""}${data.employee.bank_account_no}`
      : "-";

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-8 text-[13px] text-slate-800 shadow-sm print:rounded-none print:border print:p-6 print:shadow-none">
      {/* Header: company (left) + title (right) */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight text-slate-900">{companyName}</div>
          {companyAddr && (
            <div className="mt-1 max-w-sm text-xs leading-snug text-slate-500">{companyAddr}</div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-slate-900">สลิปเงินเดือน</div>
          <div className="text-xs font-medium tracking-widest text-slate-400">PAY SLIP</div>
          <div className="mt-1 text-[11px] text-slate-400">เลขที่ {data.slip_no ?? data.slip_id}</div>
        </div>
      </div>

      {/* Info: employee (left) + pay (right) */}
      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
        <div className="space-y-1">
          <Field label="ชื่อ-นามสกุล" value={data.employee.employee_name} />
          <Field label="รหัสพนักงาน" value={data.employee.employee_code} />
          <Field label="แผนก" value={data.employee.department} />
          <Field label="ประเภทการจ้าง" value={data.employee.employment_type} />
        </div>
        <div className="space-y-1">
          <Field label="งวดจ่าย" value={data.period.name || data.period.code} />
          <Field
            label="รอบการจ่าย"
            value={`${fmtDateTH(data.period.start_date)} - ${fmtDateTH(data.period.end_date)}`}
          />
          <Field label="วันที่จ่าย" value={fmtDateTH(data.period.pay_date)} />
          {isDaily && data.meta ? (
            <Field label="วันทำงาน" value={`${data.meta.present_days} วัน · ${fmtTHB(data.meta.daily_rate)}/วัน`} />
          ) : (
            <Field label="บัญชีธนาคาร" value={bank} />
          )}
        </div>
      </div>

      {/* Earnings / Deductions table */}
      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-md border border-slate-300">
        <div className="border-b border-r border-slate-300 bg-slate-100 px-4 py-2 font-semibold text-slate-700">
          รายการเงินได้ <span className="text-xs font-normal text-slate-400">Earnings</span>
        </div>
        <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 font-semibold text-slate-700">
          รายการหัก <span className="text-xs font-normal text-slate-400">Deductions</span>
        </div>

        <div className="space-y-0.5 border-r border-slate-300 px-4 py-3">
          {earnRows.length ? (
            earnRows.map((r, i) => <LineRow key={i} name={r.name} amount={r.amount} />)
          ) : (
            <div className="py-0.5 text-slate-400">-</div>
          )}
        </div>
        <div className="space-y-0.5 px-4 py-3">
          {dedRows.length ? (
            dedRows.map((r, i) => <LineRow key={i} name={r.name} amount={r.amount} />)
          ) : (
            <div className="py-0.5 text-slate-400">ไม่มีรายการหัก</div>
          )}
        </div>

        <div className="flex items-center justify-between border-r border-t border-slate-300 bg-slate-50 px-4 py-2 font-semibold">
          <span>รวมรายได้</span>
          <span className="tabular-nums text-emerald-700">{fmtNum(data.earnings.gross_pay)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-300 bg-slate-50 px-4 py-2 font-semibold">
          <span>รวมรายการหัก</span>
          <span className="tabular-nums text-rose-700">{fmtNum(totalDeductions)}</span>
        </div>
      </div>

      {/* Net pay */}
      <div className="mt-5 flex items-center justify-between rounded-md border-2 border-slate-800 bg-slate-50 px-5 py-3 print:bg-white">
        <div>
          <div className="text-base font-bold text-slate-900">เงินสุทธิที่ได้รับ</div>
          <div className="text-xs tracking-wide text-slate-500">NET PAY</div>
        </div>
        <div className="text-2xl font-bold tabular-nums text-emerald-700">{fmtTHB(data.net_pay)}</div>
      </div>

      {/* Signatures */}
      <div className="mt-12 grid grid-cols-2 gap-12">
        <div className="text-center">
          <div className="mx-auto w-40 border-t border-slate-400 pt-2 text-sm">ผู้รับเงิน</div>
          <div className="mt-1 text-xs text-slate-500">({data.employee.employee_name})</div>
        </div>
        <div className="text-center">
          <div className="mx-auto w-40 border-t border-slate-400 pt-2 text-sm">ผู้จ่ายเงิน</div>
          <div className="mt-1 text-xs text-slate-500">(เจ้าหน้าที่ฝ่ายบุคคล)</div>
        </div>
      </div>

      {/* Confidential note */}
      <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] leading-relaxed text-slate-400">
        ข้อมูลเงินเดือนและค่าจ้างถือเป็นความลับ ห้ามเปิดเผยต่อบุคคลอื่น · เอกสารนี้ออกโดยระบบ CYC-HRM
        <br />
        เลขที่สลิป {data.slip_no ?? data.slip_id} · สถานะ {data.status}
      </div>
    </div>
  );
}

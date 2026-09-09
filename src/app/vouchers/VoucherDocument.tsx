"use client";

export type VoucherData = {
  company?: { name: string; address: string };
  request_no: string;
  amount: number;
  reason: string | null;
  voucher_code: string;
  ref_num: string | null;
  category: string | null;
  start_at: string | null;
  expire_at: string | null;
  issued_at: string | null;
  paid_by: string | null;
  employee: {
    employee_code: string | null;
    full_name: string;
    department: string | null;
  };
};

const DEFAULT_COMPANY = {
  name: "บริษัท ชาญเจริญคอนกรีต จำกัด",
  address: "",
};

const fmtNum = (n: number) =>
  new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** "2026-09-07 00:00:00" หรือ ISO → dd/mm/yyyy พ.ศ. HH:mm */
const fmtDateTimeTH = (s: string | null | undefined): string => {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s);
  if (!m) return String(s);
  return `${m[3]}/${m[2]}/${Number(m[1]) + 543} ${m[4]}:${m[5]} น.`;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 leading-relaxed">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value ?? "-"}</span>
    </div>
  );
}

/** ใบพิมพ์ Tiger Voucher — สำหรับแนบคู่กับการเบิกเงินล่วงหน้าที่จ่ายผ่านเครื่อง Tiger (แนวนอน) */
export default function VoucherDocument({ data }: { data: VoucherData }) {
  const companyName = data.company?.name || DEFAULT_COMPANY.name;
  const companyAddr = data.company?.address || DEFAULT_COMPANY.address;

  return (
    <div className="mx-auto w-full rounded-lg border-2 border-dashed border-orange-300 bg-white p-8 text-sm text-slate-700 print:border-solid">
      <div className="mb-5 text-center">
        <div className="text-lg font-bold text-slate-900">{companyName}</div>
        {companyAddr && <div className="text-xs text-slate-500">{companyAddr}</div>}
        <div className="mt-2 text-base font-bold tracking-wide text-orange-600">
          ใบเบิกเงินล่วงหน้าผ่านเครื่อง TIGER (VOUCHER)
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,260px)_1fr] gap-8">
        <div className="flex flex-col items-center justify-center rounded-lg bg-orange-50 px-4 py-6 text-center">
          <div className="text-xs text-orange-700">รหัส Voucher</div>
          <div className="font-mono text-3xl font-bold tracking-widest text-orange-700">{data.voucher_code}</div>
          <div className="mt-3 text-xs text-orange-700">จำนวนเงิน</div>
          <div className="text-2xl font-bold text-orange-700">{fmtNum(data.amount)} บาท</div>
        </div>

        <div className="flex flex-col gap-2">
          <Field label="เลขที่คำขอ" value={data.request_no} />
          <Field label="ประเภท" value={data.category ?? "Advance"} />
          <Field label="พนักงาน" value={`${data.employee.full_name} (${data.employee.employee_code ?? "-"})`} />
          <Field label="แผนก" value={data.employee.department ?? "-"} />
          <Field label="เหตุผล" value={data.reason ?? "-"} />
          <Field label="ผู้บันทึกจ่ายเงิน" value={data.paid_by ?? "-"} />
          <Field label="วันที่ออก Voucher" value={fmtDateTimeTH(data.issued_at)} />
          <Field label="เริ่มใช้งานได้" value={fmtDateTimeTH(data.start_at)} />
          <Field label="หมดอายุ" value={<span className="font-semibold text-rose-600">{fmtDateTimeTH(data.expire_at)}</span>} />
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-rose-600">
        * กรุณาใช้ Voucher นี้ที่เครื่อง Tiger ก่อนวันหมดอายุด้านบน — Voucher ที่หมดอายุแล้วจะไม่สามารถกดรับเงินได้
      </p>
    </div>
  );
}

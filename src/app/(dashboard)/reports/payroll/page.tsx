import ComingSoon from "@/components/ComingSoon";

export default function ReportPayrollPage() {
  return (
    <ComingSoon
      title="รายงานเงินเดือน"
      description="ขณะนี้ดาวน์โหลด Excel รายงวดได้จากเมนู ‘คำนวณเงินเดือน → งวดจ่ายเงิน’ แล้ว"
      todo={[
        "API /reports/payroll/monthly-trend",
        "API /reports/payroll/by-department",
        "กราฟแนวโน้มค่าใช้จ่ายรายเดือน",
      ]}
    />
  );
}

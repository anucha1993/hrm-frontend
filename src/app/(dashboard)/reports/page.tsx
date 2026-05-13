import ComingSoon from "@/components/ComingSoon";

export default function ReportsIndexPage() {
  return (
    <ComingSoon
      title="รายงาน"
      description="หน้ารวมรายงาน — รายงานย่อยทั้งหมดยังไม่ได้พัฒนา"
      todo={[
        "รายงานพนักงาน (สรุปจำนวนตามแผนก / สถานะ / อายุงาน)",
        "รายงานเวลางาน (รายสัปดาห์, top มาสาย, ขาดงาน)",
        "รายงานเงินเดือน (รายเดือน, ค่าใช้จ่ายแยกตามแผนก)",
        "รายงานงาน (อัตราเสร็จงาน, งานเกินกำหนด)",
      ]}
    />
  );
}
